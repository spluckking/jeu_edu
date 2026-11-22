// Le Golem Express, les règles (sans affichage ; testées dans golem-express.test.ts). Le golem file
// dans son wagonnet, vu de derrière ; deux tâches en même temps : piloter en penchant la tablette
// (passer dans les portes dorées, éviter les rochers), et n'attraper que les minerais demandés en
// laissant passer les autres (se retenir). Chaque tâche a son propre niveau, réglé après chaque
// manche : au-dessus de 80 % de réussite, un cran plus dur ; sous 70 %, un cran plus facile ; deux
// manches de suite sous 60 %, deux crans plus facile. Pendant la manche, un réglage fin suit aussi
// l'enfant, toutes les dix secondes, pour qu'il reste au bord de ce qu'il sait faire.

export const NIVEAU_MAX = 12;
export const SEUIL_MONTER = 0.8;
export const SEUIL_DESCENDRE = 0.7;
export const SEUIL_DIFFICILE = 0.6;
/** Environ 3 minerais sur 4 sont à attraper : attraper devient un réflexe qu'il faut retenir. */
export const PART_CIBLES = 0.75;
/** Une manche dure 3 minutes, comme dans la recherche (NeuroRacer) ; le parent peut choisir 90 s. */
export const DUREE_MANCHE = 180;
export const DUREES_MANCHE: readonly number[] = [90, 180];
/** Le temps de jeu par jour (en minutes), choisi par le parent. */
export const MINUTES_PAR_JOUR = 10;
export const CHOIX_MINUTES: readonly number[] = [10, 15, 20, 25];
/** À partir de ce niveau de minerais, la cible n'est plus rappelée pendant la course : il faut la
 *  retenir (mémoire de travail). */
export const NIVEAU_SANS_RAPPEL = 7;
export const avecRappel = (niveauCaisses: number): boolean => niveauCaisses < NIVEAU_SANS_RAPPEL;
export const DUREE_ECHAUFFEMENT = 30;
export const WAGONS_MAX = 12;

export type Matiere = 'fer' | 'or' | 'cuivre' | 'emeraude' | 'diamant' | 'charbon' | 'pierreRouge';
export type Forme = 'bloc' | 'pepite';
export const MATIERES: readonly Matiere[] = ['fer', 'or', 'cuivre', 'emeraude', 'diamant', 'charbon', 'pierreRouge'];
/** Les matières qu'on peut demander (le charbon et la pierre rouge restent des pièges). */
export const DEMANDABLES: readonly Matiere[] = ['fer', 'or', 'cuivre', 'emeraude', 'diamant'];

export type Objet = { sorte: 'tnt' } | { sorte: 'minerai'; matiere: Matiere; forme: Forme };
export interface Cible {
  matiere: Matiere;
  forme: Forme;
}

export interface Niveaux {
  pilotage: number;
  caisses: number;
}

const borne = (n: number): number => Math.max(1, Math.min(NIVEAU_MAX, n));
const parmi = <X>(hasard: () => number, l: readonly X[]): X => l[Math.floor(hasard() * l.length)]!;
const avance = (n: number): number => (borne(n) - 1) / (NIVEAU_MAX - 1);

// --- Le pilotage --------------------------------------------------------------------------------
// La galerie va de x = -1 (mur de gauche) à x = 1 (mur de droite). Sur le parcours arrivent, l'une
// après l'autre, des épreuves : une porte dorée (passer dedans) ou un rocher (passer à côté).

/** Le demi-largeur du wagonnet, dans les mêmes unités que la galerie. */
export const DEMI_WAGONNET = 0.12;
/** La vitesse de côté la plus forte (galerie par seconde), quand la tablette est bien penchée. */
export const VITESSE_COTE = 1.7;
/** L'inclinaison (en degrés) qui donne la vitesse de côté la plus forte, et la zone morte au milieu. */
export const PENCHE_MAX = 20;
export const ZONE_MORTE = 2;

/** Le pilotage selon le niveau : vitesse (m/s), distance entre deux épreuves (m), demi-largeur
 *  des portes, écart de côté le plus grand d'une porte à la suivante, part des rochers. */
export function reglagePilotage(n: number): { vitesse: number; espacement: number; largeurPorte: number; ecartMax: number; partRochers: number } {
  const k = avance(n);
  return { vitesse: 9 + 6 * k, espacement: 22 - 6 * k, largeurPorte: 0.42 - 0.2 * k, ecartMax: 0.6 + 0.9 * k, partRochers: 0.45 * k };
}

