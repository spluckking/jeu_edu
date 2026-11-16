// Prototype jetable : style « douillet » (pastel, personnages ronds), caméra haute et fixe pour
// la promenade, zoom sur le stand quand on s'en approche, garde-robe et HUD à icônes rondes.

import * as THREE from 'three';
import { construireDecor, STANDS, type LieuStand } from './decor.ts';
import { CHAPEAUX, CHAUSSURES, creerHeros, HAUTS, LUNETTES, OBJETS, type Choix } from './heros.ts';

const toile = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas: toile, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;

function ciel(haut: string, bas: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  if (g) {
    const d = g.createLinearGradient(0, 0, 0, 256);
    d.addColorStop(0, haut);
    d.addColorStop(1, bas);
    g.fillStyle = d;
    g.fillRect(0, 0, 2, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- La fête ---------------------------------------------------------------------------------
const fete = new THREE.Scene();
fete.background = ciel('#6cc3ff', '#d9f1ff');
fete.fog = new THREE.Fog(0xd9f1ff, 35, 80);
fete.add(new THREE.HemisphereLight(0xeaf6ff, 0xd8f0c0, 2.2));
const soleil = new THREE.DirectionalLight(0xfff4e0, 1.6);
soleil.position.set(-5, 12, 8);
fete.add(soleil);
const decor = construireDecor();
fete.add(decor.racine);

const params = new URLSearchParams(location.search);
let choix: Choix = { chapeau: 'paille', lunettes: 'rondes', haut: 'corail', chaussures: 'brunes', objet: 'epuisette', cheveux: 0xe08a3c, peau: 0xfadcc6 };
const heros = creerHeros(choix);
heros.racine.position.set(Number(params.get('x') ?? 0), 0, Number(params.get('z') ?? 8));
heros.racine.rotation.y = Math.PI;
fete.add(heros.racine);

// --- Caméra de promenade : haute, toujours dans le même axe, elle suit sans tourner ----------
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
const PROMENADE = { distance: 18, tangage: 0.56, lacet: 0 };
const pos = new THREE.Vector3();
const vise = new THREE.Vector3();
const posVoulue = new THREE.Vector3();
const viseVoulue = new THREE.Vector3();
let zoom = 0;

function standProche(): LieuStand | null {
  for (const s of STANDS) {
    const fx = s.x + Math.sin(s.ry) * (s.rayon + 1.2);
    const fz = s.z + Math.cos(s.ry) * (s.rayon + 1.2);
    if (Math.hypot(heros.racine.position.x - fx, heros.racine.position.z - fz) < 2.4) return s;
  }
  return null;
}

function cadrer(dt: number, immediat = false): void {
  const p = heros.racine.position;
  const s = standProche();
  zoom += ((s ? 1 : 0) - zoom) * Math.min(1, dt * 2.5);
  // Promenade : au-dessus et derrière, cap fixe.
  const cp = Math.cos(PROMENADE.tangage);
  posVoulue.set(p.x, p.y + 0.8 + Math.sin(PROMENADE.tangage) * PROMENADE.distance, p.z + cp * PROMENADE.distance);
  viseVoulue.set(p.x, 0.8, p.z - 1.2);
  if (s) {
    // Devant le stand : on descend et on se rapproche, face au comptoir.
    const sx = Math.sin(s.ry);
    const sz = Math.cos(s.ry);
    // De trois quarts et un peu en hauteur : le personnage se tient sur le côté, le forain et
    // son comptoir restent dégagés.
    const d = s.rayon + 7.5;
    const cote = 3.2;
    const zoomPos = new THREE.Vector3(s.x + sx * d + sz * cote, 5.4, s.z + sz * d - sx * cote);
    const zoomVise = new THREE.Vector3(s.x + sx * 0.8, 1.2, s.z + sz * 0.8);
    posVoulue.lerp(zoomPos, zoom);
    viseVoulue.lerp(zoomVise, zoom);
  }
  const k = immediat ? 1 : Math.min(1, dt * 4);
  pos.lerp(posVoulue, k);
  vise.lerp(viseVoulue, k);
  camera.position.copy(pos);
  camera.lookAt(vise);
  boutonEntrer.hidden = !s;
  if (s) nomStand.textContent = s.nom;
}

// --- Commandes : joystick à gauche, flèches ou ZQSD au clavier ----------------------------------
const joystick = { x: 0, y: 0, doigt: -1, cx: 0, cy: 0 };
const zone = document.getElementById('zone-joystick') as HTMLElement;
const manette = document.getElementById('joystick') as HTMLElement;
const bouton = manette.querySelector('.bouton-joystick') as HTMLElement;
zone.addEventListener('pointerdown', (e) => {
  joystick.doigt = e.pointerId;
  joystick.cx = e.clientX;
  joystick.cy = e.clientY;
  zone.setPointerCapture(e.pointerId);
  manette.style.left = `${e.clientX}px`;
  manette.style.top = `${e.clientY}px`;
  manette.classList.add('actif');
});
zone.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joystick.doigt) return;
  const dx = e.clientX - joystick.cx;
  const dy = e.clientY - joystick.cy;
  const l = Math.min(1, Math.hypot(dx, dy) / 60);
  const a = Math.atan2(dy, dx);
  joystick.x = Math.cos(a) * l;
  joystick.y = Math.sin(a) * l;
  bouton.style.transform = `translate(${joystick.x * 42}px, ${joystick.y * 42}px)`;
});
const lacher = (e: PointerEvent): void => {
  if (e.pointerId !== joystick.doigt) return;
  joystick.doigt = -1;
  joystick.x = joystick.y = 0;
  bouton.style.transform = '';
  manette.classList.remove('actif');
};
zone.addEventListener('pointerup', lacher);
zone.addEventListener('pointercancel', lacher);
const touches = new Set<string>();
addEventListener('keydown', (e) => touches.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => touches.delete(e.key.toLowerCase()));

