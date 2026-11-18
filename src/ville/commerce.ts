// Ce que l'enfant possède dans la ville et ce qu'il peut en faire, sans affichage : acheter,
// vendre ses pommes (un nombre limité par jour), cueillir au pommier (les pommes repoussent).

import { ajouter as plusJours, ecart } from '../dictee/leitner.ts';
import { ajouter, decomposer, retirer, type PorteMonnaie } from './argent.ts';

export type Panier = Record<string, number>;

/** Le pommier : pommes encore accrochées, et jour où il en redonne quand il est vide. */
export interface Pommier {
  restantes: number;
  repousse: string | null;
}

export interface Ventes {
  jour: string;
  nombre: number;
}

export const POMMES_PAR_ARBRE = 3;
export const JOURS_DE_REPOUSSE = 2;

/** Le pommier tel qu'il est ce jour-là (les pommes ont-elles repoussé ?). */
export function pommierDuJour(p: Pommier, jour: string): Pommier {
  if (p.repousse !== null && ecart(p.repousse, jour) >= 0) return { restantes: POMMES_PAR_ARBRE, repousse: null };
  return p;
}

/** Cueillir une pomme ; null si l'arbre est vide. */
export function cueillir(p: Pommier, jour: string): Pommier | null {
  const arbre = pommierDuJour(p, jour);
  if (arbre.restantes <= 0) return null;
  const restantes = arbre.restantes - 1;
  return { restantes, repousse: restantes === 0 ? plusJours(jour, JOURS_DE_REPOUSSE) : null };
}

export function mettre(panier: Panier, id: string, n = 1): Panier {
  return { ...panier, [id]: (panier[id] ?? 0) + n };
}

export function enlever(panier: Panier, id: string, n = 1): Panier | null {
  const a = panier[id] ?? 0;
  if (a < n) return null;
  const r = { ...panier, [id]: a - n };
  if (r[id] === 0) delete r[id];
  return r;
}

/** Combien de récoltes l'épicière peut encore racheter aujourd'hui. */
export function rachatsRestants(v: Ventes, jour: string, parJour: number): number {
  return v.jour === jour ? Math.max(0, parJour - v.nombre) : parJour;
}

export interface Vente {
  panier: Panier;
  porteMonnaie: PorteMonnaie;
  ventes: Ventes;
  nombre: number;
  paye: number[];
}

/** Vendre toutes les récoltes d'un produit que l'épicière veut bien prendre aujourd'hui. */
export function vendre(panier: Panier, pm: PorteMonnaie, v: Ventes, id: string, prix: number, jour: string, parJour: number): Vente | null {
  const nombre = Math.min(panier[id] ?? 0, rachatsRestants(v, jour, parJour));
  if (nombre <= 0) return null;
  const paye = decomposer(nombre * prix);
  return {
    panier: enlever(panier, id, nombre) ?? panier,
    porteMonnaie: ajouter(pm, paye),
    ventes: { jour, nombre: (v.jour === jour ? v.nombre : 0) + nombre },
    nombre,
    paye,
  };
}

/** Payer un achat : les pièces données sortent, la monnaie rendue rentre, le produit va au panier. */
export function acheter(panier: Panier, pm: PorteMonnaie, id: string, donne: readonly number[], rendu: readonly number[]): { panier: Panier; porteMonnaie: PorteMonnaie } | null {
  const reste = retirer(pm, donne);
  if (!reste) return null;
  return { panier: mettre(panier, id), porteMonnaie: ajouter(reste, rendu) };
}
