// L'argent de la ville : de vrais euros, comptés en centimes pour ne jamais arrondir. L'enfant a
// un porte-monnaie de pièces et de billets ; il paie lui-même, l'épicière lui demande combien
// elle doit rendre. Au début, que des euros ronds ; les centimes viendront avec le niveau.

/** Les pièces et billets des euros ronds, du plus grand au plus petit (en centimes). */
export const PIECES_RONDES = [2000, 1000, 500, 200, 100] as const;

/** Un porte-monnaie : combien de pièces ou de billets de chaque valeur (en centimes). */
export type PorteMonnaie = Record<number, number>;

export const somme = (pieces: readonly number[]): number => pieces.reduce((a, b) => a + b, 0);

export function total(pm: PorteMonnaie): number {
  return Object.entries(pm).reduce((t, [valeur, n]) => t + Number(valeur) * n, 0);
}

/** Les pièces du porte-monnaie, une par une, de la plus grande à la plus petite. */
export function pieces(pm: PorteMonnaie): number[] {
  return Object.entries(pm)
    .flatMap(([valeur, n]) => Array.from({ length: n }, () => Number(valeur)))
    .sort((a, b) => b - a);
}

/** Le montant en pièces, le moins de pièces possible (pour donner ou rendre). */
export function decomposer(montant: number, valeurs: readonly number[] = PIECES_RONDES): number[] {
  const resultat: number[] = [];
  let reste = montant;
  for (const v of valeurs) {
    while (reste >= v) {
      resultat.push(v);
      reste -= v;
    }
  }
  return resultat;
}

export function ajouter(pm: PorteMonnaie, ajout: readonly number[]): PorteMonnaie {
  const r = { ...pm };
  for (const v of ajout) r[v] = (r[v] ?? 0) + 1;
  return r;
}

/** Retire des pièces ; null si le porte-monnaie ne les a pas. */
export function retirer(pm: PorteMonnaie, retrait: readonly number[]): PorteMonnaie | null {
  const r = { ...pm };
  for (const v of retrait) {
    if (!r[v]) return null;
    r[v] -= 1;
    if (r[v] === 0) delete r[v];
  }
  return r;
}

export type Paiement =
  | { etat: 'pas-assez'; manque: number }
  /** Une pièce donnée ne sert à rien : sans elle, le compte y est encore. */
  | { etat: 'trop'; inutile: number }
  | { etat: 'juste' }
  | { etat: 'a-rendre'; rendu: number };

/** Ce que dit l'épicière des pièces posées sur le comptoir. */
export function juger(donne: readonly number[], prix: number): Paiement {
  const s = somme(donne);
  if (s < prix) return { etat: 'pas-assez', manque: prix - s };
  if (s === prix) return { etat: 'juste' };
  const inutile = [...donne].sort((a, b) => a - b).find((v) => s - v >= prix);
  if (inutile !== undefined) return { etat: 'trop', inutile };
  return { etat: 'a-rendre', rendu: s - prix };
}

/** Des euros écrits comme sur une étiquette : « 3 € », « 2,50 € ». */
export function euros(centimes: number): string {
  const e = Math.floor(centimes / 100);
  const c = centimes % 100;
  return c === 0 ? `${e} €` : `${e},${String(c).padStart(2, '0')} €`;
}

/** Payer un prix fixe sans compter soi-même (un tour de manège) : la plus petite pièce qui suffit,
 *  ou plusieurs petites ; la monnaie est rendue. Null si le porte-monnaie ne suffit pas. */
export function payerSimplement(pm: PorteMonnaie, prix: number): PorteMonnaie | null {
  if (total(pm) < prix) return null;
  const tout = pieces(pm).sort((x, y) => x - y);
  const une = tout.find((v) => v >= prix);
  if (une !== undefined) return ajouter(retirer(pm, [une]) ?? pm, decomposer(une - prix));
  // Que des petites pièces : on en donne jusqu'à atteindre le prix.
  const donne: number[] = [];
  for (const v of tout.reverse()) {
    if (somme(donne) >= prix) break;
    donne.push(v);
  }
  return ajouter(retirer(pm, donne) ?? pm, decomposer(somme(donne) - prix));
}