function bouger(dt: number): number {
  let dx = joystick.x;
  let dz = joystick.y;
  if (touches.has('arrowleft') || touches.has('q')) dx -= 1;
  if (touches.has('arrowright') || touches.has('d')) dx += 1;
  if (touches.has('arrowup') || touches.has('z')) dz -= 1;
  if (touches.has('arrowdown') || touches.has('s')) dz += 1;
  const l = Math.min(1, Math.hypot(dx, dz));
  if (l < 0.05) return 0;
  const p = heros.racine.position;
  const vitesse = 4.2 * l;
  const nx = p.x + (dx / Math.hypot(dx, dz)) * vitesse * dt;
  const nz = p.z + (dz / Math.hypot(dx, dz)) * vitesse * dt;
  let x = Math.max(-11, Math.min(11, nx));
  let z = Math.max(-13, Math.min(10.4, nz));
  for (const s of STANDS) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.rayon) {
      x = s.x + ((x - s.x) / d) * s.rayon;
      z = s.z + ((z - s.z) / d) * s.rayon;
    }
  }
  p.set(x, 0, z);
  const cap = Math.atan2(dx, dz);
  let ecart = cap - heros.racine.rotation.y;
  ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
  heros.racine.rotation.y += ecart * Math.min(1, dt * 12);
  return l;
}

