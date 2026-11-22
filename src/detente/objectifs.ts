// Les objectifs des manèges : chaque manège compte ce que l'enfant y fait (étoiles attrapées,
// sauts réussis, palais traversés), d'un jour à l'autre, sans jamais rien retirer. À chaque
// palier, un cadeau : une décoration qui s'installe autour du manège, ou un accessoire qu'on ne
// gagne qu'aux manèges. Le rêve du soir peut choisir le prochain cadeau (preparation.recompenses).
// Rien n'est tiré au sort. Fonctions pures, sans navigateur.

export type IdManege = 'autos' | 'trampoline' | 'glaces' | 'chaises';
export const MANEGES: readonly IdManege[] = ['autos', 'trampoline', 'glaces', 'chaises'];

/** Ce que l'on compte à chaque manège : [un, plusieurs]. */
export const UNITES: Record<IdManege, readonly [string, string]> = {
  autos: ['étoile', 'étoiles'],
  trampoline: ['saut réussi', 'sauts réussis'],
  glaces: ['palais traversé', 'palais traversés'],
  chaises: ['ballon éclaté', 'ballons éclatés'],
};

const PALIERS: Record<IdManege, { debut: readonly number[]; ensuite: number }> = {
  autos: { debut: [10, 25, 45, 70, 100], ensuite: 35 },
  trampoline: { debut: [10, 25, 45, 70, 100], ensuite: 35 },
  glaces: { debut: [1, 3, 6, 10, 15], ensuite: 5 },
  chaises: { debut: [10, 25, 45, 70, 100], ensuite: 35 },
};

/** Le total à atteindre pour le palier de ce rang (0 : le premier). Les paliers ne finissent jamais. */
export function seuil(id: IdManege, rang: number): number {
  const { debut, ensuite } = PALIERS[id];
  const dernier = debut[debut.length - 1] ?? 0;
  return rang < debut.length ? (debut[rang] ?? 0) : dernier + (rang - debut.length + 1) * ensuite;
}

// --- Les cadeaux ---------------------------------------------------------------------------

export const MODELES = ['ballons', 'lampions', 'fanions', 'coupe', 'fleurs', 'etoile', 'nounours'] as const;
export type Modele = (typeof MODELES)[number];
export const TEINTES = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'rose'] as const;
export type Teinte = (typeof TEINTES)[number];

export const NOMS_MODELES: Record<Modele, string> = {
  ballons: 'Bouquet de ballons',
  lampions: 'Lampions',
  fanions: 'Mât à fanions',
  coupe: 'Coupe dorée',
  fleurs: 'Massif de fleurs',
  etoile: 'Grande étoile',
  nounours: 'Gros nounours',
};

/** Les teintes par défaut, quand le rêve n'en donne pas. */
const TEINTE_DE: Record<Modele, Teinte> = {
  ballons: 'rouge',
  lampions: 'jaune',
  fanions: 'bleu',
  coupe: 'jaune',
  fleurs: 'rose',
  etoile: 'jaune',
  nounours: 'rose',
};

/** Autour de chaque manège, il y a de la place pour six décorations. */
export const PLACES = 6;

/** Les accessoires qu'on ne gagne qu'aux manèges (définis avec les autres lots). */
export const LOTS_DES_MANEGES: Record<IdManege, readonly string[]> = {
  autos: ['chapeau-pilote', 'objet-volant'],
  trampoline: ['chapeau-etoile', 'chaussures-ressorts'],
  glaces: ['lunettes-miroir', 'haut-paillettes'],
  // Pas encore d'accessoire propre aux chaises volantes : des décorations seulement.
  chaises: [],
};
const TOUS_LES_LOTS = new Set(Object.values(LOTS_DES_MANEGES).flat());

export interface Decoration {
  modele: Modele;
  teinte: Teinte;
}

export type Recompense = ({ type: 'decoration' } & Decoration) | { type: 'accessoire'; lot: string };

/** Dans l'ordre, si le rêve ne propose rien : on alterne décorations et accessoires. */
const ORDRE: Record<IdManege, readonly string[]> = {
  autos: ['ballons-rouge', 'chapeau-pilote', 'fanions-jaune', 'coupe', 'objet-volant', 'etoile', 'nounours-bleu', 'lampions'],
  trampoline: ['ballons-bleu', 'chapeau-etoile', 'fleurs', 'coupe', 'chaussures-ressorts', 'etoile-rose', 'nounours', 'fanions-vert'],
  glaces: ['lampions-violet', 'lunettes-miroir', 'fleurs-bleu', 'coupe', 'haut-paillettes', 'etoile', 'nounours-violet', 'ballons-jaune'],
  chaises: ['fanions-rose', 'ballons-vert', 'lampions-bleu', 'coupe', 'etoile-violet', 'fleurs-jaune', 'nounours-rouge'],
};

