// Prototype jetable : se promener dans la fête à la 3e personne, au joystick, en entrant
// par une grande porte comme dans un parc d'attractions. Trois réglages de caméra à comparer.

import * as THREE from 'three';
import { construireEntree } from './entree.ts';
import { construireFete } from '../../src/scene/fete.ts';

const toile = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas: toile, antialias: true });
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.background = (() => {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    const d = g.createLinearGradient(0, 0, 0, 256);
    d.addColorStop(0, '#3fa0ff');
    d.addColorStop(0.62, '#cfeeff');
    d.addColorStop(1, '#cfeeff');
    g.fillStyle = d;
    g.fillRect(0, 0, 2, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
scene.fog = new THREE.Fog(0xcfeeff, 30, 90);
scene.add(new THREE.HemisphereLight(0xdff1ff, 0xffe2b8, 1.7));
const soleil = new THREE.DirectionalLight(0xfff2d8, 2);
soleil.position.set(6, 12, 9);
scene.add(soleil);

const fete = construireFete(0);
scene.add(fete.racine);
const entree = construireEntree();
scene.add(entree.racine);

// --- Les obstacles : les stands, les tours de l'entrée, les barrières ------------------------
const boites: THREE.Box3[] = [];
fete.racine.updateMatrixWorld(true);
for (const s of fete.stands) boites.push(new THREE.Box3().setFromObject(s.zone).expandByScalar(0.25));
boites.push(...entree.obstacles);
const RAYON = 0.45;
function libre(x: number, z: number): boolean {
  const p = new THREE.Vector3(x, 1, z);
  return !boites.some((b) => b.distanceToPoint(p) < RAYON);
}

// --- Le personnage ----------------------------------------------------------------------------
const heros = fete.heros();
heros.position.set(0, 0.06, 30);
heros.rotation.y = Math.PI;
const VITESSE = 5;

// --- La caméra : derrière le personnage, elle revient doucement dans son dos --------------------
interface Reglage {
  distance: number;
  tangage: number;
  hauteur: number;
  champ: number;
}
const VUES: Record<string, Reglage> = {
  epaule: { distance: 5.2, tangage: 0.2, hauteur: 1.9, champ: 58 },
  classique: { distance: 8.5, tangage: 0.38, hauteur: 1.6, champ: 50 },
  haute: { distance: 12.5, tangage: 0.66, hauteur: 1.2, champ: 46 },
};
let vue: Reglage = VUES.epaule as Reglage;
const camera = new THREE.PerspectiveCamera(vue.champ, 1, 0.1, 300);
let lacet = 0; // la caméra regarde vers -z au départ (vers l'entrée)
let tangage = vue.tangage;
let tirage = 0; // l'enfant fait tourner la caméra avec le doigt

function choisirVue(nom: string): void {
  vue = VUES[nom] ?? vue;
  tangage = vue.tangage;
  camera.fov = vue.champ;
  camera.updateProjectionMatrix();
  document.querySelectorAll<HTMLButtonElement>('.vues button').forEach((b) => b.classList.toggle('choisie', b.dataset.vue === nom));
}
document.querySelectorAll<HTMLButtonElement>('.vues button').forEach((b) => b.addEventListener('click', () => choisirVue(b.dataset.vue ?? 'epaule')));
choisirVue('epaule');

function redimensionner(): void {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionner);
redimensionner();

// --- Le joystick (comme dans Golémanciens : il apparaît sous le pouce) -------------------------
const zone = document.getElementById('joystick-zone') as HTMLDivElement;
const base = document.getElementById('joystick') as HTMLDivElement;
const bouton = base.firstElementChild as HTMLDivElement;
const RAYON_STICK = 64;
const stick = { x: 0, y: 0 };
let doigtStick: number | null = null;
let origine = { x: 0, y: 0 };
zone.addEventListener('pointerdown', (e) => {
  if (doigtStick !== null) return;
  doigtStick = e.pointerId;
  origine = { x: e.clientX, y: e.clientY };
  const r = zone.getBoundingClientRect();
  base.classList.add('actif');
  base.style.left = `${e.clientX - r.left}px`;
  base.style.top = `${e.clientY - r.top}px`;
});
const regard = document.getElementById('regard') as HTMLDivElement;
let doigtRegard: number | null = null;
let dernier = { x: 0, y: 0 };
regard.addEventListener('pointerdown', (e) => {
  doigtRegard = e.pointerId;
  dernier = { x: e.clientX, y: e.clientY };
});
addEventListener('pointermove', (e) => {
  if (e.pointerId === doigtStick) {
    let dx = e.clientX - origine.x;
    let dy = e.clientY - origine.y;
    const l = Math.hypot(dx, dy);
    if (l > RAYON_STICK) {
      dx = (dx / l) * RAYON_STICK;
      dy = (dy / l) * RAYON_STICK;
    }
    bouton.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const m = Math.min(1, l / RAYON_STICK);
    const k = m < 0.12 ? 0 : (m - 0.12) / 0.88 / Math.max(m, 1e-6);
    stick.x = (dx / RAYON_STICK) * k;
    stick.y = (-dy / RAYON_STICK) * k;
  } else if (e.pointerId === doigtRegard) {
    lacet -= (e.clientX - dernier.x) * 0.006;
    tangage = Math.min(1.1, Math.max(0.05, tangage + (e.clientY - dernier.y) * 0.004));
    tirage = 1.5;
    dernier = { x: e.clientX, y: e.clientY };
  }
});
const lacher = (e: PointerEvent): void => {
  if (e.pointerId === doigtStick) {
    doigtStick = null;
    stick.x = 0;
    stick.y = 0;
    base.classList.remove('actif');
    base.style.left = '';
    base.style.top = '';
    bouton.style.transform = '';
  }
  if (e.pointerId === doigtRegard) doigtRegard = null;
};
addEventListener('pointerup', lacher);
addEventListener('pointercancel', lacher);

// Clavier (essais sur ordinateur).
const touches = new Set<string>();
addEventListener('keydown', (e) => touches.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => touches.delete(e.key.toLowerCase()));

// --- L'arrivée : on passe la grande porte ------------------------------------------------------
const bulle = document.getElementById('bulle') as HTMLParagraphElement;
let entre = false;

// --- La boucle ----------------------------------------------------------------------------------
const cible = new THREE.Vector3();
const direction = new THREE.Vector3();
const rayon = new THREE.Raycaster();
const impact = new THREE.Vector3();
let distance = vue.distance;
let horloge = 0;
let avant = performance.now();
renderer.setAnimationLoop((maintenant) => {
  const dt = Math.min(0.05, (maintenant - avant) / 1000);
  avant = maintenant;
  etape(dt);
});

function etape(dt: number): void {
  horloge += dt;

  let sx = stick.x;
  let sy = stick.y;
  if (touches.has('arrowleft') || touches.has('q') || touches.has('a')) sx -= 1;
  if (touches.has('arrowright') || touches.has('d')) sx += 1;
  if (touches.has('arrowup') || touches.has('z') || touches.has('w')) sy += 1;
  if (touches.has('arrowdown') || touches.has('s')) sy -= 1;
  const force = Math.min(1, Math.hypot(sx, sy));

  if (force > 0.02) {
    // Avant = là où regarde la caméra, à plat.
    const av = { x: -Math.sin(lacet), z: -Math.cos(lacet) };
    const dr = { x: -av.z, z: av.x };
    const mx = (dr.x * sx + av.x * sy) / Math.max(1, Math.hypot(sx, sy));
    const mz = (dr.z * sx + av.z * sy) / Math.max(1, Math.hypot(sx, sy));
    const pas = VITESSE * force * dt;
    const nx = heros.position.x + mx * pas;
    const nz = heros.position.z + mz * pas;
    if (libre(nx, nz)) heros.position.set(nx, 0.06, nz);
    else if (libre(nx, heros.position.z)) heros.position.x = nx;
    else if (libre(heros.position.x, nz)) heros.position.z = nz;
    // Le personnage se tourne en douceur vers où il va.
    const voulu = Math.atan2(mx, mz);
    let ecart = voulu - heros.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    heros.rotation.y += ecart * Math.min(1, dt * 10);
    // Comme dans les jeux d'aventure : la caméra revient d'elle-même dans le dos.
    if (tirage <= 0 && sy > -0.3) {
      const dos = heros.rotation.y + Math.PI;
      let e2 = dos - lacet;
      e2 = Math.atan2(Math.sin(e2), Math.cos(e2));
      lacet += e2 * Math.min(1, dt * 1.6 * force);
    }
  }
  tirage -= dt;
  fete.marcheLibre(force);

  if (!entre && heros.position.z < 11.5) {
    entre = true;
    bulle.textContent = 'Bienvenue à la fête foraine !';
    bulle.hidden = false;
    setTimeout(() => (bulle.hidden = true), 3500);
  }

  cible.set(heros.position.x, heros.position.y + vue.hauteur, heros.position.z);
  const cp = Math.cos(tangage);
  direction.set(Math.sin(lacet) * cp, Math.sin(tangage), Math.cos(lacet) * cp);
  // Si un stand ou l'entrée se met entre la caméra et le personnage, la caméra se rapproche.
  rayon.set(cible, direction);
  // Seuls les stands et l'entrée arrêtent la caméra (pas les visiteurs qui passent).
  let proche = vue.distance;
  for (const b of boites) {
    const point = rayon.ray.intersectBox(b, impact);
    if (point && !b.containsPoint(cible)) proche = Math.min(proche, point.distanceTo(cible));
  }
  const voulue = Math.max(1.5, proche - 0.4);
  distance = voulue < distance ? voulue : distance + (voulue - distance) * Math.min(1, dt * 3);
  camera.position.copy(cible).addScaledVector(direction, distance);
  camera.lookAt(cible.x, cible.y + 0.2, cible.z);

  fete.mettreAJour(horloge, dt);
  entree.mettreAJour(horloge);
  renderer.render(scene, camera);
  document.body.dataset.appels = String(renderer.info.render.calls);
}

// « ?vue=haute&x=0.5&z=3&cap=3.14 » : départ à cet endroit (pour les captures).
{
  const p = new URLSearchParams(location.search);
  if (p.has('vue')) choisirVue(p.get('vue') ?? 'epaule');
  distance = vue.distance;
  if (p.has('z')) {
    const cap = Number(p.get('cap') ?? Math.PI);
    heros.position.set(Number(p.get('x') ?? 0), 0.06, Number(p.get('z')));
    heros.rotation.y = cap;
    lacet = Number(p.get('lacet') ?? cap + Math.PI);
    entre = heros.position.z < 11.5;
  }
}

// Pour les captures : placer le personnage et la caméra.
Object.assign(window, {
  proto: {
    placer(x: number, z: number, cap: number, l = cap + Math.PI): void {
      heros.position.set(x, 0.06, z);
      heros.rotation.y = cap;
      lacet = l;
      tirage = 3;
    },
    vue: choisirVue,
    /** Fait avancer la scène d'un coup (quand le navigateur ralentit l'affichage). */
    avancer(secondes = 1): void {
      for (let t = 0; t < secondes; t += 1 / 30) etape(1 / 30);
    },
  },
});
