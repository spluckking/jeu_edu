// Prototype « la ville » : juger le rendu de modèles 3D tout faits (Kenney, CC0) avec l'éclairage
// du jeu, avant de décider d'un outil de modélisation. Trois vues : la place, la maison du
// personnage, l'intérieur. Rien ici n'est branché au jeu.

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as clonerAnime } from 'three/addons/utils/SkeletonUtils.js';
import { Atelier } from '../../src/scene/atelier.ts';
import { choisirPalette } from '../../src/scene/palette.ts';
import { choisirQualite, eclairer, materiauDetaille, ombrer, semerHerbe } from '../../src/scene/qualite.ts';
import { plaque } from '../../src/scene/textures.ts';

choisirQualite('haute');
const palette = choisirPalette('naturelle');

const toile = document.getElementById('scene') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas: toile, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
scene.background = new THREE.Color(palette.ciel.bas);
scene.fog = new THREE.Fog(palette.ciel.bas, 50, 120);
const ciel = new THREE.HemisphereLight(0xeaf6ff, 0xdcefc6, 2.1);
const soleil = new THREE.DirectionalLight(0xfff1dc, 1.7);
scene.add(ciel, soleil);
eclairer(renderer, scene, soleil, ciel);
renderer.shadowMap.autoUpdate = true;
soleil.target.position.set(0, 0, 0);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
function redimensionner(): void {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionner);
redimensionner();

const atelier = new Atelier();
const ville = new THREE.Group();
const interieur = new THREE.Group();
scene.add(ville, interieur);

// --- Chargement : chaque pack a sa propre échelle ; on la règle sur un modèle de référence. ----
const chargeur = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
function charger(chemin: string): Promise<GLTF> {
  let p = cache.get(chemin);
  if (!p) {
    p = chargeur.loadAsync(`./modeles/${chemin}.glb`);
    cache.set(chemin, p);
  }
  return p;
}
function taille(o: THREE.Object3D): THREE.Vector3 {
  return new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
}
const echelles = new Map<string, number>();
/** Le facteur d'un pack : la dimension voulue pour son modèle de référence. */
async function regler(pack: string, reference: string, axe: 'x' | 'y' | 'z', voulu: number): Promise<void> {
  const g = await charger(`${pack}/${reference}`);
  echelles.set(pack, voulu / taille(g.scene)[axe]);
}
async function poser(parent: THREE.Object3D, chemin: string, x: number, z: number, ry = 0, echelle = 1): Promise<THREE.Object3D> {
  const g = await charger(chemin);
  const o = g.scene.clone(true);
  o.scale.setScalar((echelles.get(chemin.split('/')[0] ?? '') ?? 1) * echelle);
  o.position.set(x, 0, z);
  o.rotation.y = ry;
  // Les modèles Meshy sont centrés sur leur milieu : on les pose sur le sol.
  if (chemin.startsWith('meshy/')) o.position.y = -new THREE.Box3().setFromObject(o).min.y;
  parent.add(o);
  return o;
}

// --- Le sol : herbe et dalles du jeu ------------------------------------------------------
ville.add(new THREE.Mesh(plaque(160, 160, 0, 0, 0), atelier.matHerbe));
const RAYON_PLACE = 10;
const place = new THREE.CircleGeometry(RAYON_PLACE, 48).rotateX(-Math.PI / 2).translate(0, 0.02, 0);
{
  const pos = place.getAttribute('position');
  const uv = place.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
}
ville.add(new THREE.Mesh(place, atelier.matDalles));
// Bordure de la place.
const bordure = new THREE.Mesh(new THREE.TorusGeometry(RAYON_PLACE, 0.22, 8, 64).rotateX(Math.PI / 2), materiauDetaille({ color: 0xd8cbb6, roughness: 0.8 }, { relief: 0.08, teinte: 0.06, grain: 0.8 }));
bordure.position.y = 0.05;
ville.add(bordure);

