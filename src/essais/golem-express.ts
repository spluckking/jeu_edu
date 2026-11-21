// Le Golem Express, les règles (sans affichage ; testées dans golem-express.test.ts). Deux tâches
// en même temps : garder le train sur un chemin qui serpente (pilotage continu), et n'attraper que
// les caisses demandées en laissant passer les autres (se retenir). Chaque tâche a son propre
// niveau, réglé après chaque manche : au-dessus de 80 % de réussite, un cran plus dur ; sous 70 %,
// un cran plus facile ; deux manches de suite sous 60 %, deux crans plus facile.

export const NIVEAU_MAX = 12;
export const SEUIL_MONTER = 0.8;
export const SEUIL_DESCENDRE = 0.7;
export const SEUIL_DIFFICILE = 0.6;
/** Environ 3 caisses sur 4 sont à attraper : attraper devient un réflexe qu'il faut retenir. */
export const PART_CIBLES = 0.75;
export const DUREE_MANCHE = 90;
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

/** Le pilotage selon le niveau : vitesse (points/s), largeur du chemin, force des virages. */
export function reglagePilotage(n: number): { vitesse: number; largeur: number; virages: number } {
  const k = (borne(n) - 1) / (NIVEAU_MAX - 1);
  return { vitesse: 150 + 170 * k, largeur: 170 - 80 * k, virages: 60 + 110 * k };
}

/** Les caisses selon le niveau : écart entre deux caisses (s), temps pour attraper (s), et à
 *  quel point les pièges ressemblent aux cibles (0 : TNT et charbon ; 3 : même matière). */
export function reglageCaisses(n: number): { intervalle: number; fenetre: number; ressemblance: number } {
  const k = (borne(n) - 1) / (NIVEAU_MAX - 1);
  return { intervalle: 1.9 - 0.8 * k, fenetre: 1.2 - 0.5 * k, ressemblance: Math.min(3, Math.floor((borne(n) - 1) / 3)) };
}

/** Le centre du chemin à l'abscisse x (le monde défile ; le chemin serpente). */
export const cheminY = (x: number, virages: number, milieu = 300): number =>
  milieu + virages * (0.6 * Math.sin(x / 310) + 0.4 * Math.sin(x / 137 + 2));

export const tireCible = (hasard: () => number): Cible => ({ matiere: parmi(hasard, DEMANDABLES), forme: hasard() < 0.5 ? 'bloc' : 'pepite' });

export const estLaCible = (o: Objet, c: Cible): boolean => o.sorte === 'minerai' && o.matiere === c.matiere && o.forme === c.forme;

/** Un piège, d'autant plus ressemblant que le niveau est haut. */
export function piege(c: Cible, ressemblance: number, hasard: () => number): Objet {
  const autreForme: Forme = c.forme === 'bloc' ? 'pepite' : 'bloc';
  const autres = MATIERES.filter((m) => m !== c.matiere);
  const choix: Objet[] = [{ sorte: 'tnt' }, { sorte: 'minerai', matiere: 'charbon', forme: c.forme === 'bloc' ? 'pepite' : 'bloc' }];
  if (ressemblance >= 1) choix.push({ sorte: 'minerai', matiere: parmi(hasard, autres), forme: autreForme });
  if (ressemblance >= 2) choix.push({ sorte: 'minerai', matiere: parmi(hasard, autres), forme: c.forme }, { sorte: 'minerai', matiere: parmi(hasard, autres), forme: c.forme });
  if (ressemblance >= 3) choix.push({ sorte: 'minerai', matiere: c.matiere, forme: autreForme }, { sorte: 'minerai', matiere: c.matiere, forme: autreForme });
  // Au niveau le plus simple, jamais de charbon en forme de cible : TNT ou l'autre forme.
  const o = parmi(hasard, choix);
  return estLaCible(o, c) ? { sorte: 'tnt' } : o;
}

/** La prochaine caisse : la cible 3 fois sur 4, sinon un piège. */
export function prochainObjet(c: Cible, ressemblance: number, hasard: () => number): Objet {
  return hasard() < PART_CIBLES ? { sorte: 'minerai', ...c } : piege(c, ressemblance, hasard);
}

/** Ce qu'on mesure pendant une manche. */
export interface Mesures {
  /** Secondes sur le chemin, et secondes en tout (pilotage). */
  surChemin: number;
  temps: number;
  cibles: number;
  attrapees: number;
  pieges: number;
  piegesAttrapes: number;
  /** Les touches sans aucune caisse à portée. */
  dansLeVide: number;
  /** Les temps de réaction des bonnes caisses attrapées, en millisecondes. */
  reactions: number[];
}

export const mesuresVides = (): Mesures => ({ surChemin: 0, temps: 0, cibles: 0, attrapees: 0, pieges: 0, piegesAttrapes: 0, dansLeVide: 0, reactions: [] });

export const reussitePilotage = (m: Mesures): number => (m.temps > 0 ? m.surChemin / m.temps : 0);

/** Les caisses : la moyenne des cibles attrapées et des pièges laissés passer (sinon, attraper
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
}

export function resultat(date: string, sorte: Resultat['sorte'], n: Niveaux, m: Mesures): Resultat {
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
  };
}
