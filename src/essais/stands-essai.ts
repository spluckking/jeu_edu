// Les essais de nouveaux stands pour la fête : les questions, sans affichage (testées dans
// stands-essai.test.ts). Chaque partie a 6 questions ; une question est un nombre à taper, un
// choix à toucher, une somme à donner en pièces, ou une figure à colorier.

import T from '../../content/fete/essais.json';

export type Hasard = () => number;

/** Ce qu'on dessine à côté de la question. */
export type Visuel =
  | { sorte: 'parts'; forme: 'disque' | 'barre'; n: number; colorees: number }
  | { sorte: 'figure'; figure: Figure; tourne: number };

export type Question =
  | { type: 'nombre'; enonce: string; reponse: number; unite?: string; aide: string; visuel?: Visuel }
  | { type: 'choix'; enonce: string; choix: string[]; reponse: string; aide: string; visuel?: Visuel }
  | { type: 'argent'; enonce: string; montant: number; pieces: number[]; aide: string }
  | { type: 'colorier'; enonce: string; forme: 'disque' | 'barre'; n: number; k: number; aide: string };

export interface StandEssai {
  id: string;
  titre: string;
  consigne: string;
  /** Le brouillon est ouvert (stands de calcul). */
  brouillon: boolean;
  questions(hasard: Hasard): Question[];
}

export const QUESTIONS = 6;

export const remplir = (texte: string, v: Record<string, string | number>): string => texte.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));
export const entier = (hasard: Hasard, min: number, max: number): number => min + Math.floor(hasard() * (max - min + 1));
export const parmi = <X>(hasard: Hasard, l: readonly X[]): X => l[Math.floor(hasard() * l.length)]!;
export function melanger<X>(hasard: Hasard, l: readonly X[]): X[] {
  const r = [...l];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}
/** Un nombre écrit avec l'espace des milliers : 3 205. */
export const ecrire = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// --- La monnaie --------------------------------------------------------------------------------

/** Pièces et billets du stand (en centimes) : les centimes ronds arrivent ici. */
export const PIECES_STAND = [1000, 500, 200, 100, 50, 20, 10] as const;

export function euros(c: number): string {
  const e = Math.floor(c / 100);
  const r = c % 100;
  if (!r) return `${e} €`;
  if (!e) return `${r} c`;
  return `${e},${String(r).padStart(2, '0')} €`;
}

/** Le montant en pièces, le moins de pièces possible. */
export function enPieces(montant: number, valeurs: readonly number[] = PIECES_STAND): number[] {
  const r: number[] = [];
  let reste = montant;
  for (const v of valeurs) while (reste >= v) (r.push(v), (reste -= v));
  return r;
}

export const monnaie: StandEssai = {
  id: 'monnaie',
  titre: T.monnaie.titre,
  consigne: T.monnaie.consigne,
  brouillon: true,
  questions(hasard) {
    const objets = melanger(hasard, T.monnaie.objets);
    return Array.from({ length: QUESTIONS }, (_, i): Question => {
      const objet = objets[i % objets.length]!;
      if (i % 2 === 0) {
        const billet = i < 3 ? 10 : 20;
        const prix = entier(hasard, billet === 10 ? 2 : 11, billet - 1);
        const v = { objet, prix, billet, rendu: billet - prix };
        return { type: 'nombre', enonce: remplir(T.monnaie.rendre, v), reponse: billet - prix, unite: '€', aide: remplir(T.monnaie.aideRendre, v) };
      }
      // Des euros et des dizaines de centimes : 3,50 €, 6,20 €…
      const montant = entier(hasard, 1, 9) * 100 + entier(hasard, 1, 9) * 10;
      return {
        type: 'argent',
        enonce: remplir(T.monnaie.donner, { objet, prix: euros(montant) }),
        montant,
        pieces: [...PIECES_STAND],
        aide: remplir(T.monnaie.aideDonner, { pieces: enPieces(montant).map(euros).join(' + ') }),
      };
    });
  },
};

// --- Les mesures -------------------------------------------------------------------------------

interface Conversion {
  de: string;
  vers: string;
  reponse: number;
}

/** Les conversions de CE2 : m et cm, km et m, kg et g. */
export function conversion(hasard: Hasard): Conversion {
  switch (entier(hasard, 0, 4)) {
    case 0: {
      const m = entier(hasard, 1, 9);
      return { de: `${m} m`, vers: 'cm', reponse: m * 100 };
    }
    case 1: {
      const m = entier(hasard, 1, 5);
      const cm = entier(hasard, 1, 9) * 10;
      return { de: `${m} m ${cm} cm`, vers: 'cm', reponse: m * 100 + cm };
    }
    case 2: {
      const m = entier(hasard, 2, 9);
      return { de: `${m * 100} cm`, vers: 'm', reponse: m };
    }
    case 3: {
      const km = entier(hasard, 1, 5);
      return { de: `${km} km`, vers: 'm', reponse: km * 1000 };
    }
    default: {
      const kg = entier(hasard, 1, 5);
      return { de: `${kg} kg`, vers: 'g', reponse: kg * 1000 };
    }
  }
}

