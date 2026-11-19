// La ville, tranche 0 (le socle) : la place, la maison du personnage, un forain animé, la
// promenade au joystick avec la caméra haute, un dialogue que l'enfant lit lui-même en pouvant
// toucher un mot pour l'entendre, et la sauvegarde de la position. Voir docs/VILLE.md.

import '../style.css';
import './ville.css';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as clonerAnime } from 'three/addons/utils/SkeletonUtils.js';
import catalogue from '../../content/modeles/modeles.json';
import dialogues from '../../content/ville/dialogues.json';
import { creerCommandes } from '../controles/joystick.ts';
import { garderobeNeuve } from '../recompenses/recompenses.ts';
import { Atelier } from '../scene/atelier.ts';
import { choisirPalette } from '../scene/palette.ts';
import { creerPersonne } from '../scene/personne.ts';
import { choisirQualite, eclairer, ombrer } from '../scene/qualite.ts';
import { CameraHaute } from '../scene/suivi.ts';
import { dire } from '../son/voix.ts';
import { installerDictee, type PointInteret } from './dictee-ville.ts';
import { installerDemandes, majSeance, parlerA } from './demandes-ville.ts';
import { installerEpicerie, rafraichirHud } from './epicerie-ville.ts';
import { installerJardin } from './jardin-ville.ts';
import { installerPoste } from './poste-ville.ts';
import { essaiGrandDefi, installerFete, ouvrirStand, standFini } from './fete-ville.ts';
import { chantierOuvert, ETAPES, etapesVisibles } from './attraction.ts';
import attractions from '../../content/ville/attractions.json';
import { jourDe } from '../memoire/jours.ts';
import { surveillerModeApp } from '../app/modeApp.ts';
import { surveillerMiseAJour } from '../app/miseAJour.ts';
import { bruitage, demarrerSon } from '../son/bruitages.ts';
import { musique, type Piste } from '../son/musique.ts';
import type { IdStand } from '../scene/fete.ts';
import type { IdManege } from '../detente/objectifs.ts';
import { installerProjets } from './projets-ville.ts';
import projets from '../../content/ville/projets.json';
import { installerRiviere } from './riviere-ville.ts';
import type { Etape } from './jardin.ts';
import epicerie from '../../content/ville/epicerie.json';
import meubles from '../../content/ville/meubles.json';
import { chargerEtat, sauverEtat } from './etat.ts';
import { creerSol, semerGazon } from './gazon.ts';
import { BORDS, BUISSONS_MURES, dansLaFete, dansLEau, devantLeStand, FETE, LIEUX, occupe as occupeMonde, PONT, RAYON_PLACE, surLePont } from './monde.ts';
import { dessinerMonde, guirlandes, placesDesArbres, planterArbres } from './monde-scene.ts';

/** Le forain du chamboule-tout, à la fête foraine, juste après le portail. */
const FORAIN = devantLeStand(FETE.stands.chamboule);
/** Le forain de la grande roue, et où viennent aider les forains qui ont fini leur journée. */
const FORAIN_ROUE = FETE.forainRoue;
const AIDES_ROUE = FETE.aidesRoue;
import { aEntendre, decouper } from './mots.ts';

const adresse = new URLSearchParams(location.search);
/** Essais seulement : plan rapproché sur le héros (voir « ?essai » en bas). */
let grosPlan: { angle: number } | null = null;
/** Essais seulement : une caméra fixe (position, cible). */
let vueFixe: [number, number, number, number, number, number] | null = null;
const qualite = choisirQualite(adresse.get('qualite') ?? 'haute');
const palette = choisirPalette('naturelle');
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

// --- Moteur, lumière, caméra -------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: el<HTMLCanvasElement>('scene'), antialias: true, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
scene.background = new THREE.Color(palette.ciel.bas);
scene.fog = new THREE.Fog(palette.ciel.bas, 70, 170);
const ciel = new THREE.HemisphereLight(0xeaf6ff, 0xdcefc6, 2.1);
const soleil = new THREE.DirectionalLight(0xfff1dc, 1.7);
scene.add(ciel, soleil);
if (qualite === 'haute') eclairer(renderer, scene, soleil, ciel);
soleil.target.position.set(0, 0, -4);

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 300);
const suivi = new CameraHaute();
function redimensionner(): void {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionner);
redimensionner();

// --- Le sol : herbe, place pavée, allée vers la maison -------------------------------------------
const atelier = new Atelier();
const ville = new THREE.Group();
scene.add(ville);
ville.add(creerSol(280));
// Les chemins de terre, la rivière, l'étang et sa plage (le plan est dans monde.ts).
const monde = dessinerMonde();
ville.add(monde.racine);
const place = new THREE.CircleGeometry(RAYON_PLACE, 48).rotateX(-Math.PI / 2).translate(0, 0.02, 0);
{
  const pos = place.getAttribute('position');
  const uv = place.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
}
ville.add(new THREE.Mesh(place, atelier.matDalles));

// La fontaine du centre, dessinée avec l'atelier du jeu.
{
  const g = new THREE.Group();
  const pierre = 0xd8cfc0;
  atelier.forme(g, [4.4, 0.45, 4.4], [0, 0.22, 0], pierre, { forme: 'tube' });
  atelier.forme(g, [4.4, 4.4, 0.45], [0, 0.5, 0], pierre, { forme: 'anneau', rx: Math.PI / 2 });
  atelier.forme(g, [4, 0.06, 4], [0, 0.48, 0], 0x6fbfe6, { forme: 'tube', lisse: true });
  atelier.forme(g, [0.6, 2, 0.6], [0, 1.4, 0], pierre, { forme: 'tube' });
  atelier.forme(g, [1.8, 0.45, 1.8], [0, 2.45, 0], pierre, { forme: 'calotte', rx: Math.PI });
  atelier.forme(g, [1.6, 0.07, 1.6], [0, 2.42, 0], 0x6fbfe6, { forme: 'tube', lisse: true });
  ville.add(g);
  atelier.fusionner(g);
}