export interface SuiviManeges {
  /** Le total compté à chaque manège. */
  compte: Record<IdManege, number>;
  /** Le nombre de paliers déjà franchis. */
  paliers: Record<IdManege, number>;
  /** Les décorations installées autour de chaque manège, dans l'ordre des places. */
  decorations: Record<IdManege, Decoration[]>;
}

export function suiviManegesNeuf(): SuiviManeges {
  return {
    compte: { autos: 0, trampoline: 0, glaces: 0, chaises: 0 },
    paliers: { autos: 0, trampoline: 0, glaces: 0, chaises: 0 },
    decorations: { autos: [], trampoline: [], glaces: [], chaises: [] },
  };
}

/** Un suivi d'avant un nouveau manège : le nouveau part de zéro, rien d'autre ne change. */
export function completerSuivi(s: SuiviManeges): SuiviManeges {
  const neuf = suiviManegesNeuf();
  return {
    compte: { ...neuf.compte, ...s.compte },
    paliers: { ...neuf.paliers, ...s.paliers },
    decorations: { ...neuf.decorations, ...s.decorations },
  };
}

/**
 * Lit un cadeau écrit en toutes lettres : un accessoire des manèges (« chapeau-pilote »), ou une
 * décoration (« ballons », « ballons-bleu »). Null s'il n'existe pas ou n'est plus possible ici.
 */
export function lireRecompense(code: string, id: IdManege, suivi: SuiviManeges, possedes: readonly string[]): Recompense | null {
  if (TOUS_LES_LOTS.has(code)) return possedes.includes(code) ? null : { type: 'accessoire', lot: code };
  const [modele, teinte, ...reste] = code.split('-');
  if (reste.length > 0 || !(MODELES as readonly string[]).includes(modele ?? '')) return null;
  if (teinte !== undefined && !(TEINTES as readonly string[]).includes(teinte)) return null;
  const m = modele as Modele;
  const t = (teinte as Teinte | undefined) ?? TEINTE_DE[m];
  const ici = suivi.decorations[id];
  if (ici.length >= PLACES) return null;
  // Deux fois le même objet au même manège, ce serait moins drôle.
  if (ici.some((d) => d.modele === m)) return null;
  return { type: 'decoration', modele: m, teinte: t };
}

/** Le prochain cadeau de ce manège : celui que propose le rêve s'il est possible, sinon l'ordre prévu. */
export function prochaineRecompense(id: IdManege, suivi: SuiviManeges, possedes: readonly string[], propose?: string): Recompense | null {
  for (const code of [...(propose ? [propose] : []), ...ORDRE[id], ...MODELES]) {
    const r = lireRecompense(code, id, suivi, possedes);
    if (r) return r;
  }
  return null;
}

/** Compte n de plus à ce manège ; dit si un palier vient d'être franchi. */
export function compter(suivi: SuiviManeges, id: IdManege, n = 1): { suivi: SuiviManeges; palier: boolean } {
  const total = suivi.compte[id] + n;
  const palier = total >= seuil(id, suivi.paliers[id]);
  return {
    suivi: {
      ...suivi,
      compte: { ...suivi.compte, [id]: total },
      paliers: palier ? { ...suivi.paliers, [id]: suivi.paliers[id] + 1 } : suivi.paliers,
    },
    palier,
  };
}

/** Installe une décoration gagnée (les accessoires vont dans la garde-robe, à part). */
export function installer(suivi: SuiviManeges, id: IdManege, r: Recompense): SuiviManeges {
  if (r.type !== 'decoration') return suivi;
  return { ...suivi, decorations: { ...suivi.decorations, [id]: [...suivi.decorations[id], { modele: r.modele, teinte: r.teinte }] } };
}

/** Où en est l'enfant vers le prochain cadeau (depuis : le total au palier d'avant). */
export function objectif(suivi: SuiviManeges, id: IdManege): { fait: number; depuis: number; but: number; unite: string } {
  const rang = suivi.paliers[id];
  const but = seuil(id, rang);
  const [un, plusieurs] = UNITES[id];
  return { fait: suivi.compte[id], depuis: rang > 0 ? seuil(id, rang - 1) : 0, but, unite: but > 1 ? plusieurs : un };
}
