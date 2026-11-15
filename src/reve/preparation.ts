// La préparation : ce que le rêve du soir renvoie à la tablette pour le lendemain.
// Elle arrive par le réseau : on la vérifie entièrement et on la traite comme une donnée.
// Le rêve décide seul des réglages ; tout texte nouveau (propositions) attend le parent.

import type { Jour } from '../memoire/jours.ts';

export type StandRegle = 'defis' | 'horloge' | 'peche';

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
  return { jour: o.jour, resume, niveaux, focus, feuilleton };
}

/** Les éléments du focus passent devant, les autres gardent leur ordre. */
export function ordonner(ids: readonly string[], focus: readonly string[]): string[] {
  const devant = ids.filter((id) => focus.includes(id));
  return [...devant, ...ids.filter((id) => !focus.includes(id))];
}