export const mesures: StandEssai = {
  id: 'mesures',
  titre: T.mesures.titre,
  consigne: T.mesures.consigne,
  brouillon: true,
  questions(hasard) {
    const phrases = melanger(hasard, T.mesures.phrases);
    return Array.from({ length: QUESTIONS }, (_, i): Question => {
      if (i % 2 === 0) {
        const c = conversion(hasard);
        return { type: 'nombre', enonce: remplir(T.mesures.convertir, { ...c, de: c.de.replace(/\d+/g, (x) => ecrire(Number(x))) }), reponse: c.reponse, unite: c.vers, aide: remplir(T.mesures.aideConvertir, { ...c, reponse: ecrire(c.reponse) }) };
      }
      const p = phrases[i % phrases.length]!;
      const choix = p.sorte === 'longueur' ? ['cm', 'm', 'km'] : ['g', 'kg'];
      return { type: 'choix', enonce: remplir(T.mesures.unite, p), choix, reponse: p.reponse, aide: remplir(T.mesures.aideUnite, p) };
    });
  },
};

// --- Les fractions -----------------------------------------------------------------------------

const NOMS = T.fractions.noms as Record<string, string[]>;
export const PARTS = [2, 3, 4, 5, 6, 8, 10];

/** « un quart », « trois quarts » ; « 1/2 » : « un demi ». */
export function nomFraction(k: number, n: number): string {
  const [un, pluriel] = NOMS[String(n)] ?? ['', ''];
  return k === 1 ? un : `${lettres(k)} ${pluriel}`;
}
export const fraction = (k: number, n: number): string => `${k}/${n}`;

export const fractions: StandEssai = {
  id: 'fractions',
  titre: T.fractions.titre,
  consigne: T.fractions.consigne,
  brouillon: false,
  questions(hasard) {
    return Array.from({ length: QUESTIONS }, (_, i): Question => {
      const n = i < 2 ? parmi(hasard, [2, 3, 4]) : parmi(hasard, PARTS);
      const k = entier(hasard, 1, n - 1);
      const forme = hasard() < 0.5 ? 'disque' : 'barre';
      const v = { k, n, nom: nomFraction(k, n), fraction: fraction(k, n) };
      if (i % 2 === 1) return { type: 'colorier', enonce: remplir(T.fractions.colorier, v), forme, n, k, aide: remplir(T.fractions.aideColorier, v) };
      // Les pièges : l'inverse (n/k), les parts non coloriées (n−k)/n, une part de plus.
      const pieges = new Set([fraction(k, n)]);
      for (const f of [fraction(n - k, n), k + 1 < n ? fraction(k + 1, n) : fraction(k, n + 1), fraction(k, n === 10 ? 8 : n + 1), fraction(1, k + 1)]) {
        if (pieges.size < 4) pieges.add(f);
      }
      // Toujours 4 choix : des fractions voisines si les pièges se ressemblent.
      for (let d = 1; pieges.size < 4; d++) pieges.add(fraction(Math.max(1, (k + d) % n || 1), n + d));
      return {
        type: 'choix',
        enonce: T.fractions.nommer,
        choix: melanger(hasard, [...pieges]),
        reponse: fraction(k, n),
        aide: remplir(T.fractions.aideNommer, v),
        visuel: { sorte: 'parts', forme, n, colorees: k },
      };
    });
  },
};

// --- Les grands nombres ------------------------------------------------------------------------

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

/** De 0 à 99, en lettres (orthographe traditionnelle : traits d'union sous cent). */
function moinsDeCent(n: number): string {
  if (n <= 16) return UNITES[n]!;
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) return `${DIZAINES[d]}${d === 7 && u === 1 ? ' et ' : '-'}${moinsDeCent(10 + u)}`;
  if (u === 0) return d === 8 ? 'quatre-vingts' : DIZAINES[d]!;
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

/** Un nombre de 0 à 10 000 en lettres : « trois mille deux cent cinq ». */
export function lettres(n: number): string {
  if (n < 100) return moinsDeCent(n);
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    const cent = c === 1 ? 'cent' : `${UNITES[c]} cent${r === 0 ? 's' : ''}`;
    return r ? `${cent} ${moinsDeCent(r)}` : cent;
  }
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const mille = m === 1 ? 'mille' : `${moinsDeCent(m)} mille`;
  return r ? `${mille} ${lettres(r)}` : mille;
}

/** Un nombre à 4 chiffres, parfois avec des zéros (3 045, 7 600) : les pièges de CE2. */
export function grandNombre(hasard: Hasard): number {
  const chiffres = [entier(hasard, 1, 9), entier(hasard, 0, 9), entier(hasard, 0, 9), entier(hasard, 0, 9)];
  if (hasard() < 0.4) chiffres[entier(hasard, 1, 3)] = 0;
  return Number(chiffres.join(''));
}