// --- HUD : mini-carte ronde -------------------------------------------------------------------
const carte = document.getElementById('carte') as HTMLCanvasElement;
const ctx = carte.getContext('2d');
function dessinerCarte(): void {
  if (!ctx) return;
  const w = carte.width;
  const ech = w / 30;
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = '#bfe6a8';
  ctx.fillRect(0, 0, w, w);
  ctx.save();
  ctx.translate(w / 2, w / 2);
  const p = heros.racine.position;
  ctx.translate(-p.x * ech, -p.z * ech);
  ctx.fillStyle = '#f3e2c4';
  ctx.fillRect(-1.7 * ech, -13 * ech, 3.4 * ech, 26 * ech);
  ctx.fillStyle = '#ffd3df';
  ctx.fillRect(-11 * ech, -16.5 * ech, 22 * ech, 1.2 * ech);
  for (const s of STANDS) {
    ctx.fillStyle = s.rayon > 3 ? '#bfe0f5' : '#fff6ee';
    ctx.beginPath();
    ctx.arc(s.x * ech, s.z * ech, s.rayon * ech * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2a0b8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#ff7a59';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, w / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

const boutonEntrer = document.getElementById('entrer') as HTMLButtonElement;
const nomStand = document.getElementById('nom-stand') as HTMLElement;

// --- Garde-robe ---------------------------------------------------------------------------------
const salle = new THREE.Scene();
// Une chambre douce et floue en fond : dégradé chaud, lueurs rondes, plancher.
salle.background = (() => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 340;
  const g = c.getContext('2d');
  if (g) {
    const d = g.createLinearGradient(0, 0, 0, 340);
    d.addColorStop(0, '#f6d2b4');
    d.addColorStop(0.7, '#f1c19c');
    d.addColorStop(0.7, '#e3a77e');
    d.addColorStop(1, '#d99a70');
    g.fillStyle = d;
    g.fillRect(0, 0, 512, 340);
    g.filter = 'blur(10px)';
    for (const [x, y, r, coul] of [[90, 70, 34, '#fff3e6'], [380, 60, 60, '#b9d8c8'], [250, 120, 40, '#ffe1ea'], [460, 200, 30, '#fff3e6'], [40, 230, 50, '#f8d9c0']] as const) {
      g.fillStyle = coul;
      g.globalAlpha = 0.7;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
salle.add(new THREE.HemisphereLight(0xfff3e6, 0xd9b48f, 2.4));
const lampe = new THREE.DirectionalLight(0xffffff, 1.3);
lampe.position.set(3, 5, 6);
salle.add(lampe);
const tapis = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 48), new THREE.MeshToonMaterial({ color: 0xf2b8c6 }));
tapis.position.y = -0.03;
salle.add(tapis);
const bordTapis = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 48), new THREE.MeshToonMaterial({ color: 0xfff1f4 }));
bordTapis.rotation.x = Math.PI / 2;
salle.add(bordTapis);
const mannequin = creerHeros(choix);
salle.add(mannequin.racine);
const cameraSalle = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

type Onglet = 'chapeau' | 'lunettes' | 'haut' | 'chaussures' | 'objet';
const ONGLETS: Array<{ id: Onglet; nom: string; liste: Array<{ id: string; nom: string }>; icone: string }> = [
  { id: 'chapeau', nom: 'Chapeaux', liste: CHAPEAUX, icone: '<path d="M3 16h18M7 16c0-5 2-9 5-9s5 4 5 9" />' },
  { id: 'lunettes', nom: 'Lunettes', liste: LUNETTES, icone: '<circle cx="7" cy="13" r="3.5" /><circle cx="17" cy="13" r="3.5" /><path d="M10.5 13h3" />' },
  { id: 'haut', nom: 'Hauts', liste: HAUTS, icone: '<path d="M8 4l-5 4 3 4 2-1v9h8v-9l2 1 3-4-5-4c-1 2-2.5 3-4 3S9 6 8 4z" />' },
  { id: 'chaussures', nom: 'Chaussures', liste: CHAUSSURES, icone: '<path d="M4 9v8h16v-2c0-2-3-3-6-3l-3-3H4z" />' },
  { id: 'objet', nom: 'Objets', liste: OBJETS, icone: '<circle cx="12" cy="8" r="4.5" /><path d="M12 12.5V21" />' },
];
let onglet: Onglet = 'chapeau';
let brouillon: Choix = { ...choix };

// Vignettes : chaque objet photographié seul, une fois.
const studio = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
studio.setSize(160, 160);
studio.toneMapping = THREE.NeutralToneMapping;
const sceneStudio = new THREE.Scene();
sceneStudio.add(new THREE.HemisphereLight(0xffffff, 0xe6d2bd, 2.6));
const camStudio = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
const vignettes = new Map<string, string>();
function vignette(o: Onglet, id: string): string {
  const cle = `${o}:${id}`;
  const deja = vignettes.get(cle);
  if (deja) return deja;
  let objet: THREE.Object3D;
  if (o === 'haut' || o === 'chaussures') {
    const h = creerHeros({ ...choix, chapeau: 'rien', lunettes: 'rien', objet: 'rien', [o]: id });
    objet = h.racine;
  } else {
    const liste = o === 'chapeau' ? CHAPEAUX : o === 'lunettes' ? LUNETTES : OBJETS;
    objet = liste.find((a) => a.id === id)?.construire() ?? new THREE.Group();
    objet.position.set(0, 0, 0);
  }
  sceneStudio.add(objet);
  const boite = new THREE.Box3().setFromObject(objet);
  let centre = boite.getCenter(new THREE.Vector3());
  let taille = boite.getSize(new THREE.Vector3()).length() || 1;
  if (o === 'haut') {
    centre = new THREE.Vector3(0, 0.62, 0);
    taille = 0.9;
  } else if (o === 'chaussures') {
    centre = new THREE.Vector3(0, 0.12, 0);
    taille = 0.75;
  }
  camStudio.position.copy(centre).add(new THREE.Vector3(0.35, 0.3, 1).normalize().multiplyScalar(taille * 1.9));
  camStudio.lookAt(centre);
  studio.render(sceneStudio, camStudio);
  sceneStudio.remove(objet);
  const url = id === 'rien' ? '' : studio.domElement.toDataURL();
  vignettes.set(cle, url);
  return url;
}

const garderobe = document.getElementById('garderobe') as HTMLElement;
const grille = document.getElementById('grille') as HTMLElement;
const onglets = document.getElementById('onglets') as HTMLElement;
function remplirGarderobe(): void {
  onglets.replaceChildren(
    ...ONGLETS.map((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `onglet${o.id === onglet ? ' choisi' : ''}`;
      b.setAttribute('aria-label', o.nom);
      b.innerHTML = `<svg viewBox="0 0 24 24">${o.icone}</svg>`;
      b.addEventListener('click', () => {
        onglet = o.id;
        remplirGarderobe();
      });
      return b;
    }),
  );
  const o = ONGLETS.find((x) => x.id === onglet)!;
  (document.getElementById('ruban') as HTMLElement).textContent = o.nom;
  grille.replaceChildren(
    ...o.liste.map((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `case${brouillon[onglet] === a.id ? ' choisie' : ''}`;
      const url = vignette(onglet, a.id);
      b.innerHTML = url ? `<img alt="" src="${url}">` : '<span class="rien">Rien</span>';
      b.title = a.nom;
      b.addEventListener('click', () => {
        brouillon = { ...brouillon, [onglet]: a.id };
        mannequin.habiller(brouillon);
        remplirGarderobe();
      });
      return b;
    }),
  );
}
let enGarderobe = params.has('garderobe');
function ouvrirGarderobe(oui: boolean): void {
  enGarderobe = oui;
  garderobe.hidden = !oui;
  document.body.classList.toggle('en-garderobe', oui);
  if (oui) {
    brouillon = { ...choix };
    mannequin.habiller(brouillon);
    remplirGarderobe();
  }
}
document.getElementById('ouvrir-garderobe')?.addEventListener('click', () => ouvrirGarderobe(true));
document.getElementById('fermer')?.addEventListener('click', () => ouvrirGarderobe(false));
document.getElementById('enregistrer')?.addEventListener('click', () => {
  choix = { ...brouillon };
  heros.habiller(choix);
  ouvrirGarderobe(false);
});
let tourner = 0;
document.getElementById('tourner-g')?.addEventListener('click', () => (tourner -= 0.8));
document.getElementById('tourner-d')?.addEventListener('click', () => (tourner += 0.8));
if (params.has('onglet')) onglet = params.get('onglet') as Onglet;
ouvrirGarderobe(enGarderobe);

// --- Boucle ---------------------------------------------------------------------------------------
function taille(): void {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  cameraSalle.aspect = w / h;
  // Le personnage se tient dans le tiers gauche, la grille d'objets prend la droite.
  cameraSalle.setViewOffset(w, h, w * 0.2, 0, w, h);
  cameraSalle.updateProjectionMatrix();
}
addEventListener('resize', taille);
taille();
cadrer(0, true);

const horloge = new THREE.Clock();
let t = 0;
function image(dt: number): void {
  t += dt;
  decor.animer(t);
  if (enGarderobe) {
    mannequin.racine.rotation.y += (tourner - mannequin.racine.rotation.y) * Math.min(1, dt * 6);
    mannequin.animer(t, 0);
    cameraSalle.position.set(0, 1.25, 5.6);
    cameraSalle.lookAt(0, 0.85, 0);
    renderer.render(salle, cameraSalle);
    return;
  }
  const marche = bouger(dt);
  heros.animer(t, marche);
  cadrer(dt);
  dessinerCarte();
  renderer.render(fete, camera);
}
renderer.setAnimationLoop(() => image(Math.min(0.05, horloge.getDelta())));

// Pour les captures : faire avancer le temps à la main.
(window as unknown as { essai: unknown }).essai = {
  aller(x: number, z: number) {
    heros.racine.position.set(x, 0, z);
    for (let i = 0; i < 60; i++) image(0.05);
  },
  avancer(n = 30) {
    for (let i = 0; i < n; i++) image(0.05);
  },
  garderobe: ouvrirGarderobe,
};
