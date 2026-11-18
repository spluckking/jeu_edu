// Les grands projets, sans affichage (tranche 1C). Un projet réclame des récoltes, quelques
// euros et des coups de main aux habitants (des demandes faites pendant le projet). L'enfant
// apporte ce qu'il veut, quand il veut ; quand tout y est, le lieu se construit pendant la
// nuit et ouvre le lendemain. Il choisit alors le projet suivant entre deux.

import type { Panier } from './commerce.ts';
import type { Ligne } from './demandes.ts';

export interface Projet {
  id: string;
  recoltes: Ligne[];
  /** En centimes. */
  euros: number;
  /** Demandes à faire pendant le projet. */
  aides: number;
}

export interface EtatProjets {
  /** Le projet en cours, ou null s'il faut en choisir un. */
  enCours: string | null;
  /** Ce qui a déjà été apporté. */
  donnes: Panier;
  euros: number;
  aides: number;
  /** Le jour où le projet a été terminé (le lieu ouvre le lendemain). */
  termine: string;
  /** Les lieux construits. */
  construits: string[];
}

export const projetsNeufs = (premier: string): EtatProjets => ({ enCours: premier, donnes: {}, euros: 0, aides: 0, termine: '', construits: [] });

/** Ce qui manque encore. */
export function reste(p: Projet, e: EtatProjets): { recoltes: Ligne[]; euros: number; aides: number } {
  return {
    recoltes: p.recoltes.map((l) => ({ produit: l.produit, nombre: Math.max(0, l.nombre - (e.donnes[l.produit] ?? 0)) })).filter((l) => l.nombre > 0),
    euros: Math.max(0, p.euros - e.euros),
    aides: Math.max(0, p.aides - e.aides),
  };
}

export function complet(p: Projet, e: EtatProjets): boolean {
  const r = reste(p, e);
  return !r.recoltes.length && r.euros === 0 && r.aides === 0;
}

/** Combien sur combien, pour la barre d'avancement (de 0 à 1). */
export function avancement(p: Projet, e: EtatProjets): number {
  const total = p.recoltes.reduce((a, l) => a + l.nombre, 0) + p.euros / 100 + p.aides;
  const r = reste(p, e);
  const manque = r.recoltes.reduce((a, l) => a + l.nombre, 0) + r.euros / 100 + r.aides;
  return total ? 1 - manque / total : 1;
}

/** Apporter des récoltes : on ne prend que ce qui manque. Renvoie l'état et ce qui a été pris. */
export function apporter(p: Projet, e: EtatProjets, donne: Panier): { etat: EtatProjets; pris: Panier } {
  const pris: Panier = {};
  const donnes = { ...e.donnes };
  for (const l of reste(p, e).recoltes) {
    const n = Math.min(l.nombre, donne[l.produit] ?? 0);
    if (n > 0) {
      pris[l.produit] = n;
      donnes[l.produit] = (donnes[l.produit] ?? 0) + n;
    }
  }
  return { etat: { ...e, donnes }, pris };
}

/** Verser des euros : pas plus que ce qui manque. */
export function verser(p: Projet, e: EtatProjets, montant: number): EtatProjets | null {
  if (montant <= 0 || montant > reste(p, e).euros) return null;
  return { ...e, euros: e.euros + montant };
}

/** Une demande faite pendant un projet compte comme un coup de main. */
export const aider = (e: EtatProjets): EtatProjets => (e.enCours ? { ...e, aides: e.aides + 1 } : e);

/** Tout est réuni : le chantier se termine ce soir. */
export function terminer(e: EtatProjets, jour: string): EtatProjets {
  return e.enCours ? { ...e, termine: jour } : e;
}

/** Le lendemain, le lieu est construit : il rejoint la ville, il faut choisir le projet suivant. */
export function ouvrir(e: EtatProjets, jour: string): EtatProjets {
  if (!e.enCours || !e.termine || e.termine >= jour) return e;
  return { enCours: null, donnes: {}, euros: 0, aides: 0, termine: '', construits: [...e.construits, e.enCours] };
}

export const choisir = (e: EtatProjets, id: string): EtatProjets => ({ ...e, enCours: id, donnes: {}, euros: 0, aides: 0, termine: '' });