// Les maisons autour de la place ; celle du personnage au fond, face à la caméra.
const RAYON_MAISONS = 19;
const MAISONS: Array<[number, string]> = [
  [65, 'a'],
  [105, 'g'],
  [140, 'k'],
  [180, 'h'],
  [220, 'c'],
  [255, 'm'],
  [295, 'e'],
];
const chemins: Array<{ angle: number }> = [];
/** La face avant du modèle Meshy (réglée à l'œil). */
let ECHELLE_STAND = 1;
let ECHELLE_FORAIN = 1;
let ECHELLE_STAND_TRIPO = 1;
let ECHELLE_FORAIN_TRIPO = 1;
const ROTATION_MESHY = Number(new URLSearchParams(location.search).get('rot') ?? 0);
function surChemin(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  if (r < RAYON_PLACE + 0.6) return true;
  for (const { angle } of chemins) {
    const ax = Math.sin(angle);
    const az = Math.cos(angle);
    const le_long = x * ax + z * az;
    const travers = Math.abs(x * az - z * ax);
    if (le_long > RAYON_PLACE - 1 && le_long < RAYON_MAISONS - 2 && travers < 1.4) return true;
  }
  return false;
}
function dansUneMaison(x: number, z: number): boolean {
  for (const [deg] of MAISONS) {
    const a = (deg * Math.PI) / 180;
    if (Math.hypot(x - Math.sin(a) * RAYON_MAISONS, z - Math.cos(a) * RAYON_MAISONS) < 5) return true;
  }
  return Math.hypot(x, z) < 3.2;
}

// La fontaine, dessinée avec l'atelier du jeu.
function fontaine(): void {
  const g = new THREE.Group();
  const pierre = 0xd8cfc0;
  atelier.forme(g, [5.2, 0.5, 5.2], [0, 0.25, 0], pierre, { forme: 'tube' });
  atelier.forme(g, [5.2, 5.2, 0.5], [0, 0.55, 0], pierre, { forme: 'anneau', rx: Math.PI / 2 });
  atelier.forme(g, [4.8, 0.06, 4.8], [0, 0.53, 0], 0x6fbfe6, { forme: 'tube', lisse: true });
  atelier.forme(g, [0.7, 2.2, 0.7], [0, 1.6, 0], pierre, { forme: 'tube' });
  atelier.forme(g, [2, 0.5, 2], [0, 2.75, 0], pierre, { forme: 'calotte', rx: Math.PI });
  atelier.forme(g, [1.8, 0.08, 1.8], [0, 2.72, 0], 0x7cc4e8, { forme: 'tube', lisse: true });
  atelier.forme(g, [0.4, 0.4, 0.4], [0, 3.05, 0], 0xffcf3a, { forme: 'boule' });
  ville.add(g);
  atelier.fusionner(g);
}

const melangeurs: THREE.AnimationMixer[] = [];
const marcheurs: Array<{ o: THREE.Object3D; rayon: number; vitesse: number; phase: number }> = [];
async function personnage(parent: THREE.Object3D, nom: string, x: number, z: number, ry: number, animation: string): Promise<THREE.Object3D> {
  const g = await charger(`perso/character-${nom}`);
  // Un personnage animé se copie avec son squelette.
  const o = clonerAnime(g.scene);
  o.scale.setScalar(echelles.get('perso') ?? 1);
  o.position.set(x, 0, z);
  o.rotation.y = ry;
  parent.add(o);
  const m = new THREE.AnimationMixer(o);
  const clip = THREE.AnimationClip.findByName(g.animations, animation);
  if (clip) m.clipAction(clip).play();
  melangeurs.push(m);
  return o;
}

