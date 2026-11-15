// Format de la sauvegarde, et ses migrations. Toute évolution du format ajoute une version
// et une migration testée : la progression de l'enfant ne doit jamais se perdre.

import { niveauDeDepart, type Niveau } from '../exercices/generateur.ts';
import type { Noms } from '../histoire/lecture.ts';
import type { Jour } from '../memoire/jours.ts';
import type { EtatElement } from '../memoire/moteur.ts';
import { garderobeNeuve, type Garderobe, type Journee } from '../recompenses/recompenses.ts';

export const VERSION = 5;

/** Une ligne du journal. Jamais de prénom. */
export interface EntreeJournal {
  /** Instant de la réponse (ISO). */
  instant: string;
  stand: string;
  manche: 'semaine' | 'memoire' | 'libre' | 'defis';
  element: string;
  reponse: string;
  reussi: boolean;
  aide: boolean;
  duree: number;
}

/** Ce que l'enfant a fait d'une histoire, pour l'espace parent. */
export interface SuiviLecture {
  /** Nombre de fois où le texte a été lu (cinématique ou relecture). */
  lectures: number;
  questions: number;
  justes: number;
  /** Rangs des questions déjà posées dans le cycle en cours. */
  posees: number[];
  reussie: boolean;
}

export interface Sauvegarde {
  version: typeof VERSION;
  /** Jour où la tablette a vu chaque contenu pour la première fois. */
  arrivees: Record<string, Jour>;
  etats: Record<string, EtatElement>;
  journal: EntreeJournal[];
  /** Les prénoms que l'enfant a donnés aux forains. */
  forains: Noms;
  lectures: Record<string, SuiviLecture>;
  tickets: number;
  /** Pièces de la grande roue déjà construites. */
  roue: number;
  garderobe: Garderobe;
  /** Niveau des défis du chantier (exercices générés). */
  niveauDefis: Niveau;
  /** Niveau des questions de l'horloge. */
  niveauHorloge: Niveau;
  /** Niveau de la pêche aux canards (homophones). */
  niveauPeche: Niveau;
  journees: Record<Jour, Journee>;
}

/** Au-delà, les plus vieilles lignes du journal sont retirées (elles seront parties au rêve avant). */
export const JOURNAL_MAX = 5000;

function recompensesNeuves(): Pick<Sauvegarde, 'tickets' | 'roue' | 'garderobe' | 'niveauDefis' | 'journees'> {
  return { tickets: 0, roue: 0, garderobe: garderobeNeuve(), niveauDefis: niveauDeDepart(), journees: {} };
}

export function sauvegardeNeuve(): Sauvegarde {
  return {
    version: VERSION,
    arrivees: {},
    etats: {},
    journal: [],
    forains: {},
    lectures: {},
    ...recompensesNeuves(),
    niveauHorloge: niveauDeDepart(),
    niveauPeche: niveauDeDepart(),
  };
}

export function suiviNeuf(): SuiviLecture {
  return { lectures: 0, questions: 0, justes: 0, posees: [], reussie: false };
}

/** Amène une sauvegarde lue, de n'importe quelle version connue, au format actuel. */
export function migrer(brut: unknown): Sauvegarde {
  if (brut === undefined || brut === null) return sauvegardeNeuve();
  if (typeof brut !== 'object') throw new Error('Sauvegarde illisible');
  let s = brut as Record<string, unknown>;
  // Version 1 → 2 : les prénoms des forains et le suivi des lectures arrivent.
  if (s.version === 1) s = { ...s, version: 2, forains: {}, lectures: {} };
  // Version 2 → 3 : tickets, grande roue, lots, niveau des défis, journées.
  if (s.version === 2) s = { ...s, version: 3, ...recompensesNeuves() };
  // Version 3 → 4 : le niveau des questions de l'horloge.
  if (s.version === 3) s = { ...s, version: 4, niveauHorloge: niveauDeDepart() };
  // Version 4 → 5 : le niveau de la pêche aux canards.
  if (s.version === 4) s = { ...s, version: 5, niveauPeche: niveauDeDepart() };
  if (s.version === VERSION) return s as unknown as Sauvegarde;
  // Une version plus récente que ce code : on refuse plutôt que d'écraser des données.
  throw new Error(`Version de sauvegarde inconnue : ${String(s.version)}`);
}
