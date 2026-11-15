// Format de la sauvegarde, et ses migrations. Toute évolution du format ajoute une version
// et une migration testée : la progression de l'enfant ne doit jamais se perdre.

import type { Noms } from '../histoire/lecture.ts';
import type { Jour } from '../memoire/jours.ts';
import type { EtatElement } from '../memoire/moteur.ts';

export const VERSION = 2;

/** Une ligne du journal. Jamais de prénom. */
export interface EntreeJournal {
  /** Instant de la réponse (ISO). */
  instant: string;
  stand: string;
  manche: 'semaine' | 'memoire' | 'libre';
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
}

/** Au-delà, les plus vieilles lignes du journal sont retirées (elles seront parties au rêve avant). */
export const JOURNAL_MAX = 5000;

export function sauvegardeNeuve(): Sauvegarde {
  return { version: VERSION, arrivees: {}, etats: {}, journal: [], forains: {}, lectures: {} };
}

export function suiviNeuf(): SuiviLecture {
  return { lectures: 0, questions: 0, justes: 0, posees: [], reussie: false };
}

/** Amène une sauvegarde lue, de n'importe quelle version connue, au format actuel. */
export function migrer(brut: unknown): Sauvegarde {
  if (brut === undefined || brut === null) return sauvegardeNeuve();
  if (typeof brut !== 'object') throw new Error('Sauvegarde illisible');
  const version = (brut as { version?: unknown }).version;
  // Version 1 → 2 : les prénoms des forains et le suivi des lectures arrivent.
  if (version === 1) return { ...(brut as Omit<Sauvegarde, 'version'>), version: 2, forains: {}, lectures: {} };
  if (version === VERSION) return brut as Sauvegarde;
  // Une version plus récente que ce code : on refuse plutôt que d'écraser des données.
  throw new Error(`Version de sauvegarde inconnue : ${String(version)}`);
}