/** Ce qui arrête le personnage : des cercles (x, z, rayon). */
const obstacles: Array<{ x: number; z: number; r: number }> = [
  { x: 0, z: 0, r: 2.6 },
  { x: LIEUX.epicerie.x, z: LIEUX.epicerie.z, r: 3.4 },
  { x: LIEUX.epiciere.x, z: LIEUX.epiciere.z, r: 0.6 },
  { x: LIEUX.pommier.x, z: LIEUX.pommier.z, r: 1.1 },
  { x: LIEUX.poste.x, z: LIEUX.poste.z, r: 3.2 },
  { x: LIEUX.postiere.x, z: LIEUX.postiere.z, r: 0.6 },
  { x: LIEUX.boulangerie.x, z: LIEUX.boulangerie.z, r: 3 },
  ...BUISSONS_MURES.map((b) => ({ x: b.x, z: b.z, r: 0.9 })),
];
/** Autour des lieux, ni herbe haute ni arbres (rayon en mètres). */
const ABORDS = [
  { ...LIEUX.maison, r: 7 },
  { ...LIEUX.potager, r: 4.5 },
  { ...LIEUX.pommier, r: 2.6 },
  { ...LIEUX.epicerie, r: 5 },
  { ...LIEUX.poste, r: 5 },
  { ...LIEUX.boulangerie, r: 5 },
  { ...LIEUX.tableau, r: 1.8 },
  { ...LIEUX.murDesMots, r: 3 },
  { ...LIEUX.tour, r: 3.2 },
  { ...LIEUX.ponton, r: 3 },
  { ...LIEUX.portailFete, r: 5 },
  { ...LIEUX.fete, r: Math.max(FETE.rx, FETE.rz) + 1 },
  ...BUISSONS_MURES.map((b) => ({ ...b, r: 2.2 })),
];

// --- Les modèles Tripo ------------------------------------------------------------------------
const chargeur = new GLTFLoader();
async function modele(id: string): Promise<GLTF | null> {
  try {
    return await chargeur.loadAsync(`${import.meta.env.BASE_URL}modeles/${id}.glb`);
  } catch {
    return null;
  }
}
/** Tripo exporte ses modèles face à +x : ce quart de tour les remet face à +z (vers la caméra). */
const FACE_TRIPO = -Math.PI / 2;

/** Met un modèle à la bonne taille et le pose au sol. cap : 0 = face à la caméra. */
function poser(o: THREE.Object3D, axe: 'x' | 'y', voulu: number, x: number, z: number, cap: number): void {
  const taille = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  o.scale.setScalar(voulu / Math.max(1e-6, taille[axe]));
  o.position.set(x, 0, z);
  o.rotation.y = cap + FACE_TRIPO;
  o.updateMatrixWorld(true);
  o.position.y -= new THREE.Box3().setFromObject(o).min.y;
}

let hauteurPont = 0;
/** La hauteur du sol sous l'enfant : le tablier du pont fait une bosse douce. */
function sol(x: number, z: number): number {
  if (!surLePont(x, z)) return 0.06;
  const u = (x - LIEUX.pont.x) / (PONT.longueur / 2);
  return 0.06 + hauteurPont * Math.max(0, 1 - u * u);
}

/** Comme poser, mais le modèle est centré sur sa place et mesuré par sa plus grande longueur au
 *  sol (pour ceux dont l'origine n'est pas au milieu : pont, portail). */
function poserCentre(o: THREE.Object3D, longueur: number, x: number, z: number, cap: number): void {
  const t = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  o.scale.setScalar(longueur / Math.max(1e-6, t.x, t.z));
  o.rotation.y = cap + FACE_TRIPO;
  o.position.set(0, 0, 0);
  o.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(o);
  const c = b.getCenter(new THREE.Vector3());
  o.position.set(x - c.x, -b.min.y, z - c.z);
}

const melangeurs: THREE.AnimationMixer[] = [];

// L'épicerie, au bord de la place, face au centre ; l'épicière devant ; le pommier de l'autre côté.
const EPICERIE = LIEUX.epicerie;
const EPICIERE = LIEUX.epiciere;
const POMMIER = LIEUX.pommier;
const pommesArbre: THREE.Object3D[] = [];
let pommesVisibles = 0;
function montrerPommes(n: number): void {
  pommesVisibles = n;
  pommesArbre.forEach((p, i) => (p.visible = i < n));
}
/** Les forains des stands : leur modèle, et le sens où ils regardent devant leur stand. */
const forainsDesStands = new Map<string, { o: THREE.Object3D; cap: number }>();
interface Habitant {
  id: string;
  nom: string;
  racine: THREE.Object3D;
  dialogue: string;
}
const habitants: Habitant[] = [];
/** Tout ce dont on peut s'approcher pour agir : habitants, tableau, lieux de piège… */
const points: PointInteret[] = [];