export type Epreuve = { sorte: 'porte'; x: number; largeur: number } | { sorte: 'rocher'; x: number; largeur: number };
export const DEMI_ROCHER = 0.26;

/** L'épreuve suivante : une porte un peu plus loin sur le côté, ou un rocher sur la route. */
export function prochaineEpreuve(n: number, xAvant: number, hasard: () => number): Epreuve {
  const r = reglagePilotage(n);
  const ecart = (hasard() * 2 - 1) * r.ecartMax;
  if (hasard() < r.partRochers) {
    // Le rocher se pose près de là où l'enfant devrait passer : il faut l'éviter.
    const x = Math.max(-0.7, Math.min(0.7, xAvant + ecart * 0.4));
    return { sorte: 'rocher', x, largeur: DEMI_ROCHER };
  }
  const limite = 0.95 - r.largeurPorte;
  const x = Math.max(-limite, Math.min(limite, xAvant + ecart));
  return { sorte: 'porte', x, largeur: r.largeurPorte };
}

/** Le wagonnet (au milieu x) réussit-il l'épreuve ? */
export function reussitEpreuve(e: Epreuve, x: number): boolean {
  const d = Math.abs(x - e.x);
  return e.sorte === 'porte' ? d <= e.largeur : d >= e.largeur + DEMI_WAGONNET;
}

/** De combien la tablette penche à gauche ou à droite (en degrés, signe non réglé), d'après la
 *  pesanteur mesurée par la tablette et l'angle de l'écran : ça marche que la tablette soit tenue
 *  droite ou couchée vers l'arrière. */
export function penche(g: { x: number; y: number; z: number }, angleEcran: number): number {
  const a = (angleEcran * Math.PI) / 180;
  const sx = g.x * Math.cos(a) + g.y * Math.sin(a);
  const sy = -g.x * Math.sin(a) + g.y * Math.cos(a);
  return (Math.atan2(sx, Math.hypot(sy, g.z)) * 180) / Math.PI;
}

/** La vitesse de côté (galerie par seconde) pour une inclinaison donnée (par rapport au neutre). */
export function vitesseDeCote(degres: number): number {
  const d = Math.abs(degres) <= ZONE_MORTE ? 0 : degres - Math.sign(degres) * ZONE_MORTE;
  return Math.max(-1, Math.min(1, d / (PENCHE_MAX - ZONE_MORTE))) * VITESSE_COTE;
}

// --- Les minerais -------------------------------------------------------------------------------

/** Les minerais selon le niveau : écart entre deux (s), temps pour attraper (s), et à quel point
 *  les pièges ressemblent aux cibles (0 : TNT et charbon ; 3 : même matière). */
export function reglageCaisses(n: number): { intervalle: number; fenetre: number; ressemblance: number } {
  const k = avance(n);
  return { intervalle: 1.9 - 0.8 * k, fenetre: 1.2 - 0.5 * k, ressemblance: Math.min(3, Math.floor((borne(n) - 1) / 3)) };
}

export const tireCible = (hasard: () => number): Cible => ({ matiere: parmi(hasard, DEMANDABLES), forme: hasard() < 0.5 ? 'bloc' : 'pepite' });

export const estLaCible = (o: Objet, c: Cible): boolean => o.sorte === 'minerai' && o.matiere === c.matiere && o.forme === c.forme;

const autreForme = (f: Forme): Forme => (f === 'bloc' ? 'pepite' : 'bloc');

/** Les sortes de pièges possibles à ce niveau (sans compter les doublons de tirage). */
export function piegesPossibles(c: Cible, ressemblance: number): Objet[] {
  const l: Objet[] = [{ sorte: 'tnt' }, { sorte: 'minerai', matiere: 'charbon', forme: autreForme(c.forme) }];
  const autres = MATIERES.filter((m) => m !== c.matiere);
  if (ressemblance >= 1) for (const m of autres) l.push({ sorte: 'minerai', matiere: m, forme: autreForme(c.forme) });
  if (ressemblance >= 2) for (const m of autres) l.push({ sorte: 'minerai', matiere: m, forme: c.forme });
  if (ressemblance >= 3) l.push({ sorte: 'minerai', matiere: c.matiere, forme: autreForme(c.forme) });
  const cle = (o: Objet): string => (o.sorte === 'tnt' ? 'tnt' : `${o.matiere}-${o.forme}`);
  return l.filter((o, i) => l.findIndex((p) => cle(p) === cle(o)) === i);
}

