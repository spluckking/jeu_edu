// Point d'entrée : la scène, la sauvegarde, et le déroulé commun des stands de révision.

import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './style.css';
import * as THREE from 'three';
import { chargerContenus, type Element, type TypeContenu } from './contenus/contenus.ts';
import { jourDe, type Jour } from './memoire/jours.ts';
import {
  avancer,
  elementEnCours,
  enregistrer,
  estRattrapage,
  etatNeuf,
  mancheFinie,
  nouvelleManche,
  revisionsDuJour,
  type ElementSuivi,
  type Manche,
  type Revisions,
} from './memoire/moteur.ts';
import { chamboule } from './stands/chamboule.ts';
import { confiserie } from './stands/confiserie.ts';
import type { JeuDeStand } from './stands/stand.ts';
import { creerDefis } from './stands/defis.ts';
import { creerHorloge } from './stands/horloge.ts';
import { demanderPrenom } from './ui/prenom.ts';
import { exerciceDuJour, jouerPause, pauseDue } from './detente/pause.ts';
import { chargerFeuilleton, episodeDuJour, type Episode } from './histoire/feuilleton.ts';
import { lireEpisode } from './histoire/episode.ts';
import { ajusterNiveau } from './exercices/generateur.ts';
import {
  BONUS_SEANCE,
  choisirLot,
  DEFIS_PAR_SEANCE,
  HEURES_PAR_SEANCE,
  journeeNeuve,
  lot,
  LOTS,
  peutConstruire,
  PIECES_ROUE,
  porter,
  PRIX_PIECE,
  semaineDe,
  TICKETS_PAR_MANCHE,
  TICKETS_HISTOIRE,
  type Garderobe,
  type Journee,
} from './recompenses/recompenses.ts';
import { ouvrirVitrine } from './ui/vitrine.ts';
import { musique } from './son/musique.ts';
import { jouerIntroduction } from './histoire/introduction.ts';
import { chargerHistoires, METIERS, PROPOSITIONS } from './histoire/lecture.ts';
import { suiviNeuf, type Sauvegarde } from './sauvegarde/format.ts';
import { ecrireSauvegarde, lireSauvegarde } from './sauvegarde/stockage.ts';
import { construireFete, type IdStand, type PoseCamera, type Stand } from './scene/fete.ts';
import { basculerMuet, bruitage, demarrerSon, estMuet } from './son/bruitages.ts';
import { dire } from './son/voix.ts';

function el<T extends HTMLElement>(id: string): T {
  const trouve = document.getElementById(id);
  if (!trouve) throw new Error(`#${id} introuvable`);
  return trouve as T;
}

const ui = {
  canvas: el<HTMLCanvasElement>('scene'),
  bulle: el<HTMLParagraphElement>('bulle'),
  son: el<HTMLButtonElement>('son'),
  stand: el<HTMLElement>('stand'),
  retour: el<HTMLButtonElement>('retour'),
  mancheNom: el<HTMLParagraphElement>('manche-nom'),
  progres: el<HTMLOListElement>('progres'),
  carte: el<HTMLDivElement>('carte-manche'),
  carteTitre: el<HTMLParagraphElement>('carte-titre'),
  carteTexte: el<HTMLParagraphElement>('carte-texte'),
  carteBouton: el<HTMLButtonElement>('carte-bouton'),
  carteRetour: el<HTMLButtonElement>('carte-retour'),
  exercice: el<HTMLDivElement>('exercice'),
  questionLigne: el<HTMLDivElement>('question').parentElement as HTMLDivElement,
  question: el<HTMLParagraphElement>('question'),
  ecouter: el<HTMLButtonElement>('ecouter'),
  boutonIndice: el<HTMLButtonElement>('bouton-indice'),
  indice: el<HTMLParagraphElement>('indice'),
  correction: el<HTMLParagraphElement>('correction'),
  clavier: el<HTMLDivElement>('clavier'),
  continuer: el<HTMLButtonElement>('continuer'),
  ticketsNombre: el<HTMLSpanElement>('tickets-nombre'),
  tickets: el<HTMLParagraphElement>('tickets'),
  calendrier: el<HTMLOListElement>('calendrier'),
  garderobe: el<HTMLButtonElement>('garderobe'),
  histoire: el<HTMLButtonElement>('histoire'),
  construction: el<HTMLDivElement>('construction'),
  constructionTexte: el<HTMLParagraphElement>('construction-texte'),
  constructionPieces: el<HTMLOListElement>('construction-pieces'),
  construire: el<HTMLButtonElement>('construire'),
  entree: el<HTMLDivElement>('entree'),
  entrer: el<HTMLButtonElement>('entrer'),
};