async function peupler(): Promise<void> {
  const maison = await modele('maison-du-personnage');
  if (maison) {
    poser(maison.scene, 'x', 7.5, LIEUX.maison.x, LIEUX.maison.z, LIEUX.maison.cap);
    ville.add(maison.scene);
    obstacles.push({ x: LIEUX.maison.x, z: LIEUX.maison.z, r: 3.6 });
  }
  const forain = await modele('forain-chamboule');
  if (forain) {
    const o = forain.animations.length ? clonerAnime(forain.scene) : forain.scene;
    poser(o, 'y', 2.2, FORAIN.x, FORAIN.z, FORAIN.cap);
    ville.add(o);
    obstacles.push({ x: FORAIN.x, z: FORAIN.z, r: 0.7 });
    if (forain.animations.length) {
      const m = new THREE.AnimationMixer(o);
      const attente = forain.animations.find((a) => /idle/i.test(a.name)) ?? forain.animations[0];
      if (attente) m.clipAction(attente).play();
      melangeurs.push(m);
    }
    const h: Habitant = { id: 'forain-chamboule', nom: 'Le forain', racine: o, dialogue: 'forain-accueil' };
    habitants.push(h);
    forainsDesStands.set('chamboule', { o, cap: FORAIN.cap });
    points.push({
      verbe: 'Parler',
      nom: h.nom,
      x: o.position.x,
      z: o.position.z,
      // Sa demande du jour d'abord ; sinon, son dialogue d'accueil.
      action: () =>
        void parlerA(h.id).then((fait) => {
          if (fait) return;
          if (!etat.lus.includes(h.dialogue)) ouvrirDialogue(h);
          else ouvrirStand('chamboule');
        }),
    });
  }
  // L'épicerie, son épicière devant l'étal, et le pommier (tranche 1B).
  const boutique = await modele('epicerie');
  if (boutique) {
    poser(boutique.scene, 'x', 6.5, EPICERIE.x, EPICERIE.z, EPICERIE.cap);
    ville.add(boutique.scene);
  }
  const epiciere = await modele('epiciere');
  if (epiciere) {
    const o = epiciere.animations.length ? clonerAnime(epiciere.scene) : epiciere.scene;
    poser(o, 'y', 2, EPICIERE.x, EPICIERE.z, EPICIERE.cap);
    ville.add(o);
    if (epiciere.animations[0]) {
      const m = new THREE.AnimationMixer(o);
      m.clipAction(epiciere.animations[0]).play();
      melangeurs.push(m);
    }
  }
  const arbre = await modele('pommier');
  if (arbre) {
    poser(arbre.scene, 'y', 4.2, POMMIER.x, POMMIER.z, 0.4);
    ville.add(arbre.scene);
    const pomme = await modele('pomme');
    if (pomme) {
      // Trois pommes accrochées au bord du feuillage, côté promenade.
      const b = new THREE.Box3().setFromObject(arbre.scene);
      const t = b.getSize(new THREE.Vector3());
      for (const [a, h] of [[0.2, 0.55], [1.3, 0.68], [-0.9, 0.62]] as const) {
        const p = pomme.scene.clone();
        poser(p, 'y', 0.48, POMMIER.x + Math.sin(a) * t.x * 0.44, POMMIER.z + Math.cos(a) * t.z * 0.44, a);
        p.position.y = b.min.y + t.y * h;
        ville.add(p);
        pommesArbre.push(p);
      }
      montrerPommes(pommesVisibles);
    }
  }
  for (const id of etat.meubles) await poserMeuble(id);
  await poserPaysage();
  await poserFete();
  await poserPotager();
  await poserRiviere();
  await poserPoste();
  if (qualite === 'haute') ombrer(ville);
}

// Le potager, à droite de la maison : quatre parcelles en carré. Chaque parcelle a sa caisse de
// terre, et par-dessus ce qui pousse (pousse, puis légume mûr), échangé quand ça change.
const POTAGER = LIEUX.potager;
const PLACES_PARCELLES = [
  { x: POTAGER.x - 1.25, z: POTAGER.z + 1.25 },
  { x: POTAGER.x + 1.25, z: POTAGER.z + 1.25 },
  { x: POTAGER.x - 1.25, z: POTAGER.z - 1.25 },
  { x: POTAGER.x + 1.25, z: POTAGER.z - 1.25 },
];
const plantes: Array<THREE.Object3D | null> = PLACES_PARCELLES.map(() => null);
const voulues: Array<string | null> = PLACES_PARCELLES.map(() => null);
async function dessinerParcelle(i: number, e: Etape, modeleMur: string | null): Promise<void> {
  const id = e === 'libre' ? null : e === 'mure' ? modeleMur : e === 'pousse' ? 'pousse' : null;
  voulues[i] = id;
  const avant = plantes[i];
  if (avant && avant.userData.id === id) return;
  const g = id ? await modele(id) : null;
  if (voulues[i] !== id) return;
  plantes[i]?.removeFromParent();
  plantes[i] = null;
  const place = PLACES_PARCELLES[i];
  if (!g || !place) return;
  const o = g.scene.clone();
  o.userData.id = id;
  poser(o, 'x', e === 'mure' ? 1.3 : 0.9, place.x, place.z, 0);
  o.position.y += 0.18;
  ville.add(o);
  plantes[i] = o;
  if (qualite === 'haute') ombrer(o);
}
async function poserPotager(): Promise<void> {
  const caisse = await modele('parcelle');
  if (!caisse) return;
  for (const place of PLACES_PARCELLES) {
    const o = caisse.scene.clone();
    poser(o, 'x', 2, place.x, place.z, 0);
    ville.add(o);
  }
}

// La rivière et le bois : le ponton au bord du ruisseau, sous le pont ; trois buissons de mûres à
// l'ouest de la place. Sur chaque buisson, autant de grappes que de mûres à cueillir ce jour-là.
const PONTON = LIEUX.ponton;
const grappes: THREE.Object3D[][] = BUISSONS_MURES.map(() => []);
const grappesVoulues: number[] = BUISSONS_MURES.map(() => 0);
function montrerMures(i: number, n: number): void {
  grappesVoulues[i] = n;
  grappes[i]?.forEach((g, k) => (g.visible = k < n));
}
async function poserRiviere(): Promise<void> {
  const ponton = await modele('ponton');
  if (ponton) {
    poser(ponton.scene, 'x', 3.2, PONTON.x, PONTON.z, PONTON.cap);
    ville.add(ponton.scene);
  }
  const buisson = await modele('buisson');
  const mures = await modele('mures');
  BUISSONS_MURES.forEach((b, i) => {
    if (!buisson) return;
    const o = buisson.scene.clone();
    poser(o, 'y', 1.6, b.x, b.z, i * 1.3);
    ville.add(o);
    if (!mures) return;
    // Cinq places de grappes autour du buisson, côté promenade ; on en montre autant que de mûres.
    const boite = new THREE.Box3().setFromObject(o);
    const t = boite.getSize(new THREE.Vector3());
    for (let k = 0; k < 5; k++) {
      const a = -0.2 + k * 0.55;
      const g = mures.scene.clone();
      poser(g, 'y', 0.32, b.x + Math.sin(a) * t.x * 0.47, b.z + Math.cos(a) * t.z * 0.47, a);
      g.position.y = boite.min.y + t.y * (0.35 + (k % 2) * 0.25);
      ville.add(g);
      grappes[i]?.push(g);
    }
    montrerMures(i, grappesVoulues[i] ?? 0);
  });
}

// La poste, à l'ouest de la place, face à l'épicerie ; la postière devant sa porte.
const POSTE = LIEUX.poste;
const POSTIERE = LIEUX.postiere;
async function poserPoste(): Promise<void> {
  const batiment = await modele('poste');
  if (batiment) {
    poser(batiment.scene, 'x', 6, POSTE.x, POSTE.z, POSTE.cap);
    ville.add(batiment.scene);
  }
  const p = await modele('postiere');
  if (!p) return;
  const o = p.animations.length ? clonerAnime(p.scene) : p.scene;
  poser(o, 'y', 2.1, POSTIERE.x, POSTIERE.z, POSTIERE.cap);
  ville.add(o);
  const attente = p.animations.find((a) => /idle/i.test(a.name)) ?? p.animations[0];
  if (attente) {
    const m = new THREE.AnimationMixer(o);
    m.clipAction(attente).play();
    melangeurs.push(m);
  }
}