/** Un piège, d'autant plus ressemblant que le niveau est haut. */
export function piege(c: Cible, ressemblance: number, hasard: () => number): Objet {
  const autres = MATIERES.filter((m) => m !== c.matiere);
  const choix: Objet[] = [{ sorte: 'tnt' }, { sorte: 'minerai', matiere: 'charbon', forme: autreForme(c.forme) }];
  if (ressemblance >= 1) choix.push({ sorte: 'minerai', matiere: parmi(hasard, autres), forme: autreForme(c.forme) });
  if (ressemblance >= 2) choix.push({ sorte: 'minerai', matiere: parmi(hasard, autres), forme: c.forme }, { sorte: 'minerai', matiere: parmi(hasard, autres), forme: c.forme });
  if (ressemblance >= 3) choix.push({ sorte: 'minerai', matiere: c.matiere, forme: autreForme(c.forme) }, { sorte: 'minerai', matiere: c.matiere, forme: autreForme(c.forme) });
  // Au niveau le plus simple, jamais de charbon en forme de cible : TNT ou l'autre forme.
  const o = parmi(hasard, choix);
  return estLaCible(o, c) ? { sorte: 'tnt' } : o;
}

/** Le prochain minerai : la cible 3 fois sur 4, sinon un piège. */
export function prochainObjet(c: Cible, ressemblance: number, hasard: () => number): Objet {
  return hasard() < PART_CIBLES ? { sorte: 'minerai', ...c } : piege(c, ressemblance, hasard);
}

// --- Le réglage fin, pendant la manche ------------------------------------------------------------

export const FACTEUR_MIN = 0.85;
export const FACTEUR_MAX = 1.2;

/** Toutes les dix secondes : un peu plus dur si presque tout est réussi, un peu plus doux si
 *  l'enfant décroche (au moins 3 essais pour en juger). Le facteur multiplie la vitesse (pilotage)
 *  ou divise le temps pour attraper (minerais). */
export function affiner(facteur: number, reussis: number, essais: number): number {
  if (essais < 3) return facteur;
  const r = reussis / essais;
  const f = r >= 0.9 ? facteur * 1.05 : r < 0.6 ? facteur / 1.05 : facteur;
  return Math.max(FACTEUR_MIN, Math.min(FACTEUR_MAX, f));
}

// --- Les mesures ----------------------------------------------------------------------------------

/** Ce qu'on mesure pendant une manche. */
export interface Mesures {
  /** Les portes et rochers passés, et ceux réussis (pilotage). */
  epreuves: number;
  reussies: number;
  /** Les fois où le wagonnet a frotté un mur. */
  murs: number;
  cibles: number;
  attrapees: number;
  pieges: number;
  piegesAttrapes: number;
  /** Les touches sans aucun minerai à portée. */
  dansLeVide: number;
  /** Les temps de réaction des bons minerais attrapés, en millisecondes. */
  reactions: number[];
}

export const mesuresVides = (): Mesures => ({ epreuves: 0, reussies: 0, murs: 0, cibles: 0, attrapees: 0, pieges: 0, piegesAttrapes: 0, dansLeVide: 0, reactions: [] });

export const reussitePilotage = (m: Mesures): number => (m.epreuves > 0 ? m.reussies / m.epreuves : 0);

/** Les minerais : la moyenne des cibles attrapées et des pièges laissés passer (sinon, attraper
 *  tout ferait 100 %). */
export function reussiteCaisses(m: Mesures): number {
  const touches = m.cibles ? m.attrapees / m.cibles : 1;
  const retenues = m.pieges ? 1 - m.piegesAttrapes / m.pieges : 1;
  return (touches + retenues) / 2;
}

export const moyenne = (l: readonly number[]): number => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);
export function ecartType(l: readonly number[]): number {
  if (l.length < 2) return 0;
  const m = moyenne(l);
  return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / (l.length - 1));
}

/** Le pas d'un niveau selon la réussite (et le nombre de manches difficiles d'affilée). */
function pas(r: number, difficilesDeSuite: number): number {
  if (r < SEUIL_DIFFICILE && difficilesDeSuite >= 1) return -2;
  if (r >= SEUIL_MONTER) return 1;
  if (r < SEUIL_DESCENDRE) return -1;
  return 0;
}

export interface Ajustement {
  niveaux: Niveaux;
  /** Combien de manches difficiles d'affilée (sous 60 % pour l'une des tâches). */
  difficiles: number;
  /** Les deux tâches au-dessus de 80 % : une étoile (un wagon). */
  etoile: boolean;
  monte: { pilotage: boolean; caisses: boolean };
  descend: boolean;
}

