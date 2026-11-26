// Tickets, grande roue, lots et calendrier. Les récompenses saluent l'effort et la régularité,
// jamais la vitesse ni le score, et rien ne s'obtient par tirage au sort. Fonctions pures.

import { ajouterJours, jourDeSemaine, type Jour } from '../memoire/jours.ts';

export const TICKETS_PAR_MANCHE = 3;
export const TICKETS_HISTOIRE = 2;
export const BONUS_SEANCE = 2;
export const PRIX_PIECE = 8;
/** Chaque manche de révision finie donne un jeton de manège (les tickets restent pour la roue). */
export const JETONS_PAR_MANCHE = 1;
/** Un tour de manège (autos, trampoline, palais des glaces), en jetons, tant que la séance du jour n'est pas finie. */
export const PRIX_MANEGE = 1;

/** L'accès aux manèges : gratuit et illimité une fois la séance du jour finie, sinon en jetons. */
export function accesManege(jetons: number, seanceFinie: boolean): 'gratuit' | 'payant' | 'manque' {
  if (seanceFinie) return 'gratuit';
  return jetons >= PRIX_MANEGE ? 'payant' : 'manque';
}
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
  /** Questions d'atelier faites aujourd'hui, par stand (programme de la semaine). */
  ateliers?: Record<string, number>;
  /** Les 3 exercices de la fête aujourd'hui (choisis à la première visite du jour). */
  exercices?: Array<{ exercice: string; stand: string; raison: string }>;
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

/** Les lots sont des accessoires, rangés par place sur le personnage. */
export const GENRES = ['chapeau', 'lunettes', 'haut', 'chaussures', 'objet'] as const;
export type GenreLot = (typeof GENRES)[number];

export const NOMS_GENRES: Record<GenreLot, string> = {
  chapeau: 'Chapeaux',
  lunettes: 'Lunettes',
  haut: 'Hauts',
  chaussures: 'Chaussures',
  objet: 'Objets',
};

export interface Lot {
  id: string;
  nom: string;
  genre: GenreLot;
  /** Se gagne seulement aux manèges, jamais dans la vitrine de fin de séance. */
  manege?: true;
}

export const LOTS: readonly Lot[] = [
  { id: 'chapeau-casquette', nom: 'Casquette', genre: 'chapeau' },
  { id: 'chapeau-paille', nom: 'Chapeau de paille', genre: 'chapeau' },
  { id: 'chapeau-bonnet', nom: 'Bonnet à pompon', genre: 'chapeau' },
  { id: 'chapeau-haut', nom: 'Chapeau haut', genre: 'chapeau' },
  { id: 'chapeau-magicien', nom: 'Chapeau de magicien', genre: 'chapeau' },
  { id: 'chapeau-couronne', nom: 'Couronne', genre: 'chapeau' },
  { id: 'lunettes-rondes', nom: 'Lunettes rondes', genre: 'lunettes' },
  { id: 'lunettes-soleil', nom: 'Lunettes de soleil', genre: 'lunettes' },
  { id: 'lunettes-rouges', nom: 'Grosses lunettes rouges', genre: 'lunettes' },
  { id: 'haut-corail', nom: 'Pull corail', genre: 'haut' },
  { id: 'haut-bleu', nom: 'Pull bleu', genre: 'haut' },
  { id: 'haut-menthe', nom: 'T-shirt menthe', genre: 'haut' },
  { id: 'haut-lilas', nom: 'Sweat lilas', genre: 'haut' },
  { id: 'haut-orange', nom: 'Pull orange', genre: 'haut' },
  { id: 'haut-jaune', nom: 'T-shirt jaune', genre: 'haut' },
  { id: 'haut-mariniere', nom: 'Marinière', genre: 'haut' },
  { id: 'haut-salopette', nom: 'Salopette', genre: 'haut' },
  { id: 'chaussures-bottines', nom: 'Bottines', genre: 'chaussures' },
  { id: 'chaussures-rouges', nom: 'Baskets rouges', genre: 'chaussures' },
  { id: 'chaussures-pluie', nom: 'Bottes de pluie', genre: 'chaussures' },
  { id: 'chaussures-bleues', nom: 'Baskets bleues', genre: 'chaussures' },
  { id: 'objet-sac', nom: 'Sac à dos', genre: 'objet' },
  { id: 'objet-ballon', nom: 'Ballon', genre: 'objet' },
  { id: 'objet-sucette', nom: 'Sucette', genre: 'objet' },
  { id: 'objet-baguette', nom: 'Baguette étoile', genre: 'objet' },
  { id: 'objet-epuisette', nom: 'Épuisette', genre: 'objet' },
  // Les cadeaux des manèges (voir src/detente/objectifs.ts).
  { id: 'chapeau-pilote', nom: 'Casque de pilote', genre: 'chapeau', manege: true },
  { id: 'objet-volant', nom: 'Volant d’auto', genre: 'objet', manege: true },
  { id: 'chapeau-etoile', nom: 'Serre-tête étoile', genre: 'chapeau', manege: true },
  { id: 'chaussures-ressorts', nom: 'Chaussures à ressorts', genre: 'chaussures', manege: true },
  { id: 'lunettes-miroir', nom: 'Lunettes miroir', genre: 'lunettes', manege: true },
  { id: 'haut-paillettes', nom: 'Pull à paillettes', genre: 'haut', manege: true },
];

