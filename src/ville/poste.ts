// La poste, sans affichage (tranche 1C). Une fois par jour, l'enfant trie le courrier :
// chaque lettre va dans le casier de la première lettre du nom ; puis il range quelques
// lettres dans l'ordre de l'alphabet. Ensuite, des lettres sont à livrer aux habitants.

import { ecart } from '../dictee/leitner.ts';

export interface EtatPoste {
  /** Le dernier jour où le courrier a été trié. */
  tri: string;
  /** Les habitants qui attendent une lettre. */
  aLivrer: string[];
}

export const posteNeuve = (): EtatPoste => ({ tri: '', aLivrer: [] });

/** La première lettre d'un nom de famille, sans accent : « Mme Élie » → « E ». */
export function initiale(nom: string): string {
  const famille = nom.split(' ').slice(-1)[0] ?? nom;
  return famille.normalize('NFD').replace(/\p{M}/gu, '').charAt(0).toUpperCase();
}

const famille = (nom: string): string => nom.split(' ').slice(-1)[0] ?? nom;

/** Les noms dans l'ordre de l'alphabet (le nom de famille compte, pas « M. » ni « Mme »). */
export const dansLOrdre = (noms: readonly string[]): string[] => [...noms].sort((a, b) => famille(a).localeCompare(famille(b), 'fr', { sensitivity: 'base' }));

/** Mélange stable : le même jour donne toujours le même courrier. */
function melanger<T>(t: readonly T[], graine: number): T[] {
  const r = [...t];
  let g = graine + 1;
  for (let i = r.length - 1; i > 0; i--) {
    g = (g * 16807) % 2147483647;
    const j = g % (i + 1);
    [r[i], r[j]] = [r[j] as T, r[i] as T];
  }
  return r;
}

const rangDuJour = (jour: string): number => Math.max(0, ecart('2026-01-01', jour));

/** Le courrier du jour : des noms aux initiales toutes différentes. */
export function courrierDuJour(noms: readonly string[], jour: string, n = 5): string[] {
  const vus = new Set<string>();
  const choisis: string[] = [];
  for (const nom of melanger(noms, rangDuJour(jour))) {
    if (vus.has(initiale(nom))) continue;
    vus.add(initiale(nom));
    choisis.push(nom);
    if (choisis.length === n) break;
  }
  return choisis;
}

/** Les casiers : les initiales du courrier, plus une en trop, dans l'ordre de l'alphabet. */
export function casiers(courrier: readonly string[], jour: string): string[] {
  const pris = new Set(courrier.map(initiale));
  const libres = [...'ABCDEFGHIJLMNOPRSTV'].filter((l) => !pris.has(l));
  const enTrop = libres[rangDuJour(jour) % libres.length] ?? 'Z';
  return [...pris, enTrop].sort();
}

export const peutTrier = (e: EtatPoste, jour: string): boolean => e.tri !== jour;