async function construireVille(): Promise<void> {
  fontaine();
  for (const [deg, type] of MAISONS) {
    const a = (deg * Math.PI) / 180;
    chemins.push({ angle: a });
    const x = Math.sin(a) * RAYON_MAISONS;
    const z = Math.cos(a) * RAYON_MAISONS;
    // La maison du personnage (au fond) vient de Meshy ; les autres, de Kenney, pour comparer.
    if (deg === 180) await poser(ville, 'meshy/maison', x, z, a + Math.PI + ROTATION_MESHY);
    else if (deg === 140) await poser(ville, 'tripo/maison', x, z, a + Math.PI);
    else await poser(ville, `ville/building-type-${type}`, x, z, a + Math.PI);
    // Une allée de dalles de la place à la porte.
    const longueur = RAYON_MAISONS - RAYON_PLACE - 3;
    const allee = plaque(2.4, longueur, 0, 0.015, 0);
    allee.rotateY(a).translate(Math.sin(a) * (RAYON_PLACE + longueur / 2), 0, Math.cos(a) * (RAYON_PLACE + longueur / 2));
    ville.add(new THREE.Mesh(allee, atelier.matDalles));
    // Buissons et fleurs devant chaque maison.
    const devant = (d: number, cote: number): [number, number] => [
      Math.sin(a) * (RAYON_MAISONS - d) + Math.cos(a) * cote,
      Math.cos(a) * (RAYON_MAISONS - d) - Math.sin(a) * cote,
    ];
    const [bx, bz] = devant(4.2, 3.2);
    await poser(ville, 'nature/plant_bushDetailed', bx, bz, deg, 0.4);
    const [fx, fz] = devant(4.6, -3);
    await poser(ville, deg % 2 ? 'nature/flower_redA' : 'nature/flower_yellowB', fx, fz, deg, 0.5);
  }
  // Chez soi : des fleurs et une jardinière.
  for (const [x, f] of [[-2.2, 'flower_purpleC'], [2.2, 'flower_redA'], [-3.2, 'flower_yellowB'], [3.2, 'flower_purpleC'], [-4.2, 'flower_redA'], [4.2, 'flower_yellowB']] as const) await poser(ville, `nature/${f}`, x, -14.2, 0, 0.5);
  await poser(ville, 'ville/planter', 4.6, -15.4, 0);

  // Arbres et décor autour du village (positions fixes : le même rendu à chaque fois).
  let graine = 7;
  const hasard = (): number => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  const ARBRES = ['nature/tree_oak', 'nature/tree_default', 'nature/tree_detailed', 'nature/tree_fat', 'nature/tree_pineRoundC'];
  for (let i = 0; i < 46; i++) {
    const a = hasard() * Math.PI * 2;
    const r = 27 + hasard() * 22;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (z > 18 && Math.abs(x) < 16) continue; // la vue de la place reste dégagée
    await poser(ville, ARBRES[i % ARBRES.length] ?? 'nature/tree_oak', x, z, hasard() * 6, 0.8 + hasard() * 0.5);
  }
  for (const deg of [85, 122, 160, 200, 238, 275]) {
    const a = (deg * Math.PI) / 180;
    await poser(ville, ARBRES[deg % 5] ?? 'nature/tree_oak', Math.sin(a) * 23, Math.cos(a) * 23, deg, 0.75);
  }
  for (let i = 0; i < 40; i++) {
    const a = hasard() * Math.PI * 2;
    const r = 11 + hasard() * 26;
    const x = Math.sin(a) * r;
    const z = Math.cos(a) * r;
    if (surChemin(x, z) || dansUneMaison(x, z)) continue;
    const decor = ['nature/rock_smallA', 'nature/mushroom_redGroup', 'nature/flower_yellowB', 'nature/flower_purpleC', 'nature/grass_large', 'nature/plant_bush', 'nature/stump_round'];
    await poser(ville, decor[i % decor.length] ?? 'nature/rock_smallA', x, z, hasard() * 6, 0.45);
  }
  // Un stand de la fête et son forain (Meshy), au bord de la place.
  await poser(ville, 'meshy/stand', -6.6, -3.2, 0.95, ECHELLE_STAND);
  await poser(ville, 'meshy/forain', -4.7, -1.7, 0.95, ECHELLE_FORAIN);
  // En face, les mêmes faits avec Tripo, pour comparer.
  await poser(ville, 'tripo/stand', 6.6, -3.2, -0.95, ECHELLE_STAND_TRIPO);
  try {
    await poser(ville, 'tripo/forain', 4.7, -1.7, -0.95, ECHELLE_FORAIN_TRIPO);
  } catch {
    // Le forain Tripo n'est pas encore là.
  }
  // Des bancs sur la place.
  await poser(ville, 'meubles/bench', -6.5, 4.5, 2.2, 1.6);
  await poser(ville, 'meubles/bench', 6.5, 4.5, -2.2, 1.6);

  // Les habitants : le héros devant chez lui, deux promeneurs, un assis.
  await personnage(ville, 'male-a', 0.9, -11.6, 0.15, 'idle');
  for (const [nom, rayon, vitesse, phase] of [
    ['female-b', 6.4, 0.22, 0],
    ['male-d', 7.6, -0.17, 2.5],
  ] as const) {
    const o = await personnage(ville, nom, 0, 0, 0, 'walk');
    marcheurs.push({ o, rayon, vitesse, phase });
  }
  await personnage(ville, 'female-e', 5.8, 2.6, -2.2, 'emote-yes');

  const herbe = semerHerbe((x, z) => !surChemin(x, z) && !dansUneMaison(x, z), 60000, { x: 48, zMin: -48, zMax: 40 });
  ville.add(herbe.racine);
  animerHerbe = (t) => herbe.animer(t);
  ombrer(ville);
}
let animerHerbe: (t: number) => void = () => {};

