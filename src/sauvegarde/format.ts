// Format de la sauvegarde, et ses migrations. Toute évolution du format ajoute une version
// et une migration testée : la progression de l'enfant ne doit jamais se perdre.

import { niveauDeDepart, type Niveau } from '../exercices/generateur.ts';
import type { Noms } from '../histoire/lecture.ts';
import type { Jour } from '../memoire/jours.ts';
import type { EtatElement } from '../memoire/moteur.ts';
import { convertirGarderobe, garderobeNeuve, type Garderobe, type Journee } from '../recompenses/recompenses.ts';
import { suiviManegesNeuf, type SuiviManeges } from '../detente/objectifs.ts';
import type { Preparation } from '../reve/preparation.ts';

export const VERSION = 8;

/** Les réglages du parent. */
export interface Reglages {
  /** Stands éteints par le parent : ils ne s'allument plus et ne comptent plus dans la séance. */
  standsEteints: string[];
  /** Minutes de jeu dans la journée avant que la pause soit proposée. */
  tempsDeJeu: number;
  /** Volumes de 0 à 1. */
  volumeMusique: number;
  volumeBruitages: number;
  /** Vitesse de la voix (0,6 lent à 1,1 rapide). */
  vitesseVoix: number;
  /** Volume de la voix, à part (absent dans les sauvegardes d'avant : 1). */
  volumeVoix?: number;
  /** Palette de couleurs de la fête (absente : pastel). */
  palette?: string;
  /** Qualité graphique : « haute » (défaut) ou « standard » pour une tablette moins puissante. */
  qualite?: string;
}

export function reglagesNeufs(): Reglages {
  return { standsEteints: [], tempsDeJeu: 30, volumeMusique: 1, volumeBruitages: 1, vitesseVoix: 0.92 };
}

/** Une liste ajoutée en vitesse par le parent dans l'espace parent (un mot par ligne). */
export interface ListeRapide {
  id: string;
  titre: string;
  mots: string[];
}

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
  /** Jetons de manège (une manche de révision finie = un jeton). */
  jetons: number;
  /** Ce que l'enfant a fait aux manèges, paliers franchis et décorations gagnées. */
  maneges: SuiviManeges;
  garderobe: Garderobe;
  /** Niveau des défis du chantier (exercices générés). */
  niveauDefis: Niveau;
  /** Niveau des questions de l'horloge. */
  niveauHorloge: Niveau;
  /** Niveau de la pêche aux canards (homophones). */
  niveauPeche: Niveau;
  journees: Record<Jour, Journee>;
  reglages: Reglages;
  /** Le code de l'espace parent, choisi par le parent (absent tant qu'il n'est pas choisi). */
  codeParent?: string;
  /** La dernière préparation reçue du rêve (donnée vérifiée). */
  preparation?: Preparation;
  /** Décisions du parent sur les textes proposés : identifiant → validé ou refusé. */
  validations: Record<string, 'validee' | 'refusee'>;
  listesRapides: ListeRapide[];
  /** Dernier échange réussi avec le dépôt privé (ISO), et dernier problème. */
  synchro: { derniere?: string; probleme?: string };
}

/** Au-delà, les plus vieilles lignes du journal sont retirées (elles seront parties au rêve avant). */
export const JOURNAL_MAX = 5000;

function recompensesNeuves(): Pick<Sauvegarde, 'tickets' | 'roue' | 'garderobe' | 'niveauDefis' | 'journees'> {
  return { tickets: 0, roue: 0, garderobe: garderobeNeuve(), niveauDefis: niveauDeDepart(), journees: {} };
}

function manegesNeufs(): Pick<Sauvegarde, 'jetons' | 'maneges'> {
  return { jetons: 0, maneges: suiviManegesNeuf() };
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
    ...manegesNeufs(),
    niveauHorloge: niveauDeDepart(),
    niveauPeche: niveauDeDepart(),
    ...parentNeuf(),
  };
}

function parentNeuf(): Pick<Sauvegarde, 'reglages' | 'validations' | 'listesRapides' | 'synchro'> {
  return { reglages: reglagesNeufs(), validations: {}, listesRapides: [], synchro: {} };
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
  // Version 5 → 6 : l'espace parent (réglages, validations, listes rapides, échange).
  if (s.version === 5) s = { ...s, version: 6, ...parentNeuf() };
  // Version 6 → 7 : les lots deviennent des accessoires (chapeau, lunettes, haut, chaussures, objet).
  if (s.version === 6) s = { ...s, version: 7, garderobe: convertirGarderobe(s.garderobe) };
  // Version 7 → 8 : les jetons de manège et les objectifs des manèges.
  if (s.version === 7) s = { ...s, version: 8, ...manegesNeufs() };
  if (s.version === VERSION) return s as unknown as Sauvegarde;
  // Une version plus récente que ce code : on refuse plutôt que d'écraser des données.
  throw new Error(`Version de sauvegarde inconnue : ${String(s.version)}`);
}
