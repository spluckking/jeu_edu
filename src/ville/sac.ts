// Le sac à dos : 8 cases ; les objets d'une même sorte s'empilent jusqu'à 10 par case, sauf les
// objets de quête uniques (une lettre, un colis : une case chacun). Ce qui ne rentre pas est posé
// par terre, aux pieds de l'enfant ; ce qu'il jette aussi. Les objets par terre disparaissent le
// lendemain ; les objets d'une quête du jour (colis, lettres, crêpes) disparaissent du sac le
// lendemain avec leur quête. Pur, sans navigateur ; testé dans sac.test.ts.

import type { Panier } from './commerce.ts';

export const CASES = 8;
export const PAR_CASE = 10;
/** Un objet par case : on ne les empile pas. */
export const UNIQUES: readonly string[] = ['lettre', 'colis'];
/** Les objets des quêtes du jour : ils disparaissent le lendemain. */
export const OBJETS_DU_JOUR: readonly string[] = ['lettre', 'colis', 'crepes'];

/** Un objet posé par terre. */
export interface ObjetAuSol {
  id: string;
  produit: string;
  nombre: number;
  x: number;
  z: number;
  /** Le jour où il a été posé (il disparaît le lendemain). */
  jour: string;
}

const casesDe = (produit: string, n: number): number => (n <= 0 ? 0 : UNIQUES.includes(produit) ? n : Math.ceil(n / PAR_CASE));

/** Les cases prises dans le sac. */
export function casesPrises(sac: Panier): number {
  return Object.entries(sac).reduce((t, [p, n]) => t + casesDe(p, n), 0);
}

/** Combien d'objets de cette sorte peuvent encore entrer. */
export function place(sac: Panier, produit: string): number {
  const libres = CASES - casesPrises(sac);
  const n = sac[produit] ?? 0;
  if (UNIQUES.includes(produit)) return Math.max(0, libres);
  const dansLaDerniere = n % PAR_CASE === 0 ? 0 : PAR_CASE - (n % PAR_CASE);
  return Math.max(0, dansLaDerniere + libres * PAR_CASE);
}

/** Met dans le sac ce qui rentre ; rend le sac et ce qui reste (à poser par terre). */
export function ranger(sac: Panier, produit: string, n: number): { sac: Panier; reste: number } {
  const entre = Math.min(n, place(sac, produit));
  return { sac: entre > 0 ? { ...sac, [produit]: (sac[produit] ?? 0) + entre } : sac, reste: n - entre };
}

/** Le sac et le sol au début d'un nouveau jour : les objets de quête du jour quittent le sac,
 *  et tout ce qui était par terre disparaît. */
export function nouveauJour(sac: Panier, sol: readonly ObjetAuSol[], jour: string): { sac: Panier; sol: ObjetAuSol[] } {
  const garde = Object.fromEntries(Object.entries(sac).filter(([p, n]) => n > 0 && !OBJETS_DU_JOUR.includes(p)));
  return { sac: garde, sol: sol.filter((o) => o.jour >= jour) };
}

/** Les cases du sac, dans l'ordre, pour l'affichage : [produit, nombre dans la case]. */
export function casesDuSac(sac: Panier): Array<[string, number]> {
  const cases: Array<[string, number]> = [];
  for (const [p, n] of Object.entries(sac)) {
    if (n <= 0) continue;
    if (UNIQUES.includes(p)) for (let i = 0; i < n; i++) cases.push([p, 1]);
    else for (let r = n; r > 0; r -= PAR_CASE) cases.push([p, Math.min(PAR_CASE, r)]);
  }
  return cases;
}
