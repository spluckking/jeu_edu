// Tickets, grande roue, lots et calendrier. Les récompenses saluent l'effort et la régularité,
// jamais la vitesse ni le score, et rien ne s'obtient par tirage au sort. Fonctions pures.

import { ajouterJours, jourDeSemaine, type Jour } from '../memoire/jours.ts';

export const TICKETS_PAR_MANCHE = 3;
export const TICKETS_HISTOIRE = 2;
export const BONUS_SEANCE = 2;
export const PRIX_PIECE = 8;
export const PIECES_ROUE = 10;
export const DEFIS_PAR_SEANCE = 5;
export const HEURES_PAR_SEANCE = 4;
export const PECHES_PAR_SEANCE = 4;
/** Après ce temps de jeu dans la journée, un forain propose une pause (minutes). */
export const TEMPS_DE_JEU = 30;

/** Ce que l'enfant a fait un jour donné. */
export interface Journee {
  /** Défis du chantier réussis aujourd'hui. */
  defis: number;
  /** Questions de l'horloge réussies aujourd'hui (absent dans les journées d'avant l'horloge). */
  heures?: number;
  /** Travail du jour compté à la première ouverture (révisions + exercices), et fait. */
  total?: number;
  faites?: number;
  /** La pause calme du jour a été prise. */
  pause?: boolean;
  /** L'épisode du feuilleton lu aujourd'hui (un seul par jour). */
  histoire?: string;
  /** Canards pêchés juste aujourd'hui. */
  peches?: number;
  /** Secondes de jeu aujourd'hui (écran ouvert et visible), et la pause proposée. */
  secondes?: number;
  pauseProposee?: boolean;
  ticketsGagnes: number;
  /** La séance du jour est finie (le bonus est donné une fois). */
  finie: boolean;
  /** Le lot de cette séance a été choisi. */
  lotChoisi: boolean;
}

export function journeeNeuve(): Journee {
  return { defis: 0, heures: 0, ticketsGagnes: 0, finie: false, lotChoisi: false };
}

// --- Lots -------------------------------------------------------------------------------

export type GenreLot = 'tenue' | 'maillot';

export interface Lot {
  id: string;
  nom: string;
  genre: GenreLot;
  /** Tenue : 0 à 3 (voir personne.ts). Maillot : une couleur. */
  valeur: number;
}

export const LOTS: readonly Lot[] = [
  { id: 'tenue-casquette', nom: 'Casquette et sac', genre: 'tenue', valeur: 0 },
  { id: 'tenue-chapeau', nom: 'Chapeau et ballon', genre: 'tenue', valeur: 1 },
  { id: 'tenue-couronne', nom: 'Couronne et cape', genre: 'tenue', valeur: 2 },
  { id: 'tenue-bonnet', nom: 'Bonnet et écharpe', genre: 'tenue', valeur: 3 },
  { id: 'maillot-rouge', nom: 'Maillot rouge', genre: 'maillot', valeur: 0xff5a6e },
  { id: 'maillot-bleu', nom: 'Maillot bleu', genre: 'maillot', valeur: 0x4c9cff },
  { id: 'maillot-vert', nom: 'Maillot vert', genre: 'maillot', valeur: 0x5cc44a },
  { id: 'maillot-violet', nom: 'Maillot violet', genre: 'maillot', valeur: 0xa77bf0 },
  { id: 'maillot-orange', nom: 'Maillot orange', genre: 'maillot', valeur: 0xff9a3a },
  { id: 'maillot-jaune', nom: 'Maillot jaune', genre: 'maillot', valeur: 0xffd447 },
];

/** Ce que l'enfant possède dès le début. */
export const LOTS_DE_DEPART = ['tenue-casquette', 'maillot-rouge'];

export interface Garderobe {
  possedes: string[];
  porte: { tenue: string; maillot: string };
}

export function garderobeNeuve(): Garderobe {
  return { possedes: [...LOTS_DE_DEPART], porte: { tenue: 'tenue-casquette', maillot: 'maillot-rouge' } };
}

export function lot(id: string): Lot | undefined {
  return LOTS.find((l) => l.id === id);
}

/** Choisir un lot de la vitrine : il est possédé et porté tout de suite. */
export function choisirLot(g: Garderobe, id: string): Garderobe {
  const l = lot(id);
  if (!l) return g;
  return {
    possedes: g.possedes.includes(id) ? g.possedes : [...g.possedes, id],
    porte: { ...g.porte, [l.genre]: id },
  };
}

/** Mettre un lot déjà possédé. */
export function porter(g: Garderobe, id: string): Garderobe {
  const l = lot(id);
  if (!l || !g.possedes.includes(id)) return g;
  return { ...g, porte: { ...g.porte, [l.genre]: id } };
}

// --- Grande roue -----------------------------------------------------------------------

export function peutConstruire(tickets: number, pieces: number): boolean {
  return tickets >= PRIX_PIECE && pieces < PIECES_ROUE;
}

// --- Calendrier ------------------------------------------------------------------------

/** Les 7 jours de la semaine du jour donné, du lundi au dimanche. */
export function semaineDe(jour: Jour): Jour[] {
  // jourDeSemaine : 0 dimanche … 6 samedi.
  const decalage = (jourDeSemaine(jour) + 6) % 7;
  const lundi = ajouterJours(jour, -decalage);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}