export const nombres: StandEssai = {
  id: 'nombres',
  titre: T.nombres.titre,
  consigne: T.nombres.consigne,
  brouillon: false,
  questions(hasard) {
    const sortes = melanger(hasard, ['enChiffres', 'enChiffres', 'decomposer', 'chiffreDes', 'chiffreDes', 'plusGrand']);
    return sortes.map((sorte): Question => {
      const n = grandNombre(hasard);
      if (sorte === 'enChiffres') {
        const v = { lettres: lettres(n), chiffres: ecrire(n) };
        return { type: 'nombre', enonce: remplir(T.nombres.enChiffres, v), reponse: n, aide: remplir(T.nombres.aideEnChiffres, v) };
      }
      if (sorte === 'decomposer') {
        const parts = [1000, 100, 10, 1].map((p) => Math.floor(n / p) % 10 * p).filter((p) => p > 0);
        const somme = melanger(hasard, parts).map(ecrire).join(' + ');
        return { type: 'nombre', enonce: remplir(T.nombres.decomposer, { somme }), reponse: n, aide: remplir(T.nombres.aideDecomposer, { somme, reponse: ecrire(n) }) };
      }
      if (sorte === 'chiffreDes') {
        const r = entier(hasard, 0, 3);
        const reponse = Math.floor(n / 10 ** r) % 10;
        const detail = [3, 2, 1, 0].map((p) => `${Math.floor(n / 10 ** p) % 10} ${T.nombres.rangs[p]}`).join(', ');
        const v = { nombre: ecrire(n), rang: T.nombres.rangs[r]!, reponse, detail };
        return { type: 'nombre', enonce: remplir(T.nombres.chiffreDes, v), reponse, aide: remplir(T.nombres.aideChiffreDes, v) };
      }
      // Le plus grand : les mêmes chiffres, dans un autre ordre.
      const c = String(n).split('');
      const autres = new Set([n]);
      for (let essai = 0; autres.size < 4 && essai < 40; essai++) {
        const m = Number(melanger(hasard, c).join(''));
        if (m >= 1000) autres.add(m);
      }
      for (let d = 1; autres.size < 4; d++) autres.add(n - d * 10 >= 1000 ? n - d * 10 : n + d * 100);
      const plusGrand = Math.max(...autres);
      return { type: 'choix', enonce: T.nombres.plusGrand, choix: melanger(hasard, [...autres].map(ecrire)), reponse: ecrire(plusGrand), aide: remplir(T.nombres.aidePlusGrand, { reponse: ecrire(plusGrand) }) };
    });
  },
};

// --- Les formes --------------------------------------------------------------------------------

export type Figure = keyof typeof T.formes.figures;
export const FIGURES = Object.keys(T.formes.figures) as Figure[];
export const COTES: Record<Figure, number> = { carre: 4, rectangle: 4, losange: 4, triangle: 3, triangleRectangle: 3, cercle: 0, pentagone: 5, hexagone: 6 };
export const ANGLES_DROITS: Record<Figure, number> = { carre: 4, rectangle: 4, losange: 0, triangle: 0, triangleRectangle: 1, cercle: 0, pentagone: 0, hexagone: 0 };

export const formes: StandEssai = {
  id: 'formes',
  titre: T.formes.titre,
  consigne: T.formes.consigne,
  brouillon: false,
  questions(hasard) {
    const sortes = melanger(hasard, ['nom', 'nom', 'nom', 'cotes', 'anglesDroits', 'anglesDroits']);
    return sortes.map((sorte): Question => {
      const avecCotes = FIGURES.filter((f) => f !== 'cercle');
      const figure = parmi(hasard, sorte === 'nom' ? FIGURES : sorte === 'cotes' ? avecCotes : (['carre', 'rectangle', 'losange', 'triangle', 'triangleRectangle'] as Figure[]));
      const d = T.formes.figures[figure];
      // Un peu tournée, parfois : un carré reste un carré.
      const visuel: Visuel = { sorte: 'figure', figure, tourne: hasard() < 0.3 ? parmi(hasard, [15, 30, -20]) : 0 };
      const v = { nom: d.nom, article: d.article.charAt(0).toUpperCase() + d.article.slice(1), pourquoi: d.pourquoi };
      if (sorte === 'nom') {
        const choix = new Set([d.nom]);
        for (const f of melanger(hasard, FIGURES)) if (choix.size < 4) choix.add(T.formes.figures[f].nom);
        return { type: 'choix', enonce: T.formes.nom, choix: melanger(hasard, [...choix]), reponse: d.nom, aide: remplir(T.formes.aideNom, { ...v, article: d.article }), visuel };
      }
      const n = sorte === 'cotes' ? COTES[figure] : ANGLES_DROITS[figure];
      return { type: 'nombre', enonce: sorte === 'cotes' ? T.formes.cotes : T.formes.anglesDroits, reponse: n, aide: remplir(sorte === 'cotes' ? T.formes.aideCotes : T.formes.aideAnglesDroits, { ...v, n }), visuel };
    });
  },
};

export const STANDS_ESSAI: readonly StandEssai[] = [monnaie, mesures, fractions, nombres, formes];