// --- L'intérieur de la maison : une pièce en « maison de poupée » ------------------------------
async function construireInterieur(): Promise<void> {
  const parquet = materiauDetaille({ color: 0xc8935f, roughness: 0.7 }, { relief: 0.05, teinte: 0.08, grain: 1.2 });
  const papier = materiauDetaille({ color: 0xf3e3c8, roughness: 0.9 }, { relief: 0.02, teinte: 0.04, grain: 0.6 });
  const plinthe = materiauDetaille({ color: 0x9a6b4a, roughness: 0.6 }, { relief: 0.03, teinte: 0.05, grain: 0.5 });
  const L = 8;
  const P = 6.5;
  const sol = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, P), parquet);
  sol.position.y = -0.15;
  interieur.add(sol);
  const murFond = new THREE.Mesh(new THREE.BoxGeometry(L, 4, 0.3), papier);
  murFond.position.set(0, 2, -P / 2 - 0.15);
  const murGauche = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, P), papier);
  murGauche.position.set(-L / 2 - 0.15, 2, 0);
  interieur.add(murFond, murGauche);
  for (const [l, p, x, z] of [
    [L, 0.12, 0, -P / 2 + 0.06],
    [0.12, P, -L / 2 + 0.06, 0],
  ] as const) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(l, 0.25, p), plinthe);
    b.position.set(x, 0.12, z);
    interieur.add(b);
  }
  // Une fenêtre lumineuse au fond.
  const fenetre = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 0.05), new THREE.MeshBasicMaterial({ color: 0xcfeeff }));
  fenetre.position.set(1.6, 2.3, -P / 2 + 0.01);
  const cadre = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 0.08), plinthe);
  cadre.position.set(1.6, 2.3, -P / 2 - 0.02);
  interieur.add(cadre, fenetre);

  const m = async (nom: string, x: number, z: number, ry = 0, y = 0): Promise<void> => {
    const o = await poser(interieur, `meubles/${nom}`, x, z, ry);
    o.position.y = y;
  };
  await m('rugRounded', 0.6, 0.6);
  await m('bedSingle', -3.2, -2.1, 0);
  await m('pillow', -3.2, -2.9, 0, 0.8);
  await m('bear', -2.7, -2.5, 0.4, 0.8);
  await m('bookcaseOpen', -3.7, 1.2, Math.PI / 2);
  await m('books', -3.6, 1.2, Math.PI / 2, 1.2);
  await m('tableRound', 1.6, 0.8);
  await m('chairCushion', 0.6, 0.8, Math.PI / 2);
  await m('chairCushion', 2.6, 0.8, -Math.PI / 2);
  await m('radio', 1.5, 0.7, 0.3, 0.95);
  await m('loungeSofa', 2.8, -2.4, 0);
  await m('lampRoundFloor', 3.5, -2.8);
  await m('pottedPlant', -0.6, -3);
  await m('plantSmall2', 3.4, 2.6);
  await personnage(interieur, 'male-a', -0.6, 1.6, 0.6, 'idle');
  interieur.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  interieur.visible = false;
}