// --- Le jour ---------------------------------------------------------------------
// « ?jour=AAAA-MM-JJ » dans l'adresse simule un autre jour (pour les essais du parent).
function aujourdhui(): Jour {
  const force = new URLSearchParams(location.search).get('jour');
  return force && /^\d{4}-\d{2}-\d{2}$/.test(force) ? force : jourDe(new Date());
}

// --- Contenus et sauvegarde ----------------------------------------------------------
const contenus = chargerContenus();
const elements = new Map<string, Element>();
for (const contenu of contenus) for (const e of contenu.elements) elements.set(e.id, e);

let sauvegarde: Sauvegarde = await lireSauvegarde();
let ecriture: Promise<void> = Promise.resolve();
function sauver(): void {
  const copie = structuredClone(sauvegarde);
  ecriture = ecriture.then(() => ecrireSauvegarde(copie)).catch((erreur: unknown) => console.error(erreur));
}

// Un contenu arrive le jour où la tablette le voit pour la première fois.
for (const contenu of contenus) sauvegarde.arrivees[contenu.id] ??= aujourdhui();
sauver();

/** Les éléments suivis d'un type de contenu (chaque stand a le sien). */
function suivis(type: TypeContenu): ElementSuivi[] {
  const arrivees = new Map<string, Jour[]>();
  for (const contenu of contenus) {
    if (contenu.type !== type) continue;
    const jour = sauvegarde.arrivees[contenu.id];
    if (!jour) continue;
    for (const e of contenu.elements) arrivees.set(e.id, [...(arrivees.get(e.id) ?? []), jour]);
  }
  return [...arrivees].map(([id, jours]) => ({ id, arrivees: jours }));
}

function revisions(jeu: JeuDeStand): Revisions {
  return revisionsDuJour(aujourdhui(), suivis(jeu.type), sauvegarde.etats);
}

// --- La séance du jour ----------------------------------------------------------------------
function journee(): Journee {
  return (sauvegarde.journees[aujourdhui()] ??= journeeNeuve());
}
/**
 * Ce qui reste à faire aujourd'hui dans un stand d'exercices fabriqués (défis, horloge),
 * ou null pour un stand de révision (il suit le moteur de mémoire).
 */
function restants(jeu: JeuDeStand): number | null {
  if (jeu.type === 'defi') return Math.max(0, DEFIS_PAR_SEANCE - journee().defis);
  if (jeu.type === 'heure') return Math.max(0, HEURES_PAR_SEANCE - (journee().heures ?? 0));
  return null;
}

// --- Le feuilleton --------------------------------------------------------------------------
// Seules les semaines validées par le parent arrivent ; « ?feuilleton-essai » montre aussi
// celles qui attendent (pour que le parent les lise sur la tablette avant de valider).
const feuilleton = chargerFeuilleton().map((s) =>
  new URLSearchParams(location.search).has('feuilleton-essai') ? { ...s, valide: true } : s,
);
const episodesValides = feuilleton.filter((s) => s.valide).flatMap((s) => s.episodes);

/** L'épisode à lire aujourd'hui, ou null s'il a déjà été lu (ou s'il n'y en a plus). */
function histoireDuJour(): Episode | null {
  if (journee().histoire) return null;
  const lus = new Set(Object.entries(sauvegarde.lectures).filter(([, s]) => s.reussie).map(([id]) => id));
  return episodeDuJour(feuilleton, lus);
}

const standHorloge = creerHorloge({ niveau: () => sauvegarde.niveauHorloge.niveau });
for (let i = 0; i < HEURES_PAR_SEANCE; i++) elements.set(`heure-${i}`, { type: 'heure', id: `heure-${i}` });

const defis = creerDefis({
  niveau: () => sauvegarde.niveauDefis.niveau,
  gens: () => [
    { nom: nom('chamboule'), feminin: false, objets: 'ballons' },
    { nom: nom('confiserie'), feminin: true, objets: 'bonbons' },
    { nom: nom('chantier'), feminin: false, objets: 'boulons' },
  ],
});
// Les places des défis : l'exercice est fabriqué au moment de le poser.
for (let i = 0; i < DEFIS_PAR_SEANCE; i++) elements.set(`defi-${i}`, { type: 'defi', id: `defi-${i}` });

const JEUX: JeuDeStand[] = [chamboule, confiserie, defis, standHorloge];
/** Le stand a encore quelque chose à faire dans la séance du jour : il est allumé. */
const aReviser = (jeu: JeuDeStand): boolean => {
  const reste = restants(jeu);
  if (reste !== null) return reste > 0;
  const r = revisions(jeu);
  return r.semaine.length + r.memoire.length > 0;
};

