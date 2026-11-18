// Les demandes des habitants et la séance du jour, sans affichage. Chaque jour, deux demandes
// (celles faites il y a le plus longtemps d'abord). L'enfant prouve qu'il a compris en donnant
// exactement ce qu'il faut : s'il se trompe, l'habitant dit ce qui manque ou ce qui est en trop.

import type { Panier } from './commerce.ts';

export interface Ligne {
  produit: string;
  nombre: number;
}

export interface EtatDemandes {
  jour: string;
  /** Les demandes du jour. */
  ids: string[];
  acceptees: string[];
  faites: string[];
  /** Dernier jour où chaque demande a été faite. */
  historique: Record<string, string>;
}

export const demandesNeuves = (): EtatDemandes => ({ jour: '', ids: [], acceptees: [], faites: [], historique: {} });

/** Les demandes du jour : on ne change rien en cours de journée. */
export function demandesDuJour(e: EtatDemandes, toutes: readonly string[], jour: string, parJour: number): EtatDemandes {
  if (e.jour === jour) return e;
  const ordre = [...toutes].sort((a, b) => (e.historique[a] ?? '').localeCompare(e.historique[b] ?? ''));
  return { ...e, jour, ids: ordre.slice(0, parJour), acceptees: [], faites: [] };
}

export function accepter(e: EtatDemandes, id: string): EtatDemandes {
  return e.acceptees.includes(id) ? e : { ...e, acceptees: [...e.acceptees, id] };
}

export function terminer(e: EtatDemandes, id: string): EtatDemandes {
  return { ...e, faites: [...new Set([...e.faites, id])], historique: { ...e.historique, [id]: e.jour } };
}

export type Verdict = { juste: true } | { juste: false; manque: Ligne[]; trop: Ligne[] };

/** Ce que l'habitant pense de ce qu'on lui donne. */
export function verifierDon(besoin: readonly Ligne[], donne: Panier): Verdict {
  const manque: Ligne[] = [];
  const trop: Ligne[] = [];
  for (const b of besoin) {
    const n = donne[b.produit] ?? 0;
    if (n < b.nombre) manque.push({ produit: b.produit, nombre: b.nombre - n });
    if (n > b.nombre) trop.push({ produit: b.produit, nombre: n - b.nombre });
  }
  for (const [produit, n] of Object.entries(donne)) {
    if (n > 0 && !besoin.some((b) => b.produit === produit)) trop.push({ produit, nombre: n });
  }
  return manque.length || trop.length ? { juste: false, manque, trop } : { juste: true };
}

/** « 2 carottes et 1 pain ». */
export function enMots(lignes: readonly Ligne[], noms: (id: string) => { nom: string; pluriel: string }): string {
  const morceaux = lignes.map((l) => `${l.nombre} ${l.nombre > 1 ? noms(l.produit).pluriel : noms(l.produit).nom}`);
  return morceaux.length <= 1 ? (morceaux[0] ?? '') : `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`;
}

/** La séance est finie quand les mots du jour sont faits et les demandes du jour aussi. */
export const seanceFinie = (motsFaits: boolean, e: EtatDemandes): boolean => motsFaits && e.ids.length > 0 && e.ids.every((id) => e.faites.includes(id));

/** Les meubles qu'on propose en lot : trois que l'enfant n'a pas encore, dans l'ordre du catalogue. */
export const lotsProposes = (tous: readonly string[], possedes: readonly string[], n = 3): string[] => tous.filter((id) => !possedes.includes(id)).slice(0, n);