// Les grands projets : chaque lieu a sa place ; on y voit le chantier, puis le bâtiment construit
// et son habitant devant la porte.
const LIEUX_PROJETS: Record<string, { x: number; z: number; cap: number }> = { boulangerie: LIEUX.boulangerie };
let chantier: THREE.Object3D | null = null;
async function montrerChantier(id: string | null): Promise<void> {
  chantier?.removeFromParent();
  chantier = null;
  const lieu = id ? LIEUX_PROJETS[id] : undefined;
  const g = lieu ? await modele('chantier') : null;
  if (!g || !lieu) return;
  chantier = g.scene;
  poser(chantier, 'x', 5.5, lieu.x, lieu.z, lieu.cap);
  ville.add(chantier);
  if (qualite === 'haute') ombrer(chantier);
}
async function montrerLieu(id: string): Promise<void> {
  const lieu = LIEUX_PROJETS[id];
  const p = projets.projets.find((x) => x.id === id);
  if (!lieu || !p) return;
  const batiment = await modele(p.modele);
  if (batiment) {
    // La vitrine du modèle est à l'arrière : un demi-tour la met face à la caméra.
    poser(batiment.scene, 'x', 6, lieu.x, lieu.z, Math.PI + lieu.cap);
    ville.add(batiment.scene);
    if (qualite === 'haute') ombrer(batiment.scene);
  }
  const h = await modele(p.habitant.modele);
  if (!h) return;
  const o = h.animations.length ? clonerAnime(h.scene) : h.scene;
  poser(o, 'y', 2.1, lieu.x + 2.4, lieu.z + 3.6, -0.3);
  ville.add(o);
  obstacles.push({ x: lieu.x + 2.4, z: lieu.z + 3.6, r: 0.6 });
  const attente = h.animations.find((a) => /idle/i.test(a.name)) ?? h.animations[0];
  if (attente) {
    const m = new THREE.AnimationMixer(o);
    m.clipAction(attente).play();
    melangeurs.push(m);
  }
  if (qualite === 'haute') ombrer(o);
}
function annoncerEnVille(texte: string): void {
  const b = Object.assign(document.createElement('p'), { className: 'bulle-ville', textContent: texte });
  document.body.append(b);
  setTimeout(() => b.remove(), 4000);
}

// Le paysage : les arbres en bosquets, le pont sur la rivière, le portail de la fête foraine.
async function poserPaysage(): Promise<void> {
  const places = placesDesArbres(ABORDS);
  const sortes: Array<[string, number]> = [
    ['arbre-chene', 6.2],
    ['arbre-sapin', 7.5],
    ['arbre-cerisier', 4.6],
  ];
  for (const [i, [id, hauteur]] of sortes.entries()) {
    const g = await modele(id);
    const ici = places.filter((p) => p.sorte === i);
    if (g && ici.length) ville.add(planterArbres(g, hauteur, ici));
    for (const p of ici) obstacles.push({ x: p.x, z: p.z, r: 0.7 * p.taille });
  }
  const pont = await modele('pont');
  if (pont) {
    poserCentre(pont.scene, 9.5, LIEUX.pont.x, LIEUX.pont.z, LIEUX.pont.cap);
    // Le tablier : sa hauteur au milieu, pour que l'enfant monte et descende en traversant.
    hauteurPont = new THREE.Box3().setFromObject(pont.scene).max.y * 0.42;
    ville.add(pont.scene);
  }
  const portail = await modele('portail-fete');
  if (portail) {
    poserCentre(portail.scene, 7.5, LIEUX.portailFete.x, LIEUX.portailFete.z, LIEUX.portailFete.cap);
    ville.add(portail.scene);
  }
}

// La fête foraine : les stands et leurs forains, les manèges, la grande roue.
async function poserFete(): Promise<void> {
  for (const [id, s] of Object.entries(FETE.stands)) {
    const stand = await modele(`stand-${id}`);
    if (stand) {
      poserCentre(stand.scene, 5, s.x, s.z, s.cap);
      ville.add(stand.scene);
    }
    obstacles.push({ x: s.x, z: s.z, r: 2.3 });
    if (id === 'chamboule') continue;
    const f = await modele(`forain-${id}`);
    if (!f) continue;
    const o = f.animations.length ? clonerAnime(f.scene) : f.scene;
    const p = devantLeStand(s);
    poser(o, 'y', 2.1, p.x, p.z, p.cap);
    ville.add(o);
    forainsDesStands.set(id, { o, cap: p.cap });
    const attente = f.animations.find((a) => /idle/i.test(a.name)) ?? f.animations[0];
    if (attente) {
      const m = new THREE.AnimationMixer(o);
      m.clipAction(attente).play();
      melangeurs.push(m);
    }
  }
  const tailles: Record<string, [string, number]> = { autos: ['autos-tamponneuses', 9], trampoline: ['trampoline', 6.5], glaces: ['palais-glaces', 7] };
  for (const [id, m] of Object.entries(FETE.maneges)) {
    const [fichier, longueur] = tailles[id] ?? ['', 0];
    const g = await modele(fichier);
    if (g) {
      poserCentre(g.scene, longueur, m.x, m.z, m.cap);
      ville.add(g.scene);
    }
    obstacles.push({ x: m.x, z: m.z, r: longueur / 2.4 });
  }
  // Le décor : chaque modèle n'est chargé qu'une fois, puis copié.
  const charges = new Map<string, GLTF | null>();
  for (const d of FETE.deco) {
    if (!charges.has(d.modele)) charges.set(d.modele, await modele(d.modele));
    const g = charges.get(d.modele);
    if (g) {
      const o = g.scene.clone();
      poserCentre(o, d.longueur, d.x, d.z, d.cap);
      ville.add(o);
    }
    obstacles.push({ x: d.x, z: d.z, r: d.r });
  }
  // Les lampadaires de l'allée, et les fanions tendus entre eux : en travers de l'allée, et le
  // long de chaque côté.
  const lampe = await modele('lampadaire');
  const HAUT = 3.7;
  for (const l of FETE.lampadaires) {
    if (lampe) {
      const o = lampe.scene.clone();
      poser(o, 'y', 4.3, l.x, l.z, 0);
      ville.add(o);
    }
    obstacles.push({ x: l.x, z: l.z, r: 0.35 });
  }
  const L = FETE.lampadaires.map((l) => new THREE.Vector3(l.x, HAUT, l.z));
  const fils: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (let i = 0; i + 1 < L.length; i += 2) fils.push([L[i]!, L[i + 1]!]);
  for (let i = 0; i + 2 < L.length; i++) fils.push([L[i]!, L[i + 2]!]);
  ville.add(guirlandes(fils));
  const roue = await modele('grande-roue');
  if (roue) {
    poserCentre(roue.scene, 12, FETE.roue.x, FETE.roue.z, FETE.roue.cap);
    ville.add(roue.scene);
    // En construction, la roue sort de terre : tout ce qui dépasse la hauteur du chantier est
    // coupé (un plan de coupe, ombres comprises).
    renderer.localClippingEnabled = true;
    roue.scene.traverse((m) => {
      if (!(m instanceof THREE.Mesh)) return;
      const liste = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of liste) {
        mat.clippingPlanes = [coupeRoue];
        mat.clipShadows = true;
      }
    });
    const b = new THREE.Box3().setFromObject(roue.scene);
    boiteRoue.copy(b);
  }
  obstacles.push({ x: FETE.roue.x, z: FETE.roue.z, r: 4 });
  const forainRoue = await modele('forain-roue');
  if (forainRoue) {
    const o = forainRoue.animations.length ? clonerAnime(forainRoue.scene) : forainRoue.scene;
    poser(o, 'y', 2.1, FORAIN_ROUE.x, FORAIN_ROUE.z, FORAIN_ROUE.cap);
    ville.add(o);
    const attente = forainRoue.animations.find((a) => /idle/i.test(a.name)) ?? forainRoue.animations[0];
    if (attente) {
      const m = new THREE.AnimationMixer(o);
      m.clipAction(attente).play();
      melangeurs.push(m);
    }
  }
  obstacles.push({ x: FORAIN_ROUE.x, z: FORAIN_ROUE.z, r: 0.6 });
  majFete();
  if (qualite === 'haute') ombrer(ville);
}

