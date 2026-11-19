// La rivière et le bois, sans affichage (tranche 1C). On pêche une fois par jour et on range
// ses poissons par seaux ; on cueille les mûres de trois buissons. Les deux montrent la même
// idée : des groupes égaux, « 3 seaux de 4 poissons, c'est 3 fois 4 ». La taille des groupes
// change chaque jour, pour parcourir les tables de 2 à 5.

import { ecart } from '../dictee/leitner.ts';

export interface EtatRiviere {
  /** Le dernier jour de pêche. */
  peche: string;
  /** Les buissons déjà cueillis, et quel jour. */
  cueillis: { jour: string; buissons: number[] };
}

export const riviereNeuve = (): EtatRiviere => ({ peche: '', cueillis: { jour: '', buissons: [] } });

export const BUISSONS = 3;
const TAILLES = [2, 3, 4, 5];

const rangDuJour = (jour: string): number => Math.max(0, ecart('2026-01-01', jour));

/** La pêche du jour : combien de seaux, et combien de poissons par seau. */
export function pecheDuJour(jour: string): { seaux: number; parSeau: number } {
  const r = rangDuJour(jour);
  return { seaux: 2 + (r % 3), parSeau: TAILLES[(r + 2) % TAILLES.length] ?? 3 };
}

/** Combien de mûres porte chaque buisson ce jour-là. */
export const muresParBuisson = (jour: string): number => TAILLES[rangDuJour(jour) % TAILLES.length] ?? 3;

export const peutPecher = (e: EtatRiviere, jour: string): boolean => e.peche !== jour;

/** Les buissons encore chargés aujourd'hui (ils repoussent chaque jour). */
export function buissonsCharges(e: EtatRiviere, jour: string): number[] {
  const cueillis = e.cueillis.jour === jour ? e.cueillis.buissons : [];
  return Array.from({ length: BUISSONS }, (_, i) => i).filter((i) => !cueillis.includes(i));
}

export function cueillirBuisson(e: EtatRiviere, i: number, jour: string): EtatRiviere | null {
  if (!buissonsCharges(e, jour).includes(i)) return null;
  const avant = e.cueillis.jour === jour ? e.cueillis.buissons : [];
  return { ...e, cueillis: { jour, buissons: [...avant, i] } };
}

/** « 4 + 4 + 4 = 12 ». */
export const addition = (fois: number, nombre: number): string => `${Array.from({ length: fois }, () => nombre).join(' + ')} = ${fois * nombre}`;