/** Après une manche à deux tâches : chaque niveau bouge à part. */
export function ajuster(n: Niveaux, m: Mesures, difficiles: number): Ajustement {
  const rp = reussitePilotage(m);
  const rc = reussiteCaisses(m);
  const dp = pas(rp, difficiles);
  const dc = pas(rc, difficiles);
  const difficile = rp < SEUIL_DIFFICILE || rc < SEUIL_DIFFICILE;
  return {
    niveaux: { pilotage: borne(n.pilotage + dp), caisses: borne(n.caisses + dc) },
    difficiles: difficile ? difficiles + 1 : 0,
    etoile: rp >= SEUIL_MONTER && rc >= SEUIL_MONTER,
    monte: { pilotage: dp > 0 && n.pilotage < NIVEAU_MAX, caisses: dc > 0 && n.caisses < NIVEAU_MAX },
    descend: dp < 0 || dc < 0,
  };
}

/** L'inverse de la loi normale (approximation d'Acklam, à 1e-9 près). */
export function zNormale(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const bas = 0.02425;
  if (p < bas) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p > 1 - bas) return -zNormale(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
}

/** Le d′ (« d prime ») de la recherche : savoir distinguer les cibles des pièges, sans compter
 *  l'envie d'appuyer. Correction log-linéaire (+0,5) pour éviter les taux de 0 ou 100 %. */
export function dPrime(m: Mesures): number {
  const touches = (m.attrapees + 0.5) / (m.cibles + 1);
  const fausses = (m.piegesAttrapes + 0.5) / (m.pieges + 1);
  return zNormale(touches) - zNormale(fausses);
}

/** Ce que coûte la double tâche : de combien (en %) une mesure baisse quand on fait les deux à
 *  la fois, par rapport à la tâche seule (l'échauffement du jour). */
export function cout(seule: number, double: number): number | null {
  if (!(seule > 0)) return null;
  return Math.round((100 * (seule - double)) / seule);
}

/** Une manche gardée pour le parent. */
export interface Resultat {
  date: string;
  sorte: 'double' | 'pilotage' | 'caisses';
  niveaux: Niveaux;
  pilotage: number;
  caisses: number;
  oubliees: number;
  erreurs: number;
  reaction: number;
  regularite: number;
  /** Le d′ des minerais (absent pour le pilotage seul). */
  dprime?: number;
  duree?: number;
}

export function resultat(date: string, sorte: Resultat['sorte'], n: Niveaux, m: Mesures, duree?: number): Resultat {
  return {
    date,
    sorte,
    niveaux: n,
    pilotage: Math.round(100 * reussitePilotage(m)),
    caisses: Math.round(100 * reussiteCaisses(m)),
    oubliees: m.cibles - m.attrapees,
    erreurs: m.piegesAttrapes,
    reaction: Math.round(moyenne(m.reactions)),
    regularite: Math.round(ecartType(m.reactions)),
    ...(sorte === 'pilotage' ? {} : { dprime: Math.round(100 * dPrime(m)) / 100 }),
    ...(duree ? { duree } : {}),
  };
}

// --- Les lieux et la journée ------------------------------------------------------------------------

export type IdLieu = 'mine' | 'riviere' | 'foret' | 'montagne' | 'volcan';
/** Les lieux, et le nombre de wagons qu'il faut pour les ouvrir. */
export const LIEUX: ReadonlyArray<{ id: IdLieu; wagons: number }> = [
  { id: 'mine', wagons: 0 },
  { id: 'riviere', wagons: 3 },
  { id: 'foret', wagons: 5 },
  { id: 'montagne', wagons: 8 },
  { id: 'volcan', wagons: 11 },
];
export const lieuxOuverts = (wagons: number): IdLieu[] => LIEUX.filter((l) => wagons >= l.wagons).map((l) => l.id);
/** Le lieu qu'un nouveau wagon vient d'ouvrir (ou null). */
export const lieuOuvertPar = (wagonsAvant: number, wagonsApres: number): IdLieu | null => LIEUX.find((l) => l.wagons > wagonsAvant && l.wagons <= wagonsApres)?.id ?? null;

/** Combien de manches dans la journée, pour le temps choisi par le parent (au moins une). */
export const manchesDuJour = (minutes: number, duree: number): number => Math.max(1, Math.round((minutes * 60) / duree));