// --- La grande roue : chantier, forains qui viennent aider, tour de roue ------------------------
const coupeRoue = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
const boiteRoue = new THREE.Box3();
/** La part de la roue construite (0 à 1), et celle vers laquelle elle monte doucement. */
let partRoue = 1;
let partVoulue = 1;
const roueConstruite = (): boolean => etat.attraction.construites.includes('grande-roue');
const aujourdhuiVille = (): string => jourDe(new Date());

/** Replace les forains (à leur stand, ou à la roue s'ils ont fini) et règle la hauteur du chantier. */
function majFete(festif = false): void {
  const jour = aujourdhuiVille();
  const chantier = etat.attraction.enCours === 'grande-roue' && chantierOuvert(etat.attraction, jour);
  partVoulue = roueConstruite() || !chantier ? 1 : 0.3 + (0.55 * etapesVisibles(etat.attraction, jour)) / ETAPES;
  if (!festif) partRoue = partVoulue;
  let rang = 0;
  for (const [id, { o, cap }] of forainsDesStands) {
    const s = FETE.stands[id as keyof typeof FETE.stands];
    const aide = chantier && standFini(id as keyof typeof FETE.stands);
    const p = aide ? (AIDES_ROUE[rang++] ?? devantLeStand(s)) : devantLeStand(s);
    o.position.x = p.x;
    o.position.z = p.z;
    o.rotation.y = (aide ? p.cap : cap) + FACE_TRIPO;
    // Le bouton « Parler » du forain du chamboule le suit.
    if (id === 'chamboule') {
      const point = points.find((x) => x.nom === 'Le forain' && x.verbe === 'Parler');
      if (point) Object.assign(point, { x: p.x, z: p.z });
    }
  }
}
function animerRoue(dt: number): void {
  if (boiteRoue.isEmpty()) return;
  if (partRoue < partVoulue) partRoue = Math.min(partVoulue, partRoue + dt / 3);
  // 1 : rien n'est coupé.
  coupeRoue.constant = partRoue >= 1 ? 1000 : boiteRoue.min.y + (boiteRoue.max.y - boiteRoue.min.y) * partRoue;
}

/** Un tour de grande roue : la caméra monte avec une nacelle et fait le tour, face à la ville. */
let tourDeRoue: { debut: number; fini: () => void } | null = null;
const DUREE_TOUR = 28;
function faireUnTour(): Promise<void> {
  occupe = true;
  commandes.actives = false;
  ui.interagir.hidden = true;
  const descendre = document.body.appendChild(Object.assign(document.createElement('button'), { className: 'bouton-secondaire descendre-roue', type: 'button', textContent: 'Descendre' }));
  return new Promise((ok) => {
    const fini = (): void => {
      tourDeRoue = null;
      descendre.remove();
      occupe = false;
      commandes.actives = true;
      ok();
    };
    descendre.addEventListener('click', fini);
    tourDeRoue = { debut: horloge.elapsedTime, fini };
  });
}
function cameraDuTour(t: number): void {
  if (!tourDeRoue || boiteRoue.isEmpty()) return;
  const u = (t - tourDeRoue.debut) / DUREE_TOUR;
  if (u >= 1) return tourDeRoue.fini();
  const taille = boiteRoue.getSize(new THREE.Vector3());
  const centre = boiteRoue.getCenter(new THREE.Vector3());
  const r = taille.y * 0.42;
  // La roue tourne dans le plan où elle est la plus large.
  const a = u * Math.PI * 2;
  const horizontal = taille.x > taille.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const p = centre.clone().addScaledVector(horizontal, Math.sin(a) * r);
  p.y = centre.y - Math.cos(a) * r + 0.5;
  // Un peu devant la roue, côté ville, pour ne pas voir l'intérieur de la nacelle ; on regarde la
  // ville (la place est en 0, 0).
  const versVille = new THREE.Vector3(-centre.x, 0, -centre.z).normalize();
  const devant = taille.x > taille.z ? new THREE.Vector3(0, 0, Math.sign(versVille.z) || 1) : new THREE.Vector3(Math.sign(versVille.x) || 1, 0, 0);
  p.addScaledVector(devant, 1.6);
  camera.position.copy(p);
  camera.lookAt(p.x + versVille.x * 40, p.y * 0.35, p.z + versVille.z * 40);
}