/** Les lots qu'on peut choisir dans la vitrine de fin de séance. */
export const LOTS_VITRINE: readonly Lot[] = LOTS.filter((l) => !l.manege);

/** Ce que l'enfant possède dès le début. */
export const LOTS_DE_DEPART = ['chapeau-casquette', 'haut-corail', 'chaussures-bottines', 'objet-sac'];

/** Ce que porte le personnage : un lot par place, ou « rien » (toujours permis). */
export type Porte = Record<GenreLot, string>;

export interface Garderobe {
  possedes: string[];
  porte: Porte;
}

export function garderobeNeuve(): Garderobe {
  return {
    possedes: [...LOTS_DE_DEPART],
    porte: { chapeau: 'chapeau-casquette', lunettes: 'rien', haut: 'haut-corail', chaussures: 'chaussures-bottines', objet: 'objet-sac' },
  };
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

/** Enlever ce qui est porté à cette place (par exemple : plus de chapeau). */
export function retirer(g: Garderobe, genre: GenreLot): Garderobe {
  return { ...g, porte: { ...g.porte, [genre]: 'rien' } };
}

/**
 * Les anciens lots (version 6 : tenues et maillots) deviennent des accessoires. Rien de ce que
 * l'enfant avait gagné ne se perd : chaque ancien lot donne au moins un accessoire.
 */
const ANCIENS: Record<string, string[]> = {
  'tenue-casquette': ['chapeau-casquette', 'objet-sac'],
  'tenue-chapeau': ['chapeau-haut', 'objet-ballon'],
  'tenue-couronne': ['chapeau-couronne', 'objet-baguette'],
  'tenue-bonnet': ['chapeau-bonnet', 'objet-sucette'],
  'maillot-rouge': ['haut-corail'],
  'maillot-bleu': ['haut-bleu'],
  'maillot-vert': ['haut-menthe'],
  'maillot-violet': ['haut-lilas'],
  'maillot-orange': ['haut-orange'],
  'maillot-jaune': ['haut-jaune'],
};

export function convertirGarderobe(ancienne: unknown): Garderobe {
  const neuve = garderobeNeuve();
  if (typeof ancienne !== 'object' || ancienne === null) return neuve;
  const a = ancienne as { possedes?: unknown; porte?: { tenue?: unknown; maillot?: unknown } };
  const possedes = new Set(neuve.possedes);
  for (const id of Array.isArray(a.possedes) ? a.possedes : []) for (const n of ANCIENS[String(id)] ?? []) possedes.add(n);
  let g: Garderobe = { possedes: [...possedes], porte: { ...neuve.porte } };
  for (const ancien of [a.porte?.tenue, a.porte?.maillot]) for (const n of ANCIENS[String(ancien)] ?? []) g = porter(g, n);
  return g;
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