// --- La scène ------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
scene.background = (() => {
  const toile = document.createElement('canvas');
  toile.width = 2;
  toile.height = 256;
  const c = toile.getContext('2d');
  if (c) {
    const degrade = c.createLinearGradient(0, 0, 0, 256);
    degrade.addColorStop(0, '#3fa0ff');
    degrade.addColorStop(0.62, '#cfeeff');
    degrade.addColorStop(1, '#cfeeff');
    c.fillStyle = degrade;
    c.fillRect(0, 0, 2, 256);
  }
  const texture = new THREE.CanvasTexture(toile);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
})();
scene.fog = new THREE.Fog(0xcfeeff, 34, 82);
scene.add(new THREE.HemisphereLight(0xdff1ff, 0xffe2b8, 1.7));
const soleil = new THREE.DirectionalLight(0xfff2d8, 2.0);
soleil.position.set(6, 12, 9);
scene.add(soleil);

const fete = construireFete(0);
scene.add(fete.racine);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 250);
const vise = new THREE.Vector3();
function poser(pose: PoseCamera): void {
  camera.position.copy(pose.position);
  vise.copy(pose.cible);
  camera.lookAt(vise);
}
poser(fete.vues.place);

let trajet: { de: PoseCamera; vers: PoseCamera; debut: number; duree: number } | null = null;
let horloge = 0;
function deplacerCamera(vers: PoseCamera, duree = 1.1): void {
  trajet = { de: { position: camera.position.clone(), cible: vise.clone() }, vers, debut: horloge, duree };
}
const adoucir = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function redimensionner(): void {
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(largeur, hauteur, false);
  camera.aspect = largeur / hauteur;
  camera.fov = camera.aspect < 1 ? 70 : 45;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redimensionner);
redimensionner();

const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
let precedent = performance.now();
renderer.setAnimationLoop((maintenant) => {
  const delta = Math.min(0.05, (maintenant - precedent) / 1000);
  precedent = maintenant;
  horloge += delta;
  if (trajet) {
    const t = Math.min(1, (horloge - trajet.debut) / trajet.duree);
    const u = mouvementReduit.matches ? 1 : adoucir(t);
    camera.position.lerpVectors(trajet.de.position, trajet.vers.position, u);
    vise.lerpVectors(trajet.de.cible, trajet.vers.cible, u);
    camera.lookAt(vise);
    if (t >= 1) trajet = null;
  }
  fete.mettreAJour(mouvementReduit.matches ? 0 : horloge, delta);
  renderer.render(scene, camera);
  document.body.dataset.appels = String(renderer.info.render.calls);
});

// --- La bulle ----------------------------------------------------------------------
let minuterieBulle = 0;
function parler(texte: string, afficher = true): void {
  dire(texte);
  window.clearTimeout(minuterieBulle);
  if (!afficher) return;
  ui.bulle.textContent = texte;
  ui.bulle.hidden = false;
  // Relance l'animation d'apparition.
  ui.bulle.style.animation = 'none';
  void ui.bulle.offsetWidth;
  ui.bulle.style.animation = '';
  minuterieBulle = window.setTimeout(() => (ui.bulle.hidden = true), 6000);
}

/** Le prénom que l'enfant a donné à ce forain (ou le premier proposé, avant l'introduction). */
function nom(id: IdStand): string {
  const donne = sauvegarde.forains[id];
  if (donne) return donne;
  // Un forain arrivé après l'introduction n'a pas encore de prénom : on dit son métier.
  return id in PRESENTATIONS ? METIERS[id] : (PROPOSITIONS[id][0] ?? METIERS[id]);
}

const LIEU: Record<IdStand, string> = {
  chamboule: 'au chamboule-tout',
  confiserie: 'à la confiserie',
  chantier: 'au chantier',
  horloge: 'à l’horloge',
};