// Les meubles gagnés, devant la maison, de part et d'autre de l'allée.
const PLACES_MEUBLES = [
  { x: -3.6, z: 6, cap: 0.5 },
  { x: 3.6, z: 6, cap: -0.5 },
  { x: -5.8, z: 3.6, cap: 1.2 },
  { x: 5.8, z: 3.6, cap: -1.2 },
  { x: -3.2, z: 8.8, cap: 0.3 },
  { x: 3.2, z: 8.8, cap: -0.3 },
].map((p) => ({ x: LIEUX.maison.x + p.x, z: LIEUX.maison.z + p.z, cap: p.cap }));
async function poserMeuble(id: string): Promise<void> {
  const rang = etat.meubles.indexOf(id);
  const place = PLACES_MEUBLES[rang];
  const m = meubles.meubles.find((x) => x.id === id);
  const g = await modele(id);
  if (!place || !m || !g) return;
  poser(g.scene, 'y', m.hauteur, place.x, place.z, place.cap);
  ville.add(g.scene);
  obstacles.push({ x: place.x, z: place.z, r: 0.7 });
  if (qualite === 'haute') ombrer(g.scene);
}

// --- Le personnage de l'enfant ------------------------------------------------------------------
interface Heros {
  racine: THREE.Object3D;
  /** pas : 0 arrêté, 1 à fond. */
  animer(temps: number, pas: number, salut: number): void;
}

/** Chaque tenue complète est un modèle Tripo (content/modeles/modeles.json, champ « tenue »).
 *  On prend celui dont la tenue correspond le mieux à ce que l'enfant porte ; sinon « enfant ».
 *  La ville n'a pas encore sa garde-robe (tranche 1C) : c'est la tenue de départ, ou
 *  « ?essai&porte=chapeau-casquette,objet-sac » pour essayer. */
function modeleDeLaTenue(): string {
  const porte: Record<string, string> = { ...garderobeNeuve().porte };
  const essai = adresse.has('essai') ? adresse.get('porte') : null;
  if (essai !== null) {
    for (const champ of Object.keys(porte)) if (champ !== 'haut' && champ !== 'chaussures') porte[champ] = 'rien';
    for (const id of essai.split(',')) {
      const champ = id.split('-')[0] ?? '';
      if (champ in porte) porte[champ] = id;
    }
  }
  let choisi = 'enfant';
  let meilleur = 0;
  for (const m of catalogue.modeles as Array<{ id: string; tenue?: Record<string, string> }>) {
    const tenue = Object.entries(m.tenue ?? {});
    if (tenue.length > meilleur && tenue.every(([champ, id]) => porte[champ] === id)) {
      choisi = m.id;
      meilleur = tenue.length;
    }
  }
  return choisi;
}

/** Le personnage modélisé par Tripo : il attend, marche ou court selon la poussée du joystick. */
function herosTripo(g: GLTF): Heros {
  const racine = new THREE.Group();
  const corps = clonerAnime(g.scene);
  poser(corps, 'y', 1.75, 0, 0, 0);
  racine.add(corps);
  ville.add(racine);
  const m = new THREE.AnimationMixer(corps);
  const clip = (nom: RegExp): THREE.AnimationAction | null => {
    const c = g.animations.find((a) => nom.test(a.name));
    return c ? m.clipAction(c) : null;
  };
  const actions = { attente: clip(/idle/i), marche: clip(/walk/i), course: clip(/run/i) };
  let enCours: THREE.AnimationAction | null = actions.attente;
  enCours?.play();
  let avant = 0;
  return {
    racine,
    animer(temps, pas) {
      const dt = Math.min(0.1, Math.max(0, temps - avant));
      avant = temps;
      const voulue = pas < 0.08 ? actions.attente : pas < 0.75 || !actions.course ? actions.marche : actions.course;
      if (voulue && voulue !== enCours) {
        voulue.reset().play();
        if (enCours) voulue.crossFadeFrom(enCours, 0.25, false);
        enCours = voulue;
      }
      // Les pieds suivent la vitesse : pas de glissade quand on avance doucement.
      if (actions.marche) actions.marche.timeScale = 0.6 + pas * 0.7;
      m.update(dt);
    },
  };
}

const glbEnfant = (await modele(modeleDeLaTenue())) ?? (await modele('enfant'));
const heros: Heros = glbEnfant
  ? herosTripo(glbEnfant)
  : creerPersonne(atelier, ville, {
      maillot: 'maillot',
      pantalon: 0xc79a6b,
      cheveux: 0xe08a3c,
      tenue: 0,
      objets: true,
      accessoires: garderobeNeuve().porte,
      peau: 0xfadcc6,
    });
const etat = await chargerEtat();
heros.racine.position.set(etat.position.x, 0.06, etat.position.z);
heros.racine.rotation.y = etat.position.cap;

let animerHerbe: (t: number) => void = () => {};
if (qualite === 'haute') {
  const libre = (x: number, z: number): boolean => !occupeMonde(x, z, ABORDS);
  const herbe = semerGazon(libre, 20000, { x: 42, zMin: -45, zMax: 40 });
  const loin = semerGazon((x, z) => (Math.abs(x) > 42 || z < -45 || z > 40) && libre(x, z), 9000, { x: BORDS.xMax, zMin: BORDS.zMin, zMax: BORDS.zMax });
  herbe.racine.add(loin.racine);
  ville.add(herbe.racine);
  animerHerbe = (t) => {
    herbe.animer(t);
    loin.animer(t);
  };
}

// --- Le dialogue : l'enfant lit lui-même, et peut toucher un mot pour l'entendre --------------
const ui = {
  interagir: el<HTMLButtonElement>('interagir'),
  interagirMot: document.querySelector<HTMLSpanElement>('#interagir .interagir-mot') as HTMLSpanElement,
  interagirTexte: el<HTMLSpanElement>('interagir-texte'),
  dialogue: el<HTMLElement>('dialogue'),
  nom: el<HTMLParagraphElement>('dialogue-nom'),
  texte: el<HTMLParagraphElement>('dialogue-texte'),
  fermer: el<HTMLButtonElement>('dialogue-fermer'),
};
const commandes = creerCommandes(el('zone-joystick'), el('joystick'), el('zone-regard'));
commandes.actives = true;

