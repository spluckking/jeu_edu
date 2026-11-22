// La préparation : ce que le rêve du soir renvoie à la tablette pour le lendemain.
// Elle arrive par le réseau : on la vérifie entièrement et on la traite comme une donnée.
// Le rêve décide seul des réglages ; tout texte nouveau (propositions) attend le parent.

import { MANEGES, type IdManege } from '../detente/objectifs.ts';
import type { Jour } from '../memoire/jours.ts';

export type StandRegle = 'defis' | 'horloge' | 'peche';

/** Les ateliers que peut prendre un stand de la fête (voir src/ville/programme.ts). */
export const ATELIERS = ['monnaie', 'mesures', 'fractions', 'nombres', 'formes', 'phrases'] as const;
export type IdAtelier = (typeof ATELIERS)[number];
const STANDS = ['chamboule', 'confiserie', 'chantier', 'horloge', 'peche'] as const;
const COMPETENCE = /^[a-zA-Z0-9-]{1,30}(.[a-zA-Z0-9àâäçéèêëîïôöùûüÿ'-]{1,30}){0,3}$/;

export interface Preparation {
  /** Le jour pour lequel elle a été préparée. */
  jour: Jour;
  /** Le résumé du rêve pour le parent, deux lignes en langage simple. */
  resume: string;
  /** Niveaux de départ conseillés pour les exercices fabriqués (1 à 5). */
  niveaux: Partial<Record<StandRegle, number>>;
  /** Éléments à faire passer en premier dans les manches (déjà validés, déjà présents). */
  focus: string[];
  /** Textes nouveaux proposés, en attente du parent : des semaines de feuilleton. */
  feuilleton: unknown[];
  /**
   * Le prochain cadeau de chaque manège, choisi dans le catalogue du jeu (« ballons-bleu »,
   * « chapeau-pilote »…). Facultatif ; un cadeau impossible est remplacé par l'ordre prévu.
   */
  recompenses?: Partial<Record<IdManege, string>>;
  /** La ville : grandes quêtes et demandes proposées (vérifiées en détail par la ville, puis
   *  validées par le parent). */
  quetes?: unknown[];
  demandes?: unknown[];
  /** Les compétences sur lesquelles insister ce jour-là (d'après les statistiques). */
  competences?: string[];
  /** Pour ce jour-là, l'atelier des stands que le programme de la semaine laisse libres. */
  ateliers?: Partial<Record<(typeof STANDS)[number], IdAtelier>>;
}

const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9'àâäçéèêëîïôöùûüÿœæ-]{1,60}$/;

/** Vérifie une préparation brute ; null si elle est illisible (le jeu garde la précédente). */
export function lirePreparation(brut: unknown): Preparation | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const o = brut as Record<string, unknown>;
  if (typeof o.jour !== 'string' || !JOUR.test(o.jour)) return null;
  const resume = typeof o.resume === 'string' ? o.resume.slice(0, 400) : '';
  const niveaux: Partial<Record<StandRegle, number>> = {};
  if (typeof o.niveaux === 'object' && o.niveaux !== null) {
    for (const cle of ['defis', 'horloge', 'peche'] as const) {
      const n = (o.niveaux as Record<string, unknown>)[cle];
      if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5) niveaux[cle] = n;
    }
  }
  const focus = Array.isArray(o.focus) ? o.focus.filter((x): x is string => typeof x === 'string' && ID.test(x)).slice(0, 40) : [];
  const feuilleton = Array.isArray(o.feuilleton) ? o.feuilleton.slice(0, 4) : [];
  const recompenses: Partial<Record<IdManege, string>> = {};
  if (typeof o.recompenses === 'object' && o.recompenses !== null) {
    for (const id of MANEGES) {
      const code = (o.recompenses as Record<string, unknown>)[id];
      if (typeof code === 'string' && /^[a-z-]{1,40}$/.test(code)) recompenses[id] = code;
    }
  }
  const quetes = Array.isArray(o.quetes) ? o.quetes.slice(0, 2) : [];
  const demandes = Array.isArray(o.demandes) ? o.demandes.slice(0, 8) : [];
  const competences = Array.isArray(o.competences) ? o.competences.filter((x): x is string => typeof x === 'string' && COMPETENCE.test(x)).slice(0, 12) : [];
  const ateliers: Partial<Record<(typeof STANDS)[number], IdAtelier>> = {};
  if (typeof o.ateliers === 'object' && o.ateliers !== null) {
    for (const s of STANDS) {
      const a = (o.ateliers as Record<string, unknown>)[s];
      if (typeof a === 'string' && (ATELIERS as readonly string[]).includes(a)) ateliers[s] = a as IdAtelier;
    }
  }
  return {
    jour: o.jour,
    resume,
    niveaux,
    focus,
    feuilleton,
    ...(Object.keys(recompenses).length > 0 ? { recompenses } : {}),
    ...(quetes.length ? { quetes } : {}),
    ...(demandes.length ? { demandes } : {}),
    ...(competences.length ? { competences } : {}),
    ...(Object.keys(ateliers).length ? { ateliers } : {}),
  };
}

/** Les éléments du focus passent devant, les autres gardent leur ordre. */
export function ordonner(ids: readonly string[], focus: readonly string[]): string[] {
  const devant = ids.filter((id) => focus.includes(id));
  return [...devant, ...ids.filter((id) => !focus.includes(id))];
}
