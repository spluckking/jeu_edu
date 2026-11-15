// Le bilan de l'espace parent : progression par stand, éléments fragiles, temps de jeu.
// Fonctions pures, à partir du journal et de la sauvegarde.

import { jourDe, type Jour } from '../memoire/jours.ts';
import type { EtatElement } from '../memoire/moteur.ts';
import type { Journee } from '../recompenses/recompenses.ts';
import type { EntreeJournal } from '../sauvegarde/format.ts';

export interface LigneBilan {
  stand: string;
  reponses: number;
  justes: number;
  aides: number;
}

/** Réponses par stand depuis un jour donné (jeu libre compris : c'est du travail aussi). */
export function bilanDepuis(journal: readonly EntreeJournal[], depuis: Jour): LigneBilan[] {
  const lignes = new Map<string, LigneBilan>();
  for (const e of journal) {
    if (jourDe(new Date(e.instant)) < depuis) continue;
    const l = lignes.get(e.stand) ?? { stand: e.stand, reponses: 0, justes: 0, aides: 0 };
    l.reponses++;
    if (e.reussi) l.justes++;
    if (e.aide) l.aides++;
    lignes.set(e.stand, l);
  }
  return [...lignes.values()].sort((a, b) => b.reponses - a.reponses);
}

export interface Fragile {
  id: string;
  echecs: number;
  reussites: number;
  /** 4 échecs ou plus : le rêve change son format ou propose un moyen de s'en souvenir. */
  sangsue: boolean;
}

/** Les éléments qui résistent : au moins deux échecs, les plus ratés d'abord. */
export function elementsFragiles(etats: Record<string, EtatElement>, max = 12): Fragile[] {
  return Object.entries(etats)
    .filter(([, e]) => e.echecs >= 2)
    .map(([id, e]) => ({ id, echecs: e.echecs, reussites: e.reussites, sangsue: e.echecs >= 4 }))
    .sort((a, b) => b.echecs - a.echecs || a.reussites - b.reussites)
    .slice(0, max);
}

/** Un élément lisible par le parent : « 6 × 7 », « école ». */
export function lisible(id: string): string {
  const calcul = /^x-(\d+)-(\d+)$/.exec(id);
  if (calcul) return `${calcul[1]} × ${calcul[2]}`;
  if (id.startsWith('m-')) return id.slice(2);
  return id;
}

/** Minutes de jeu pour chacun des jours demandés. */
export function minutesParJour(journees: Record<Jour, Journee>, jours: readonly Jour[]): number[] {
  return jours.map((j) => Math.round((journees[j]?.secondes ?? 0) / 60));
}