let proche: PointInteret | null = null;
let enDialogue: Habitant | null = null;
let occupe = false;

function ouvrirDialogue(h: Habitant): void {
  const d = dialogues.dialogues.find((x) => x.id === h.dialogue);
  if (!d) return;
  enDialogue = h;
  commandes.actives = false;
  ui.interagir.hidden = true;
  ui.nom.textContent = h.nom;
  ui.texte.replaceChildren(
    ...decouper(d.texte).map((m) => {
      if (!m.mot) return document.createTextNode(m.texte);
      const s = document.createElement('span');
      s.className = 'mot';
      s.textContent = m.texte;
      s.addEventListener('click', () => {
        dire(aEntendre(m.texte));
        s.classList.add('entendu');
        document.dispatchEvent(new CustomEvent('mot-touche', { detail: m.texte }));
      });
      return s;
    }),
  );
  ui.dialogue.hidden = false;
}

ui.fermer.addEventListener('click', () => {
  if (enDialogue && !etat.lus.includes(enDialogue.dialogue)) etat.lus.push(enDialogue.dialogue);
  enDialogue = null;
  ui.dialogue.hidden = true;
  commandes.actives = true;
  void sauverEtat(etat);
});
ui.interagir.addEventListener('click', () => {
  proche?.action();
});