function messageDeLaPlace(): string {
  const allumes = JEUX.filter(aReviser).map((j) => j.id);
  const [premier] = allumes;
  if (!premier && histoireDuJour()) return 'Ton histoire du jour t’attend : touche le livre en bas !';
  if (!premier) return 'Séance finie pour aujourd’hui. Tu peux jouer librement !';
  if (allumes.length === 1) return `Va ${LIEU[premier]}, ${nom(premier)} t’attend !`;
  const noms = allumes.map(nom);
  const phrase = `${noms.slice(0, -1).join(', ')} et ${noms.at(-1) ?? ''} t’attendent : leurs stands brillent !`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function mettreAJourPlace(): void {
  for (const jeu of JEUX) fete.allumer(jeu.id, aReviser(jeu));
  // Le travail du jour est compté une fois, à la première ouverture : il fixe la pause calme.
  const j = journee();
  if (j.total === undefined) {
    j.total = JEUX.reduce(
      (somme, jeu) => {
        const reste = restants(jeu);
        if (reste !== null) return somme + reste;
        const r = revisions(jeu);
        return somme + r.semaine.length + r.memoire.length;
      },
      histoireDuJour() ? 1 : 0,
    );
    sauver();
  }
  majHud();
}

ui.histoire.addEventListener('click', async () => {
  if (dansUnStand || enCinema || enMarche) return;
  bruitage.touche();
  const episode = histoireDuJour();
  if (!episode) {
    parler('Pas de nouvel épisode aujourd’hui. La suite demain !');
    return;
  }
  ui.bulle.hidden = true;
  enCinema = true;
  const numero = episodesValides.findIndex((e) => e.id === episode.id) + 1;
  const { erreurs } = await lireEpisode(episode, numero, sauvegarde.forains, `Tu gagnes ${TICKETS_HISTOIRE} tickets.`);
  enCinema = false;
  sauvegarde.lectures[episode.id] = { lectures: 1, questions: 1 + erreurs, justes: erreurs === 0 ? 1 : 0, posees: [], reussie: true };
  const j = journee();
  j.histoire = episode.id;
  j.faites = (j.faites ?? 0) + 1;
  gagnerTickets(TICKETS_HISTOIRE);
  mettreAJourPlace();
  await finDeSeance();
  parler(messageDeLaPlace());
});

// --- Tickets, calendrier, lots ---------------------------------------------------------------
const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function majHud(): void {
  ui.ticketsNombre.textContent = String(sauvegarde.tickets);
  // Le livre n'apparaît qu'une fois des épisodes validés ; il clignote tant que celui du jour attend.
  ui.histoire.hidden = episodesValides.length === 0;
  ui.histoire.classList.toggle('a-lire', histoireDuJour() !== null);
  const jour = aujourdhui();
  ui.calendrier.replaceChildren(
    ...semaineDe(jour).map((j, i) => {
      const li = document.createElement('li');
      li.textContent = JOURS_COURTS[i] ?? '';
      if (sauvegarde.journees[j]?.finie) li.classList.add('fait');
      if (j === jour) li.classList.add('aujourdhui');
      return li;
    }),
  );
}

function gagnerTickets(nombre: number): void {
  sauvegarde.tickets += nombre;
  journee().ticketsGagnes += nombre;
  sauver();
  majHud();
  ui.tickets.classList.remove('gagne');
  void ui.tickets.offsetWidth;
  ui.tickets.classList.add('gagne');
}

function habiller(g: Garderobe): void {
  const tenue = lot(g.porte.tenue)?.valeur ?? 0;
  const maillot = lot(g.porte.maillot)?.valeur ?? 0xff5a6e;
  fete.habiller(tenue, maillot);
}

/** Toutes les révisions et les défis du jour sont faits : bonus, puis un lot dans la vitrine. */
async function finDeSeance(): Promise<boolean> {
  const j = journee();
  if (j.finie || JEUX.some(aReviser) || histoireDuJour()) return false;
  j.finie = true;
  gagnerTickets(BONUS_SEANCE);
  bruitage.finDeManche();
  const reste = LOTS.some((l) => !sauvegarde.garderobe.possedes.includes(l.id));
  if (reste && !j.lotChoisi) {
    await ouvrirVitrine({
      titre: 'Séance finie, bravo !',
      texte: `Tu as gagné ${j.ticketsGagnes} tickets aujourd’hui. Choisis ton lot dans la vitrine.`,
      garderobe: sauvegarde.garderobe,
      mode: 'choisir',
      quandChoisi(id) {
        sauvegarde.garderobe = choisirLot(sauvegarde.garderobe, id);
        j.lotChoisi = true;
        sauver();
        habiller(sauvegarde.garderobe);
        return sauvegarde.garderobe;
      },
      fermer: 'Jouer librement',
    });
  }
  sauver();
  return true;
}

ui.garderobe.addEventListener('click', () => {
  if (dansUnStand || enCinema) return;
  bruitage.touche();
  void ouvrirVitrine({
    titre: 'Mes lots',
    texte: 'Touche un lot pour que ton personnage le porte.',
    garderobe: sauvegarde.garderobe,
    mode: 'porter',
    quandChoisi(id) {
      sauvegarde.garderobe = porter(sauvegarde.garderobe, id);
      sauver();
      habiller(sauvegarde.garderobe);
      return sauvegarde.garderobe;
    },
    fermer: 'Fermer',
  });
});

// --- La grande roue -------------------------------------------------------------------------
function majConstruction(): void {
  const pieces = sauvegarde.roue;
  ui.constructionPieces.replaceChildren(
    ...Array.from({ length: PIECES_ROUE }, (_, i) => {
      const li = document.createElement('li');
      if (i < pieces) li.className = 'faite';
      return li;
    }),
  );
  if (pieces >= PIECES_ROUE) {
    ui.constructionTexte.textContent = 'La grande roue est finie !';
    ui.construire.hidden = true;
    return;
  }
  ui.constructionTexte.textContent = `Grande roue : ${pieces} pièce${pieces > 1 ? 's' : ''} sur ${PIECES_ROUE}.`;
  ui.construire.hidden = false;
  ui.construire.textContent = `Construire une pièce : ${PRIX_PIECE} tickets`;
  ui.construire.disabled = !peutConstruire(sauvegarde.tickets, pieces);
}

ui.construire.addEventListener('click', () => {
  if (!peutConstruire(sauvegarde.tickets, sauvegarde.roue)) return;
  sauvegarde.tickets -= PRIX_PIECE;
  sauvegarde.roue += 1;
  sauver();
  fete.construireRoue(sauvegarde.roue, PIECES_ROUE);
  fete.saluerForain('chantier');
  bruitage.finDeManche();
  majHud();
  majConstruction();
  parler(
    sauvegarde.roue >= PIECES_ROUE
      ? `${nom('chantier')} : « La grande roue est finie ! Merci pour ton aide ! »`
      : `${nom('chantier')} : « Une pièce de plus, merci ! »`,
    false,
  );
});

fete.construireRoue(sauvegarde.roue, PIECES_ROUE);
habiller(sauvegarde.garderobe);
mettreAJourPlace();

// --- Toucher un stand ------------------------------------------------------------------
const rayon = new THREE.Raycaster();
let dansUnStand = false;
let enMarche = false;
let enCinema = false;
let appui: { x: number; y: number } | null = null;

ui.canvas.addEventListener('pointerdown', (e) => {
  appui = { x: e.clientX, y: e.clientY };
});
ui.canvas.addEventListener('pointerup', (e) => {
  if (!appui || Math.hypot(e.clientX - appui.x, e.clientY - appui.y) > 12) return;
  appui = null;
  if (dansUnStand || enMarche || enCinema) return;
  const pointeur = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  rayon.setFromCamera(pointeur, camera);
  fete.racine.updateMatrixWorld();
  const touche = rayon.intersectObjects(fete.stands.map((s) => s.zone), false)[0];
  const stand = fete.stands.find((s) => s.zone === touche?.object);
  if (stand) toucherStand(stand);
});

function toucherStand(stand: Stand): void {
  bruitage.touche();
  const jeu = JEUX.find((j) => j.id === stand.id);
  if (!jeu) {
    fete.saluerForain(stand.id);
    parler(`${nom('chantier')} : « Avec tes tickets, je construirai la grande roue ! »`);
    return;
  }
  enMarche = true;
  ui.bulle.hidden = true;
  void fete.allerAuStand(stand).then(() => {
    enMarche = false;
    ouvrirStand(jeu);
  });
}

// --- Le déroulé commun des stands de révision ----------------------------------------------
type TypeManche = 'semaine' | 'memoire' | 'libre' | 'defis';
const NOMS: Record<TypeManche, string> = { semaine: 'Cette semaine', memoire: 'Mémoire', libre: 'Pour le plaisir', defis: 'Défis du jour' };

let jeu: JeuDeStand = chamboule;
let manche: Manche | null = null;
let typeManche: TypeManche = 'libre';
let saisie = '';
let niveauIndice = 0;
let debutQuestion = 0;
let attente = false;

function prochaineManche(): TypeManche {
  const reste = restants(jeu);
  if (reste !== null) return reste > 0 ? 'defis' : 'libre';
  const r = revisions(jeu);
  if (r.semaine.length > 0) return 'semaine';
  if (r.memoire.length > 0) return 'memoire';
  return 'libre';
}

const PRESENTATIONS: Partial<Record<IdStand, string>> = {
  horloge: 'Une nouvelle foraine est arrivée : elle répare les horloges et connaît l’heure par cœur.',
};

async function ouvrirStand(nouveau: JeuDeStand): Promise<void> {
  jeu = nouveau;
  dansUnStand = true;
  fete.calme(true);
  deplacerCamera(fete.vues[jeu.id]);
  // Un forain arrivé après l'introduction reçoit son prénom à la première rencontre.
  const presentation = PRESENTATIONS[jeu.id];
  if (presentation && !sauvegarde.forains[jeu.id]) {
    fete.saluerForain(jeu.id);
    sauvegarde.forains[jeu.id] = await demanderPrenom(jeu.id, presentation);
    sauver();
  }
  bruitage.ouverture();
  ui.stand.classList.toggle('large', jeu.large);
  ui.stand.hidden = false;
  jeu.construireClavier(ui.clavier, toucher);
  montrerCarte(prochaineManche(), false);
}

function fermerStand(): void {
  musique.arreter();
  dansUnStand = false;
  manche = null;
  ui.stand.hidden = true;
  fete.calme(false);
  deplacerCamera(fete.vues.place);
  mettreAJourPlace();
  parler(messageDeLaPlace());
}

function elementsDuStand(): string[] {
  return [...elements.values()].filter((e) => e.type === jeu.type).map((e) => e.id);
}

/** gain : tickets gagnés avec la manche qui vient de finir. */
function montrerCarte(type: TypeManche, apresUneManche: boolean, gain = 0): void {
  typeManche = type;
  ui.exercice.hidden = true;
  ui.carte.hidden = false;
  ui.progres.replaceChildren();
  ui.mancheNom.textContent = '';
  const r = revisions(jeu);
  const nombre =
    type === 'defis' ? (restants(jeu) ?? 0) : Math.min(type === 'semaine' ? r.semaine.length : type === 'memoire' ? r.memoire.length : 8, 8);
  ui.carteTitre.textContent = apresUneManche ? 'Bravo !' : jeu.titre;
  const texte =
    type === 'libre'
      ? restants(jeu) !== null
        ? `C’est fait pour aujourd’hui. Tu peux t’entraîner pour le plaisir.`
        : 'Tout est révisé ici pour aujourd’hui. Tu peux jouer pour le plaisir.'
      : type === 'defis'
        ? jeu.type === 'heure'
          ? `${nom('horloge')} te pose ${jeu.unite(nombre)}.`
          : `${nom('chantier')} te lance ${jeu.unite(nombre)}.`
        : type === 'semaine'
          ? `Manche « Cette semaine » : ${jeu.unite(nombre)}.`
          : `Manche « Mémoire » : ${jeu.unite(nombre)} pour ne pas oublier.`;
  ui.carteTexte.textContent = gain > 0 ? `Tu gagnes ${gain} tickets ! ${texte}` : texte;
  ui.carteBouton.textContent = type === 'libre' ? 'Jouer' : 'C’est parti !';
  ui.carteBouton.disabled = elementsDuStand().length === 0;
  ui.carteRetour.hidden = !apresUneManche;
  // Au chantier, on construit aussi la grande roue avec les tickets.
  ui.construction.hidden = jeu.id !== 'chantier';
  if (jeu.id === 'chantier') majConstruction();
  const phrase = apresUneManche
    ? `Bravo, manche finie ! ${gain > 0 ? `Tu gagnes ${gain} tickets. ` : ''}${type === 'libre' ? 'Tu peux encore jouer pour le plaisir.' : 'Encore une manche ?'}`
    : texte;
  parler(phrase, false);
}

function lancerManche(): void {
  const r = revisions(jeu);
  const ids =
    typeManche === 'semaine'
      ? r.semaine
      : typeManche === 'memoire'
        ? r.memoire
        : typeManche === 'defis'
          ? elementsDuStand().slice(0, restants(jeu) ?? 0)
          : elementsDuStand();
  ui.construction.hidden = true;
  musique.demarrer();
  manche = nouvelleManche(ids, Math.random);
  ui.carte.hidden = true;
  ui.exercice.hidden = false;
  ui.mancheNom.textContent = NOMS[typeManche];
  ui.progres.replaceChildren(...Array.from({ length: manche.total }, () => document.createElement('li')));
  poserQuestion();
}

function elementCourant(): Element | undefined {
  const id = manche ? elementEnCours(manche) : undefined;
  return id ? elements.get(id) : undefined;
}

function poserQuestion(): void {
  const e = elementCourant();
  if (!manche || !e) return;
  jeu.preparer(e);
  saisie = '';
  niveauIndice = 0;
  attente = false;
  ui.questionLigne.className = 'question-ligne';
  ui.correction.hidden = true;
  ui.indice.hidden = true;
  ui.boutonIndice.hidden = jeu.indice(e, 1) === null;
  ui.boutonIndice.disabled = false;
  ui.continuer.hidden = true;
  ui.clavier.hidden = false;
  afficherQuestion('saisie');
  majProgres();
  debutQuestion = performance.now();
  jeu.ecouter(e);
}

function afficherQuestion(etat: 'saisie' | 'juste' | 'faux'): void {
  const e = elementCourant();
  if (!e) return;
  ui.question.replaceChildren(...jeu.afficher(e, saisie, etat));
  const valider = ui.clavier.querySelector<HTMLButtonElement>('.valider');
  if (valider) valider.disabled = saisie.trim() === '';
}

function majProgres(): void {
  if (!manche) return;
  // Une case remplie par élément réussi ; la suivante est celle en cours.
  const faits = manche.faits.length;
  const enCours = !mancheFinie(manche);
  ui.progres.querySelectorAll('li').forEach((li, i) => {
    li.className = i < faits ? 'fait' : i === faits && enCours ? 'courant' : '';
  });
}

function toucher(touche: string): void {
  if (attente || !manche) return;
  bruitage.touche();
  if (touche === 'effacer') saisie = saisie.slice(0, -1);
  else if (touche === 'valider') return valider();
  else saisie = jeu.saisir(saisie, touche);
  afficherQuestion('saisie');
}

function montrerIndice(): void {
  const e = elementCourant();
  if (!e || attente) return;
  const texte = jeu.indice(e, niveauIndice + 1);
  if (texte === null) return;
  bruitage.touche();
  niveauIndice++;
  ui.indice.textContent = texte;
  ui.indice.hidden = false;
  ui.boutonIndice.disabled = jeu.indice(e, niveauIndice + 1) === null;
}

function valider(): void {
  const e = elementCourant();
  if (!manche || !e || saisie.trim() === '') return;
  attente = true;
  const reponse = saisie.trim();
  const reussi = jeu.verifier(e, reponse);
  const aide = niveauIndice > 0;
  const duree = Math.round(performance.now() - debutQuestion);

  // Le travail fait aujourd'hui, pour savoir quand vient la pause calme.
  if (reussi && typeManche !== 'libre') journee().faites = (journee().faites ?? 0) + 1;
  if (jeu.type === 'defi') {
    // Un exercice généré n'est pas un élément à retenir : seul le niveau s'adapte.
    sauvegarde.niveauDefis = ajusterNiveau(sauvegarde.niveauDefis, reussi);
    if (reussi && typeManche === 'defis') journee().defis += 1;
  } else if (jeu.type === 'heure') {
    sauvegarde.niveauHorloge = ajusterNiveau(sauvegarde.niveauHorloge, reussi);
    if (reussi && typeManche === 'defis') journee().heures = (journee().heures ?? 0) + 1;
  } else if (typeManche !== 'libre') {
    sauvegarde.etats[e.id] = enregistrer(sauvegarde.etats[e.id] ?? etatNeuf(), {
      jour: aujourdhui(),
      reussi,
      aide,
      reponse,
      duree,
      prioritaire: typeManche === 'semaine',
      rattrapage: estRattrapage(manche, e.id),
    });
  }
  sauvegarde.journal.push({
    instant: new Date().toISOString(),
    stand: jeu.id,
    manche: typeManche,
    element: jeu.idExercice?.() ?? e.id,
    reponse,
    reussi,
    aide,
    duree,
  });
  sauver();
  ui.indice.hidden = true;
  ui.boutonIndice.hidden = true;

  if (reussi) {
    ui.questionLigne.className = 'question-ligne juste';
    afficherQuestion('juste');
    jeu.reussite(fete);
    fete.saluer();
    bruitage.reussite();
    manche = avancer(manche, true);
    majProgres();
    window.setTimeout(() => void suite(), 1500);
    return;
  }

  // Erreur : la bonne réponse tout de suite, avec ce qu'il a écrit, sans rien de négatif.
  bruitage.erreur();
  ui.questionLigne.className = 'question-ligne a-revoir';
  afficherQuestion('faux');
  ui.correction.replaceChildren(...jeu.correction(e, reponse));
  ui.correction.hidden = false;
  ui.clavier.hidden = true;
  ui.continuer.hidden = false;
  dire(jeu.voixCorrection(e), jeu.type === 'mots');
  manche = avancer(manche, false);
}

async function suite(): Promise<void> {
  if (!manche) return;
  if (!mancheFinie(manche)) return poserQuestion();
  // Défi raté deux fois : il a été retiré de la manche. On enchaîne sur un nouveau défi
  // (fabriqué à un niveau plus facile) jusqu'à en réussir 5.
  if (typeManche === 'defis' && (restants(jeu) ?? 0) > 0) return lancerManche();
  musique.arreter();
  bruitage.finDeManche();
  fete.saluer();
  // Une manche de révision terminée rapporte des tickets ; le jeu libre, non.
  const gain = typeManche === 'semaine' || typeManche === 'memoire' ? TICKETS_PAR_MANCHE : 0;
  if (gain > 0) gagnerTickets(gain);
  // À la moitié du travail du jour : la pause calme, obligatoire.
  const j = journee();
  const forcee = parametres.has('pause') && !j.pause;
  if (typeManche !== 'libre' && (forcee || pauseDue(j.total ?? 0, j.faites ?? 0, j.pause === true))) {
    ui.stand.hidden = true;
    await jouerPause(exerciceDuJour(aujourdhui()), parametres.has('pause-rapide') ? 0.05 : 1);
    j.pause = true;
    sauver();
    ui.stand.hidden = false;
  }
  mettreAJourPlace();
  montrerCarte(prochaineManche(), true, gain);
  void finDeSeance().then((finie) => {
    if (finie) {
      majHud();
      if (jeu.id === 'chantier') majConstruction();
    }
  });
}

ui.continuer.addEventListener('click', () => {
  bruitage.touche();
  void suite();
});
ui.carteBouton.addEventListener('click', () => {
  bruitage.touche();
  lancerManche();
});
ui.carteRetour.addEventListener('click', fermerStand);
ui.retour.addEventListener('click', () => {
  bruitage.touche();
  fermerStand();
});
ui.ecouter.addEventListener('click', () => {
  const e = elementCourant();
  if (dansUnStand && e) jeu.ecouter(e);
});
ui.boutonIndice.addEventListener('click', montrerIndice);

// Clavier physique (utile pour les essais sur ordinateur).
window.addEventListener('keydown', (e) => {
  if (!dansUnStand || ui.exercice.hidden) return;
  if (e.key === 'Backspace') toucher('effacer');
  else if (e.key === 'Enter') {
    if (!ui.continuer.hidden) ui.continuer.click();
    else toucher('valider');
  } else {
    const touche = jeu.touchePhysique(e.key);
    if (touche !== null) {
      e.preventDefault();
      toucher(touche);
    }
  }
});

// --- Son et entrée ------------------------------------------------------------------------
function majBoutonSon(): void {
  ui.son.setAttribute('aria-pressed', String(estMuet()));
  ui.son.setAttribute('aria-label', estMuet() ? 'Remettre le son' : 'Couper le son');
}
majBoutonSon();
ui.son.addEventListener('click', () => {
  demarrerSon();
  basculerMuet();
  majBoutonSon();
});

// --- L'introduction ------------------------------------------------------------------------
// Au premier lancement, et tant qu'elle n'est pas réussie. « ?intro » la rejoue (essais du parent),
// « ?lecture-rapide » raccourcit les attentes (essais seulement).
const histoires = chargerHistoires();
const parametres = new URLSearchParams(location.search);

async function introduction(): Promise<void> {
  const histoire = histoires.get('introduction');
  if (!histoire) return;
  const suivi = (sauvegarde.lectures.introduction ??= suiviNeuf());
  if (suivi.reussie && !parametres.has('intro')) return;
  enCinema = true;
  ui.bulle.hidden = true;
  // Sans visiteurs : ils passeraient devant la caméra.
  fete.calme(true);
  try {
    await jouerIntroduction({
      histoire,
      noms: sauvegarde.forains,
      suivi,
      sauver,
      facteur: parametres.has('lecture-rapide') ? 0.05 : 1,
      scene: {
        allerVers(vue, duree) {
          const pose = fete.vuesCinema[vue];
          if (duree <= 0) {
            trajet = null;
            poser(pose);
          } else deplacerCamera(pose, duree);
        },
        saluer: (id) => fete.saluerForain(id),
        marcher(id) {
          const stand = fete.stands.find((s) => s.id === id);
          if (stand) void fete.allerAuStand(stand);
        },
      },
    });
  } finally {
    enCinema = false;
    fete.calme(false);
  }
  deplacerCamera(fete.vues.place, 1.6);
}

ui.entrer.addEventListener('click', async () => {
  demarrerSon();
  bruitage.ouverture();
  ui.entree.hidden = true;
  await introduction();
  parler(messageDeLaPlace());
});

// Si la tablette reste ouverte d'un jour à l'autre, la place se remet à jour.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dansUnStand) mettreAJourPlace();
});
