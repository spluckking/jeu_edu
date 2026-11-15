// Les règles de la pause calme, sans navigateur : quand elle arrive, laquelle, combien de temps.

import { ecartEnJours, type Jour } from '../memoire/jours.ts';

/** Cohérence cardiaque : 5 s pour inspirer, 5 s pour souffler, 9 fois (1 min 30). */
export const INSPIRER = 5;
export const SOUFFLER = 5;
export const RESPIRATIONS = 9;

export type ExercicePause = 'ballon' | 'sens';

/** La pause est due quand la moitié du travail du jour est faite, et pas encore prise. */
export function pauseDue(total: number, faites: number, dejaPrise: boolean): boolean {
  return !dejaPrise && total > 0 && faites * 2 >= total;
}

/** Un jour le ballon, le lendemain la pleine conscience. */
export function exerciceDuJour(jour: Jour): ExercicePause {
  return ecartEnJours('2026-01-01', jour) % 2 === 0 ? 'ballon' : 'sens';
}

/** Les étapes de la pleine conscience : la phrase dite et affichée, et sa durée en secondes. */
export const ETAPES_SENS: ReadonlyArray<[string, number]> = [
  ['Installe-toi bien. Pose tes mains sur tes genoux.', 10],
  ['Respire doucement. Sens l’air qui entre, et qui sort.', 15],
  ['Écoute les bruits autour de toi. Combien de sons entends-tu ?', 20],
  ['Sens tes pieds. Appuie-les doucement sur le sol.', 15],
  ['Regarde autour de toi et trouve trois choses bleues.', 20],
  ['Respire encore une fois, tout doucement. Tu es calme et prêt.', 10],
];