// --- Les vues -----------------------------------------------------------------------------
const VUES: Record<string, { position: [number, number, number]; cible: [number, number, number]; dedans: boolean }> = {
  place: { position: [0, 21, 30], cible: [0, 0, -3], dedans: false },
  maison: { position: [7, 6.5, -2], cible: [0, 2, -16], dedans: false },
  fete: { position: [-0.8, 4.2, 6.5], cible: [-5.8, 1.5, -2.6], dedans: false },
  comparer: { position: [0, 7.5, 13], cible: [0, 1.6, -3], dedans: false },
  interieur: { position: [7.5, 9.5, 10], cible: [-0.2, 0.6, -0.4], dedans: true },
};
function montrer(nom: string): void {
  const v = VUES[nom] ?? VUES.place;
  if (!v) return;
  camera.position.set(...v.position);
  camera.lookAt(...v.cible);
  ville.visible = !v.dedans;
  interieur.visible = v.dedans;
  scene.background = new THREE.Color(v.dedans ? 0x3a3140 : palette.ciel.bas);
  scene.fog = v.dedans ? null : new THREE.Fog(palette.ciel.bas, 50, 120);
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-vue]')) b.classList.toggle('choisie', b.dataset.vue === nom);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-vue]')) b.addEventListener('click', () => montrer(b.dataset.vue ?? 'place'));

await Promise.all([regler('ville', 'building-type-a', 'x', 7), regler('perso', 'character-male-a', 'y', 1.3), regler('nature', 'tree_oak', 'y', 7), regler('meubles', 'bedSingle', 'z', 2.6), regler('meshy', 'maison', 'x', 7.5), regler('tripo', 'maison', 'x', 7.5)]);
// Les modèles Meshy ont chacun leur taille : on les règle sur la maison.
{
  const base = echelles.get('meshy') ?? 1;
  const t = async (n: string, axe: 'x' | 'y', voulu: number): Promise<number> => voulu / (taille((await charger(`meshy/${n}`)).scene)[axe] * base);
  ECHELLE_STAND = await t('stand', 'x', 4.6);
  ECHELLE_FORAIN = await t('forain', 'y', 1.6);
  const baseT = echelles.get('tripo') ?? 1;
  const tt = async (n: string, axe: 'x' | 'y', voulu: number): Promise<number> => voulu / (taille((await charger(`tripo/${n}`)).scene)[axe] * baseT);
  ECHELLE_STAND_TRIPO = await tt('stand', 'x', 4.6);
  ECHELLE_FORAIN_TRIPO = await tt('forain', 'y', 1.6).catch(() => 1);
}
await construireVille();
await construireInterieur();
montrer(new URLSearchParams(location.search).get('vue') ?? 'place');
document.body.dataset.pret = '1';

const horloge = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, horloge.getDelta());
  const t = horloge.elapsedTime;
  for (const m of melangeurs) m.update(dt);
  for (const w of marcheurs) {
    const a = w.phase + t * w.vitesse;
    w.o.position.set(Math.sin(a) * w.rayon, 0, Math.cos(a) * w.rayon);
    // Il regarde dans le sens de la marche.
    w.o.rotation.y = a + (w.vitesse > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  animerHerbe(t);
  renderer.render(scene, camera);
});