installerDictee({
  atelier,
  ville,
  obstacles,
  points,
  dictee: () => etat.dictee,
  changer: (d) => {
    etat.dictee = d;
    void sauverEtat(etat);
    majSeance();
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
});

installerDemandes({
  etat: () => etat,
  changer: (e) => {
    Object.assign(etat, e);
    void sauverEtat(etat);
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  noms: { 'forain-chamboule': 'Le forain', epiciere: epicerie.textes.nom },
  poserMeuble: (id) => void poserMeuble(id),
  apresUnChangement: rafraichirHud,
});

installerJardin({
  points,
  etat: () => etat,
  changer: (e) => {
    Object.assign(etat, e);
    void sauverEtat(etat);
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  apresUnChangement: rafraichirHud,
  places: PLACES_PARCELLES,
  dessiner: (i, e, mur) => void dessinerParcelle(i, e, mur),
});

installerRiviere({
  points,
  etat: () => etat,
  changer: (e) => {
    Object.assign(etat, e);
    void sauverEtat(etat);
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  apresUnChangement: rafraichirHud,
  ponton: PONTON,
  buissons: BUISSONS_MURES,
  muresSurBuisson: montrerMures,
});

installerPoste({
  points,
  etat: () => etat,
  changer: (e) => {
    Object.assign(etat, e);
    void sauverEtat(etat);
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  apresUnChangement: rafraichirHud,
  postiere: POSTIERE,
});

installerProjets({
  points,
  etat: () => etat,
  changer: (e) => {
    Object.assign(etat, e);
    void sauverEtat(etat);
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  apresUnChangement: rafraichirHud,
  lieux: LIEUX_PROJETS,
  montrerChantier: (id) => void montrerChantier(id),
  montrerLieu: (id) => void montrerLieu(id),
  annoncer: annoncerEnVille,
});

// La fête foraine : pas d'euros ; l'attraction en construction (voir attraction.ts). Le chantier
// commence à la première visite.
{
  const jour = aujourdhuiVille();
  if (etat.attraction.enCours && !etat.attraction.debut) {
    etat.attraction = { ...etat.attraction, debut: jour };
    void sauverEtat(etat);
  }
}
points.push({
  verbe: 'Monter',
  nom: 'La grande roue',
  x: FETE.roue.x,
  z: FETE.roue.z + 6.5,
  visible: roueConstruite,
  action: () => void faireUnTour(),
});
void installerFete({
  points,
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  forainAttraction: FORAIN_ROUE,
  etat: () => etat.attraction,
  changer: (e) => {
    etat.attraction = e;
    void sauverEtat(etat);
  },
  majFete,
  suivante: (id) => {
    const i = attractions.attractions.findIndex((a) => a.id === id);
    return attractions.attractions[i + 1]?.id ?? null;
  },
  stands: Object.fromEntries(Object.entries(FETE.stands).map(([id, s]) => [id, devantLeStand(s)])) as unknown as Record<IdStand, { x: number; z: number }>,
  maneges: Object.fromEntries(Object.entries(FETE.maneges).map(([id, m]) => [id, devantLeStand(m, id === 'autos' ? 5.6 : 4.6)])) as unknown as Record<IdManege, { x: number; z: number }>,
});

installerEpicerie({
  points,
  etat: () => etat,
  changer: (e) => {
    Object.assign(etat, e);
    void sauverEtat(etat);
  },
  occupe: (oui) => {
    occupe = oui;
    commandes.actives = !oui;
    ui.interagir.hidden = true;
  },
  epiciere: EPICIERE,
  pommier: POMMIER,
  pommesSurLArbre: montrerPommes,
});
majSeance();

// --- La promenade ------------------------------------------------------------------------------
const VITESSE = 4.2;
function promenade(dt: number): number {
  const h = heros.racine;
  const avantX = h.position.x;
  const avantZ = h.position.z;
  const force = Math.min(1, Math.hypot(commandes.x, commandes.y));
  if (force > 0) {
    const { avant, droite } = suivi.axes();
    const n = Math.max(1, Math.hypot(commandes.x, commandes.y));
    const mx = (droite.x * commandes.x + avant.x * commandes.y) / n;
    const mz = (droite.z * commandes.x + avant.z * commandes.y) / n;
    h.position.x += mx * VITESSE * dt;
    h.position.z += mz * VITESSE * dt;
    h.rotation.y = Math.atan2(mx, mz);
  }
  // On ne traverse ni la fontaine, ni la maison, ni les habitants ; et on reste en ville.
  for (const o of obstacles) {
    const dx = h.position.x - o.x;
    const dz = h.position.z - o.z;
    const d = Math.hypot(dx, dz);
    const min = o.r + 0.45;
    if (d < min && d > 1e-6) {
      h.position.x = o.x + (dx / d) * min;
      h.position.z = o.z + (dz / d) * min;
    }
  }
  // Pas dans l'eau (sauf sur le pont), et pas au-delà des bords du monde.
  if (dansLEau(h.position.x, h.position.z)) {
    h.position.x = avantX;
    h.position.z = avantZ;
  }
  h.position.x = Math.max(BORDS.xMin, Math.min(BORDS.xMax, h.position.x));
  h.position.z = Math.max(BORDS.zMin, Math.min(BORDS.zMax, h.position.z));
  h.position.y = sol(h.position.x, h.position.z);
  // Quelque chose tout près (un habitant, le tableau…) : le bouton apparaît.
  let meilleur: PointInteret | null = null;
  let distance = 3.4;
  if (!enDialogue && !occupe) {
    for (const p of points) {
      if (p.visible && !p.visible()) continue;
      const d = Math.hypot(p.x - h.position.x, p.z - h.position.z);
      if (d < distance) {
        distance = d;
        meilleur = p;
      }
    }
  }
  proche = meilleur;
  ui.interagir.hidden = !proche;
  if (proche) {
    ui.interagirMot.textContent = proche.verbe;
    ui.interagirTexte.textContent = proche.nom;
  }
  return force;
}

// La musique suit l'endroit : la ville, ou la fête dès qu'on approche du portail. On ne la change
// pas pendant un exercice (le stand a la sienne). À la fête, de temps en temps, un bruit lointain.
let prochainControle = 0;
let prochainBruit = 0;
const BRUITS_FETE = ['fete-cloche', 'fete-rires', 'fete-popcorn', 'fete-orgue'] as const;
function sonDeLEndroit(maintenant: number): void {
  if (maintenant < prochainControle || occupe || tourDeRoue) return;
  prochainControle = maintenant + 1500;
  const p = heros.racine.position;
  const aLaFete = dansLaFete(p.x, p.z, 9);
  const voulue: Piste = aLaFete ? 'promenade' : 'ville';
  if (musique.actuelle() !== voulue) musique.demarrer(voulue);
  if (!aLaFete) return;
  if (!prochainBruit) prochainBruit = maintenant + 6000;
  if (maintenant > prochainBruit) {
    prochainBruit = maintenant + 14000 + Math.random() * 20000;
    bruitage.son(BRUITS_FETE[Math.floor(Math.random() * BRUITS_FETE.length)] ?? 'fete-rires', 0.35);
  }
}

// La position est gardée de temps en temps, et quand l'enfant quitte l'écran.
let dernierEnregistrement = 0;
function retenirPosition(maintenant: number, forcer = false): void {
  if (!forcer && maintenant - dernierEnregistrement < 3000) return;
  dernierEnregistrement = maintenant;
  const p = heros.racine.position;
  etat.position = { x: p.x, z: p.z, cap: heros.racine.rotation.y };
  void sauverEtat(etat);
}
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') retenirPosition(performance.now(), true);
});

// « ?fps » : compteur d'images par seconde, pour mesurer sur la tablette.
const boiteFps = adresse.has('fps') ? document.body.appendChild(Object.assign(document.createElement('p'), { className: 'compteur-fps' })) : null;
let images = 0;
let debutFps = performance.now();

const horloge = new THREE.Clock();
let imagesRendues = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, horloge.getDelta());
  const t = horloge.elapsedTime;
  const pas = promenade(dt);
  heros.animer(t, pas, 0);
  for (const m of melangeurs) m.update(dt);
  monde.animer(t);
  animerHerbe(t);
  animerRoue(dt);
  const pose = suivi.pose(heros.racine, dt);
  camera.position.copy(pose.position);
  camera.lookAt(pose.cible);
  if (vueFixe) {
    camera.position.set(vueFixe[0], vueFixe[1], vueFixe[2]);
    camera.lookAt(vueFixe[3], vueFixe[4], vueFixe[5]);
  }
  if (grosPlan) {
    // Essais seulement : la caméra face au héros, à hauteur de tête.
    const h = heros.racine;
    const a = h.rotation.y + grosPlan.angle;
    camera.position.set(h.position.x + Math.sin(a) * 3.2, 1.6, h.position.z + Math.cos(a) * 3.2);
    camera.lookAt(h.position.x, 1.05, h.position.z);
  }
  cameraDuTour(t);
  if (Math.abs(camera.fov - pose.champ) > 0.05) {
    camera.fov = pose.champ;
    camera.updateProjectionMatrix();
  }
  // Les ombres du décor ne bougent pas : recalculées une image sur trois, comme dans le jeu.
  if (qualite === 'haute') renderer.shadowMap.needsUpdate = imagesRendues++ % 3 === 0;
  renderer.render(scene, camera);
  if (pas > 0) retenirPosition(performance.now());
  sonDeLEndroit(performance.now());
  if (boiteFps) {
    images++;
    const ecoule = performance.now() - debutFps;
    if (ecoule > 1000) {
      boiteFps.textContent = `${Math.round((images * 1000) / ecoule)} i/s · ${renderer.info.render.calls} appels · ${Math.round(renderer.info.render.triangles / 1000)} k triangles`;
      document.body.dataset.ips = String((images * 1000) / ecoule);
      images = 0;
      debutFps = performance.now();
    }
  }
});

await peupler();
document.body.dataset.pret = '1';

// L'appli MiniVille s'ouvre ici : plein écran au premier toucher, et mise à jour proposée
// seulement quand l'enfant se promène (jamais pendant un exercice ou un dialogue).
surveillerModeApp();
// Le son ne peut démarrer qu'après un toucher (règle des navigateurs).
addEventListener('pointerdown', demarrerSon, { capture: true });
if (import.meta.env.PROD) surveillerMiseAJour(() => !occupe && !enDialogue);

// « ?essai » : placer le personnage d'un coup (essais et captures).
if (adresse.has('essai')) {
  Object.assign(window, {
    essai: {
      placer(x: number, z: number): void {
        heros.racine.position.set(x, 0.06, z);
      },
      /** Plan rapproché sur le héros, vu sous cet angle (0 : de face), ou null pour revenir. */
      gros(angle: number | null): void {
        grosPlan = angle === null ? null : { angle };
      },
      vue(...v: number[]): void {
        vueFixe = v.length === 6 ? (v as [number, number, number, number, number, number]) : null;
      },
      grandDefi: essaiGrandDefi,
      tour: () => void faireUnTour(),
    },
  });
}
