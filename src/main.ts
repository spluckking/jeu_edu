// Point d'entrée : la scène, la sauvegarde, et le déroulé commun des stands de révision.

import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './style.css';
import * as THREE from 'three';
import { chargerContenus, lireContenu, type Contenu, type Element, type TypeContenu } from './contenus/contenus.ts';
import { jourDe, type Jour } from './memoire/jours.ts';
import {
  avancer,
  elementEnCours,
  enregistrer,
  estRattrapage,
  etatNeuf,
  mancheFinie,
  melanger,
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
import { creerPeche } from './stands/peche.ts';
import { jouerDetente } from './detente/jeux.ts';
import { demanderPrenom } from './ui/prenom.ts';
import { exerciceDuJour, jouerPause, pauseDue } from './detente/pause.ts';
import { chargerFeuilleton, episodeDuJour, lireSemaine, type Episode, type Semaine } from './histoire/feuilleton.ts';
import { ouvrirEspaceParent, porteParent } from './parent/espace.ts';
import { ordonner, type Preparation } from './reve/preparation.ts';
import { lireAcces, synchroniser } from './reve/synchro.ts';
import { lireEpisode } from './histoire/episode.ts';
import { ajusterNiveau } from './exercices/generateur.ts';
import {
  BONUS_SEANCE,
  choisirLot,
  DEFIS_PAR_SEANCE,
  HEURES_PAR_SEANCE,
  PECHES_PAR_SEANCE,
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
import { construireEntree } from './scene/entree.ts';
import { CameraSuivie } from './scene/suivi.ts';
import { creerCommandes } from './controles/joystick.ts';
import { basculerMuet, bruitage, demarrerSon, estMuet, reglerVolumes } from './son/bruitages.ts';
import { dire, reglerVoix } from './son/voix.ts';

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
  zoneStick: el<HTMLDivElement>('zone-joystick'),
  joystick: el<HTMLDivElement>('joystick'),
  zoneRegard: el<HTMLDivElement>('zone-regard'),
  interagir: el<HTMLButtonElement>('interagir'),
  interagirTexte: el<HTMLSpanElement>('interagir-texte'),
  parent: el<HTMLButtonElement>('parent'),
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
const contenusDuDepot = chargerContenus();
let contenus: Contenu[] = [];
const elements = new Map<string, Element>();

let sauvegarde: Sauvegarde = await lireSauvegarde();
let ecriture: Promise<void> = Promise.resolve();
function sauver(): void {
  const copie = structuredClone(sauvegarde);
  ecriture = ecriture.then(() => ecrireSauvegarde(copie)).catch((erreur: unknown) => console.error(erreur));
}

/** Les contenus du dépôt, plus les listes ajoutées par le parent sur la tablette. */
function rechargerContenus(): void {
  const listes = sauvegarde.listesRapides.flatMap((l) => {
    const lu = lireContenu({ id: l.id, titre: l.titre, type: 'mots', elements: l.mots.map((mot) => ({ mot })) }, l.titre);
    return Array.isArray(lu) ? [] : [lu];
  });
  contenus = [...contenusDuDepot, ...listes];
  for (const contenu of contenus) for (const e of contenu.elements) elements.set(e.id, e);
  // Un contenu arrive le jour où la tablette le voit pour la première fois.
  for (const contenu of contenus) sauvegarde.arrivees[contenu.id] ??= aujourdhui();
}
rechargerContenus();
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
  if (jeu.type === 'homophone') return Math.max(0, PECHES_PAR_SEANCE - (journee().peches ?? 0));
  return null;
}

const standPeche = creerPeche({ niveau: () => sauvegarde.niveauPeche.niveau, noms: () => sauvegarde.forains });
for (let i = 0; i < PECHES_PAR_SEANCE; i++) elements.set(`peche-${i}`, { type: 'homophone', id: `peche-${i}` });

// --- Le feuilleton --------------------------------------------------------------------------
// Seules les semaines validées par le parent arrivent ; « ?feuilleton-essai » montre aussi
// celles qui attendent (pour que le parent les lise sur la tablette avant de valider).
// Les semaines proposées par le rêve arrivent par la préparation ; elles ne deviennent visibles
// qu'une fois validées par le parent dans l'espace parent.
const feuilletonDuDepot = chargerFeuilleton();
let feuilleton: Semaine[] = [];
let episodesValides: Episode[] = [];

function semainesProposees(): Semaine[] {
  return (sauvegarde.preparation?.feuilleton ?? []).flatMap((brut, i) => {
    const lu = lireSemaine(brut, `proposition ${i + 1}`);
    return Array.isArray(lu) || feuilletonDuDepot.some((s) => s.id === lu.id) ? [] : [lu];
  });
}

function rechargerFeuilleton(): void {
  const essai = new URLSearchParams(location.search).has('feuilleton-essai');
  const proposees = semainesProposees().map((s) => ({ ...s, valide: sauvegarde.validations[s.id] === 'validee' }));
  feuilleton = [...feuilletonDuDepot, ...proposees].map((s) => (essai ? { ...s, valide: true } : s));
  episodesValides = feuilleton.filter((s) => s.valide).flatMap((s) => s.episodes);
}
rechargerFeuilleton();

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

const JEUX: JeuDeStand[] = [chamboule, confiserie, defis, standHorloge, standPeche];
/** Un stand éteint par le parent ne s'allume plus et ne compte plus dans la séance. */
const eteint = (id: string): boolean => sauvegarde.reglages.standsEteints.includes(id);
/** Le stand a encore quelque chose à faire dans la séance du jour : il est allumé. */
const aReviser = (jeu: JeuDeStand): boolean => {
  if (eteint(jeu.id)) return false;
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
const entree = construireEntree();
scene.add(entree.racine);
fete.racine.updateMatrixWorld(true);

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

/** Les vues des stands et des cinématiques sont réglées pour ce champ de vision. */
function champNormal(): void {
  camera.fov = camera.aspect < 1 ? 70 : 45;
  camera.updateProjectionMatrix();
}

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
  promenade(delta);
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

const capitale = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

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
  peche: 'à la pêche aux canards',
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
  // La séance du jour est finie : son journal part tout de suite pour le rêve du soir.
  void echanger();
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

// --- La promenade : joystick, caméra à l'épaule, bouton « Entrer » près d'un stand --------------
let dansUnStand = false;
let enMarche = false;
let enCinema = false;
/** La caméra suit le personnage (sinon elle est posée : stand, cinématique, écran d'entrée). */
let modeSuivi = false;
let bienvenue = true;
let standProche: Stand | null = null;

const VITESSE = 5;
const CHAMP_PROMENADE = 58;
const RAYON_PERSONNAGE = 0.45;
/** Le décor qu'on ne traverse pas : chapiteaux, arbres, poteaux des guirlandes. */
const DECOR: Array<[number, number, number]> = [
  [-14, -16, 2.7],
  [0, -24, 2.7],
  [15, -16, 2.7],
  [-12, -7, 0.5],
  [12.5, -8, 0.5],
  [14, 3, 0.5],
  [-11, -15, 0.6],
  [11.5, -15.5, 0.5],
  [-10.5, 5, 0.25],
  [10.5, 5, 0.25],
  [-10.5, -9, 0.25],
  [10.5, -9, 0.25],
  [0, -10.5, 0.25],
];
const boitesStands = fete.stands.map((s) => new THREE.Box3().setFromObject(s.zone).expandByScalar(0.25));
const obstacles: THREE.Box3[] = [
  ...boitesStands,
  ...entree.obstacles,
  ...DECOR.map(([x, z, r]) => new THREE.Box3(new THREE.Vector3(x - r, 0, z - r), new THREE.Vector3(x + r, 4, z + r))),
];
// La caméra ne bute que sur les stands et l'entrée (le petit décor ne la gêne pas).
const suivi = new CameraSuivie([...boitesStands, ...entree.obstacles]);
const commandes = creerCommandes(ui.zoneStick, ui.joystick, ui.zoneRegard);
const heros = (): THREE.Object3D => fete.heros();

/** De combien ce point s'enfonce dans un obstacle (0 : rien ne gêne). */
function enfoncement(x: number, z: number): number {
  const p = new THREE.Vector3(x, 1, z);
  let pire = 0;
  for (const b of obstacles) pire = Math.max(pire, RAYON_PERSONNAGE - b.distanceToPoint(p));
  return pire;
}

/**
 * Peut-on aller là ? Jamais hors de la fête. Et si le personnage est déjà un peu dans un
 * obstacle (en sortant d'un stand), tout pas qui l'en éloigne est permis : il n'est jamais bloqué.
 */
function libre(x: number, z: number): boolean {
  if (!entree.dansLaFete(x, z)) return false;
  const apres = enfoncement(x, z);
  if (apres <= 0) return true;
  const h = heros().position;
  return apres < enfoncement(h.x, h.z) - 1e-4;
}

const TITRES_DETENTE: Record<string, string> = { autos: 'Autos tamponneuses', trampoline: 'Trampoline', glaces: 'Palais des glaces' };
function titreDuStand(s: Stand): string {
  return JEUX.find((j) => j.id === s.id)?.titre ?? TITRES_DETENTE[s.id] ?? 'Le stand';
}

/** La caméra revient derrière le personnage, en douceur. */
function retourPromenade(duree = 1.1): void {
  suivi.placerDerriere(heros().rotation.y);
  const p = suivi.pose(heros(), heros().rotation.y, 0, 0);
  deplacerCamera({ position: p.position, cible: p.cible }, duree);
  modeSuivi = true;
}

/** À chaque partie, on arrive par l'allée et on passe la grande porte. */
function arriverALEntree(): void {
  const h = heros();
  h.position.set(0, 0.06, 27);
  h.rotation.y = Math.PI;
  suivi.placerDerriere(Math.PI);
  const p = suivi.pose(h, Math.PI, 0, 0);
  trajet = null;
  poser({ position: p.position, cible: p.cible });
  modeSuivi = true;
  bienvenue = false;
}

function promenade(delta: number): void {
  const active = modeSuivi && !trajet && ui.entree.hidden && !dansUnStand && !enMarche && !enCinema;
  commandes.actives = active;
  if (!active) {
    ui.interagir.hidden = true;
    ui.zoneStick.hidden = !modeSuivi || !ui.entree.hidden || dansUnStand || enCinema;
    if (!enMarche) fete.marcheLibre(0);
    return;
  }
  ui.zoneStick.hidden = false;
  // Champ de vision un peu plus large à l'épaule, pour bien voir la fête.
  if (Math.abs(camera.fov - CHAMP_PROMENADE) > 0.1) {
    camera.fov += (CHAMP_PROMENADE - camera.fov) * Math.min(1, delta * 3);
    camera.updateProjectionMatrix();
  }
  const h = heros();
  const regard = commandes.prendreRegard();
  suivi.tourner(regard.x, regard.y);
  const force = Math.min(1, Math.hypot(commandes.x, commandes.y));
  if (force > 0.02) {
    const { avant, droite } = suivi.axes();
    const n = Math.max(1, Math.hypot(commandes.x, commandes.y));
    const mx = (droite.x * commandes.x + avant.x * commandes.y) / n;
    const mz = (droite.z * commandes.x + avant.z * commandes.y) / n;
    const pas = VITESSE * force * delta;
    const nx = h.position.x + mx * pas;
    const nz = h.position.z + mz * pas;
    if (libre(nx, nz)) h.position.set(nx, 0.06, nz);
    else if (libre(nx, h.position.z)) h.position.x = nx;
    else if (libre(h.position.x, nz)) h.position.z = nz;
    let ecart = Math.atan2(mx, mz) - h.rotation.y;
    ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
    h.rotation.y += ecart * Math.min(1, delta * 10);
  }
  fete.marcheLibre(force);
  const pose = suivi.pose(h, h.rotation.y, commandes.y > -0.3 ? force : 0, delta);
  poser({ position: pose.position, cible: pose.cible });

  // En passant la grande porte.
  if (!bienvenue && h.position.z < 11.5) {
    bienvenue = true;
    bruitage.finDeManche();
    parler('Bienvenue à la fête foraine !');
    window.setTimeout(() => {
      if (!dansUnStand && !enCinema) parler(messageDeLaPlace());
    }, 3500);
  }

  // Le stand le plus proche, s'il est à portée : le bouton « Entrer » apparaît.
  let meilleur: Stand | null = null;
  let distance = 2.8;
  for (const s of fete.stands) {
    const d = Math.hypot(s.approche.x - h.position.x, s.approche.z - h.position.z);
    if (d < distance) {
      distance = d;
      meilleur = s;
    }
  }
  if (meilleur !== standProche) {
    standProche = meilleur;
    if (meilleur) ui.interagirTexte.textContent = eteint(meilleur.id) ? `${titreDuStand(meilleur)} (fermé)` : titreDuStand(meilleur);
  }
  ui.interagir.hidden = standProche === null;
}

// « ?essai » : placer le personnage d'un coup (pour les essais et les captures).
if (new URLSearchParams(location.search).has('essai')) {
  Object.assign(window, {
    essai: {
      placer(x: number, z: number, cap: number): void {
        heros().position.set(x, 0.06, z);
        heros().rotation.y = cap;
        suivi.placerDerriere(cap);
      },
      position(): string {
        const p = heros().position;
        return `${p.x.toFixed(2)} ${p.z.toFixed(2)}`;
      },
      avancer(secondes: number): void {
        for (let t = 0; t < secondes; t += 1 / 30) promenade(1 / 30);
        renderer.render(scene, camera);
      },
    },
  });
}

ui.interagir.addEventListener('click', () => {
  if (standProche && commandes.actives) toucherStand(standProche);
});

// --- Le temps de jeu ---------------------------------------------------------------------------
// On compte le temps où le jeu est ouvert et visible. Après le temps réglé par le parent dans la
// journée, un forain propose une pause, une seule fois, sans rien couper ni bloquer.
const PAS_DE_TEMPS = 5;
window.setInterval(() => {
  if (document.visibilityState !== 'visible' || !ui.entree.hidden) return;
  const j = journee();
  j.secondes = (j.secondes ?? 0) + PAS_DE_TEMPS;
  if (j.secondes % 30 === 0) sauver();
  if (j.pauseProposee || j.secondes < sauvegarde.reglages.tempsDeJeu * 60) return;
  // On attend un moment calme : pas au milieu d'une question ni d'une cinématique.
  if (enCinema || enMarche || (dansUnStand && !ui.exercice.hidden)) return;
  j.pauseProposee = true;
  sauver();
  const fond = document.createElement('div');
  fond.className = 'vitrine-fond';
  const carte = document.createElement('div');
  carte.className = 'vitrine';
  const texte = document.createElement('p');
  texte.className = 'lecture-titre';
  texte.textContent = `${capitale(nom('chamboule'))} : « Tu joues depuis un bon moment. C’est l’heure de faire une pause : va bouger, boire un verre d’eau, et reviens demain ! »`;
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'bouton-principal';
  ok.textContent = 'D’accord';
  ok.addEventListener('click', () => {
    bruitage.touche();
    fond.remove();
  });
  carte.append(texte, ok);
  fond.append(carte);
  document.body.append(fond);
  fete.saluerForain('chamboule');
  dire(texte.textContent);
}, PAS_DE_TEMPS * 1000);

function toucherStand(stand: Stand): void {
  bruitage.touche();
  if (eteint(stand.id)) {
    parler('Ce stand est fermé pour le moment.');
    return;
  }
  const jeu = JEUX.find((j) => j.id === stand.id);
  if (!jeu) {
    // Un stand de détente : jeu libre, sans manche ni mémoire.
    const id = stand.id;
    if (id !== 'autos' && id !== 'trampoline' && id !== 'glaces') return;
    enMarche = true;
    ui.bulle.hidden = true;
    void fete.allerAuStand(stand).then(async () => {
      enMarche = false;
      dansUnStand = true;
      musique.demarrer();
      await jouerDetente(id);
      musique.arreter();
      dansUnStand = false;
      retourPromenade();
      parler(messageDeLaPlace());
    });
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
  peche: 'Au fond de la fête, un nouveau forain fait nager des canards qui portent des mots.',
};

async function ouvrirStand(nouveau: JeuDeStand): Promise<void> {
  jeu = nouveau;
  dansUnStand = true;
  champNormal();
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
  retourPromenade();
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
          : jeu.type === 'homophone'
            ? `${capitale(nom('peche'))} a ${jeu.unite(nombre)}.`
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
  // Le rêve peut demander de faire passer certains éléments en premier (ceux qui résistent).
  const focus = sauvegarde.preparation?.focus ?? [];
  const choisis = focus.length > 0 ? ordonner(melanger(ids, Math.random), focus).slice(0, 8) : ids;
  manche = nouvelleManche(choisis, Math.random);
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
  } else if (jeu.type === 'homophone') {
    sauvegarde.niveauPeche = ajusterNiveau(sauvegarde.niveauPeche, reussi);
    if (reussi && typeManche === 'defis') journee().peches = (journee().peches ?? 0) + 1;
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

async function introduction(forcer = false): Promise<void> {
  const histoire = histoires.get('introduction');
  if (!histoire) return;
  const suivi = (sauvegarde.lectures.introduction ??= suiviNeuf());
  if (suivi.reussie && !forcer && !parametres.has('intro')) return;
  enCinema = true;
  champNormal();
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
}

ui.entrer.addEventListener('click', async () => {
  demarrerSon();
  bruitage.ouverture();
  ui.entree.hidden = true;
  await introduction();
  // On arrive toujours par la grande porte, comme dans un parc d'attractions.
  arriverALEntree();
  parler('Avance avec le joystick et passe la grande porte !');
  void echanger();
});

// --- L'échange avec le dépôt privé et le rêve -------------------------------------------------
let echangeEnCours = false;

/** Applique une préparation nouvelle : les niveaux conseillés par le rêve, puis le reste à la demande. */
function appliquerPreparation(p: Preparation): void {
  const neuf = { reussitesDeSuite: 0, erreursDeSuite: 0 };
  if (p.niveaux.defis) sauvegarde.niveauDefis = { niveau: p.niveaux.defis, ...neuf };
  if (p.niveaux.horloge) sauvegarde.niveauHorloge = { niveau: p.niveaux.horloge, ...neuf };
  if (p.niveaux.peche) sauvegarde.niveauPeche = { niveau: p.niveaux.peche, ...neuf };
  sauvegarde.preparation = p;
  rechargerFeuilleton();
}

/** Un échange avec le dépôt privé, s'il y a une clé et du réseau ; renvoie un message pour le parent. */
async function echanger(): Promise<string> {
  const acces = lireAcces();
  if (!acces) return 'Pas de clé enregistrée : aucun échange.';
  if (!navigator.onLine) return 'Pas de réseau : l’échange se fera plus tard.';
  if (echangeEnCours) return 'Un échange est déjà en cours.';
  echangeEnCours = true;
  try {
    const r = await synchroniser(sauvegarde, acces, aujourdhui());
    sauvegarde.synchro = { derniere: new Date().toISOString() };
    if (r.preparation && r.preparation.jour !== sauvegarde.preparation?.jour) appliquerPreparation(r.preparation);
    else if (r.preparation) sauvegarde.preparation = { ...r.preparation };
    sauver();
    majHud();
    return `Échange réussi : ${r.envoyes} fichier${r.envoyes > 1 ? 's' : ''} déposé${r.envoyes > 1 ? 's' : ''}${r.preparation ? ', préparation reçue' : ''}.`;
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : 'Échange impossible.';
    sauvegarde.synchro = { ...sauvegarde.synchro, probleme: message };
    sauver();
    return message;
  } finally {
    echangeEnCours = false;
  }
}

// --- Réglages du parent ------------------------------------------------------------------------
function appliquerReglages(): void {
  reglerVolumes(sauvegarde.reglages.volumeBruitages, sauvegarde.reglages.volumeMusique);
  reglerVoix(sauvegarde.reglages.vitesseVoix);
  rechargerContenus();
  rechargerFeuilleton();
  sauver();
  mettreAJourPlace();
}
appliquerReglages();

porteParent(ui.parent, () => {
  if (dansUnStand || enCinema || enMarche) return;
  void ouvrirEspaceParent({
    sauvegarde: () => sauvegarde,
    sauver,
    jour: aujourdhui(),
    stands: JEUX.map((j) => ({ id: j.id, titre: j.titre })),
    propositions: () => semainesProposees().filter((s) => !sauvegarde.validations[s.id]),
    appliquer: appliquerReglages,
    synchroniser: echanger,
    rejouerIntroduction: () => void introduction(true).then(() => parler(messageDeLaPlace())),
  });
});

// Si la tablette reste ouverte d'un jour à l'autre, la place se remet à jour ; quand on quitte
// le jeu, le journal part au dépôt privé pour le rêve du soir.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dansUnStand) mettreAJourPlace();
  if (document.visibilityState === 'hidden') void echanger();
});
