// Les 3 exercices du jour à la fête foraine (docs/VILLE.md, « La journée »). Pas plus de 3 par
// jour, choisis dans cet ordre :
//   1. les devoirs de la semaine (les mots ou les calculs arrivés cette semaine, les ateliers du
//      programme validé par le parent) ;
//   2. un point faible : l'exercice le moins réussi ces 7 derniers jours (sous 70 %), ou celui que
//      le rêve a choisi pour aujourd'hui ;
//   3. un exercice bien réussi (80 % ou plus) qu'on n'a pas vu depuis longtemps : il revient, et son
//      niveau monte quand il est réussi (les ateliers ont 3 niveaux, tous dans le CE2) ;
//   puis, s'il reste de la place, celui qu'on n'a pas fait depuis le plus longtemps.
// Chaque exercice va chez son forain habituel ; un atelier prend un forain resté libre. Les autres
// forains se reposent : on peut jouer chez eux pour le plaisir.
// Pur : testé dans fete-du-jour.test.ts.

import type { IdAtelier } from '../reve/preparation.ts';
import type { IdStand } from '../scene/fete.ts';
import type { Jour } from '../memoire/jours.ts';

export const EXERCICES_PAR_JOUR = 3;

/** Le travail habituel des cinq forains. */
export type Habituel = 'tables' | 'mots' | 'calcul' | 'heure' | 'homophones';
export type IdExercice = Habituel | IdAtelier;

export const STAND_HABITUEL: Record<Habituel, IdStand> = {
  tables: 'chamboule',
  mots: 'confiserie',
  calcul: 'chantier',
  heure: 'horloge',
  homophones: 'peche',
};
const ORDRE_STANDS: readonly IdStand[] = ['chamboule', 'confiserie', 'chantier', 'horloge', 'peche'];

export const estHabituel = (e: IdExercice): e is Habituel => e in STAND_HABITUEL;

export type Raison = 'devoirs' | 'faible' | 'reussi' | 'autre';
export interface ExerciceDuJour {
  exercice: IdExercice;
  stand: IdStand;
  raison: Raison;
}

/** Ce qu'on sait d'un exercice : sa réussite ces 7 derniers jours, et le dernier jour fait. */
export interface Historique {
  recents: { total: number; justes: number };
  dernier?: Jour;
}

export interface EntreeDuJour {
  /** Les exercices des devoirs de la semaine, dans l'ordre. */
  devoirs: readonly IdExercice[];
  /** Les exercices qui ont du travail aujourd'hui (les tables et les mots : s'il y a des révisions). */
  possibles: readonly IdExercice[];
  historique: Partial<Record<IdExercice, Historique>>;
  /** Ce que le rêve a choisi pour aujourd'hui (des ateliers), d'après les points faibles. */
  duReve?: readonly IdExercice[];
  /** Pour départager deux exercices à égalité (le hasard du jour). */
  hasard: () => number;
}

/** Il faut au moins ce nombre de réponses récentes pour juger un exercice. */
const MINIMUM = 4;
const taux = (h: Historique | undefined): number | null => (h && h.recents.total >= MINIMUM ? h.recents.justes / h.recents.total : null);

export function exercicesDuJour(e: EntreeDuJour): ExerciceDuJour[] {
  const possibles = new Set(e.possibles);
  const choisis: Array<{ exercice: IdExercice; raison: Raison }> = [];
  const libre = (x: IdExercice): boolean => possibles.has(x) && !choisis.some((c) => c.exercice === x);
  const prendre = (x: IdExercice | undefined, raison: Raison): void => {
    if (x !== undefined && choisis.length < EXERCICES_PAR_JOUR && libre(x)) choisis.push({ exercice: x, raison });
  };
  // Le jour où il a été fait (jamais : tout au début), puis le hasard du jour.
  const ordreAncien = (l: IdExercice[]): IdExercice[] =>
    l
      .map((x) => ({ x, d: e.historique[x]?.dernier ?? '', h: e.hasard() }))
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.h - b.h))
      .map((o) => o.x);

  // 1. Les devoirs.
  for (const x of e.devoirs) prendre(x, 'devoirs');
  // 2. Un point faible : le choix du rêve, sinon le moins réussi.
  const faibles = [...possibles].filter((x) => libre(x) && (taux(e.historique[x]) ?? 1) < 0.7).sort((a, b) => taux(e.historique[a])! - taux(e.historique[b])!);
  const duReve = (e.duReve ?? []).find(libre);
  prendre(duReve ?? faibles[0], 'faible');
  // 3. Un exercice bien réussi, le plus ancien.
  prendre(ordreAncien([...possibles].filter((x) => libre(x) && (taux(e.historique[x]) ?? 0) >= 0.8))[0], 'reussi');
  // Le reste : ce qu'on n'a pas fait depuis le plus longtemps.
  for (const x of ordreAncien([...possibles].filter(libre))) prendre(x, 'autre');

  // Les forains : chacun son travail habituel ; un atelier prend un forain resté libre.
  const pris = new Set(choisis.filter((c) => estHabituel(c.exercice)).map((c) => STAND_HABITUEL[c.exercice as Habituel]));
  return choisis.map((c) => {
    if (estHabituel(c.exercice)) return { ...c, stand: STAND_HABITUEL[c.exercice] };
    const stand = ORDRE_STANDS.find((s) => !pris.has(s))!;
    pris.add(stand);
    return { ...c, stand };
  });
}
