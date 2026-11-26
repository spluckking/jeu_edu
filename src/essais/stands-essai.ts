// Les ateliers des stands (monnaie, mesures, fractions, nombres, formes, phrases) : les
// questions, sans affichage (testées dans stands-essai.test.ts). Une question est un nombre à
// taper, un choix à toucher, une somme à donner en pièces, ou une figure à colorier. Chaque
// atelier a plusieurs sortes de questions ; chaque question dit quelle compétence elle travaille
// (« mesures.convertir.m-cm »), pour les statistiques et pour le rêve, qui peut demander
// d'insister sur une compétence le lendemain.

import T from '../../content/fete/essais.json';

export type Hasard = () => number;

/** Ce qu'on dessine à côté de la question. */
export type Visuel =
  | { sorte: 'parts'; forme: 'disque' | 'barre'; n: number; colorees: number; theme?: 'pizza' | 'chocolat' }
  | { sorte: 'deux'; forme: 'disque' | 'barre'; a: { n: number; k: number }; b: { n: number; k: number } }
  | { sorte: 'collection'; n: number }
  | { sorte: 'figure'; figure: Figure; tourne: number };

/** Le tableau de conversion à montrer dans le brouillon : la grandeur (ses colonnes), et les
 *  unités de la question, mises en couleur. */
export interface Tableau {
  grandeur: 'longueur' | 'masse';
  unites: string[];
}
/** Les colonnes du tableau de conversion, de la plus grande unité à la plus petite. */
export const COLONNES: Record<Tableau['grandeur'], readonly string[]> = {
  longueur: ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm'],
  masse: ['kg', 'hg', 'dag', 'g'],
};

/** Ce que fabrique chaque sorte de question (sans la compétence). */
export type QuestionBrute =
  | { type: 'nombre'; enonce: string; reponse: number; unite?: string; aide: string; visuel?: Visuel; tableau?: Tableau }
  | { type: 'choix'; enonce: string; choix: string[]; reponse: string; aide: string; visuel?: Visuel; tableau?: Tableau }
  | { type: 'argent'; enonce: string; montant: number; pieces: number[]; aide: string }
  | { type: 'colorier'; enonce: string; forme: 'disque' | 'barre'; n: number; k: number; aide: string };

/** Une question, et la compétence qu'elle travaille (« mesures.convertir.m-cm »). */
export type Question = QuestionBrute & { competence: string };

/** Une sorte de question. rang : sa place dans la partie (à partir de 0), pour monter doucement ;
 *  niveau : celui de l'atelier (1 à NIVEAU_ATELIER_MAX, tout dans le programme de CE2) ;
 *  detail : la précision de la compétence (« m-cm »). */
type Sorte = (hasard: Hasard, rang: number, niveau: number) => QuestionBrute & { detail?: string };

/** Les niveaux d'un atelier : 1 (début de CE2), 2 (le milieu, le niveau de départ), 3 (fin de CE2).
 *  Jamais au-delà : on reste dans le programme de CE2. */
export const NIVEAU_ATELIER_MAX = 3;
export const NIVEAU_ATELIER_DEPART = 2;
/** Après une partie : au moins 80 % trouvés du premier coup, un cran plus dur ; moins de 60 %, un
 *  cran plus facile. */
export function niveauApres(niveau: number, reussies: number, total: number): number {
  if (!total) return niveau;
  const r = reussies / total;
  const n = r >= 0.8 ? niveau + 1 : r < 0.6 ? niveau - 1 : niveau;
  return Math.max(1, Math.min(NIVEAU_ATELIER_MAX, n));
}

export interface StandEssai {
  id: string;
  titre: string;
  consigne: string;
  /** Le brouillon est ouvert (stands de calcul). */
  brouillon: boolean;
  /** Les sortes de questions de l'atelier. */
  sortes: Record<string, Sorte>;
  /** Le mélange habituel d'une partie (répété si la partie est plus longue). */
  melange: readonly string[];
  /** n questions (6 par défaut) ; focus : les compétences sur lesquelles insister ; niveau : de 1
   *  à NIVEAU_ATELIER_MAX (2 par défaut). */
  questions(hasard: Hasard, n?: number, focus?: readonly string[], niveau?: number): Question[];
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
export const ecrire = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Une compétence et un focus se rejoignent-ils ? « mesures » vise « mesures.convertir.m-cm »,
 *  et « mesures.convertir.m-cm » vise la sorte « mesures.convertir ». */
export function seRejoignent(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);
}

/** Le plan d'une partie : le mélange habituel ; s'il y a un focus sur cet atelier, une question
 *  sur deux porte sur les sortes visées. */
export function planDePartie(id: string, sortes: readonly string[], melange: readonly string[], hasard: Hasard, n: number, focus: readonly string[]): string[] {
  const plan = Array.from({ length: n }, (_, i) => melange[i % melange.length]!);
  const visees = sortes.filter((s) => focus.some((f) => seRejoignent(`${id}.${s}`, f)));
  if (visees.length) for (let i = 1, k = 0; i < n; i += 2, k++) plan[i] = visees[k % visees.length]!;
  return melanger(hasard, plan);
}

function atelier(a: Omit<StandEssai, 'questions'>): StandEssai {
  return {
    ...a,
    questions(hasard, n = QUESTIONS, focus = [], niveau = NIVEAU_ATELIER_DEPART) {
      return planDePartie(a.id, Object.keys(a.sortes), a.melange, hasard, n, focus).map((s, rang) => {
        const { detail, ...q } = a.sortes[s]!(hasard, rang, niveau);
        return { ...q, competence: [a.id, s, ...(detail ? [detail] : [])].join('.') } as Question;
      });
    },
  };
}

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

export const monnaie: StandEssai = atelier({
  id: 'monnaie',
  titre: T.monnaie.titre,
  consigne: T.monnaie.consigne,
  brouillon: true,
  melange: ['rendre', 'payer'],
  sortes: {
    // Rendre la monnaie sur un billet de 10 €, puis de 20 € plus loin dans la partie (niveau 1 :
    // toujours 10 € ; niveau 3 : 20 € ou 50 €).
    rendre(hasard, rang, niveau) {
      const objet = parmi(hasard, T.monnaie.objets);
      const billet = niveau <= 1 ? 10 : niveau >= 3 ? parmi(hasard, [20, 50]) : rang < 3 ? 10 : 20;
      const prix = entier(hasard, billet === 10 ? 2 : billet === 20 ? 11 : 21, billet - 1);
      const v = { objet, prix, billet, rendu: billet - prix };
      return { type: 'nombre', enonce: remplir(T.monnaie.rendre, v), reponse: billet - prix, unite: '€', aide: remplir(T.monnaie.aideRendre, v), detail: `billet-${billet}` };
    },
    // Des euros et des dizaines de centimes : 3,50 €, 6,20 €… (niveau 1 : des euros ronds ;
    // niveau 3 : jusqu'à 19,90 €).
    payer(hasard, _rang, niveau) {
      const objet = parmi(hasard, T.monnaie.objets);
      const montant = niveau <= 1 ? entier(hasard, 2, 9) * 100 : entier(hasard, 1, niveau >= 3 ? 19 : 9) * 100 + entier(hasard, 1, 9) * 10;
      return {
        type: 'argent',
        enonce: remplir(T.monnaie.donner, { objet, prix: euros(montant) }),
        montant,
        pieces: [...PIECES_STAND],
        aide: remplir(T.monnaie.aideDonner, { pieces: enPieces(montant).map(euros).join(' + ') }),
      };
    },
  },
});

// --- Les mesures -------------------------------------------------------------------------------

interface Conversion {
  de: string;
  vers: string;
  grandeur: Tableau['grandeur'];
  reponse: number;
  /** Ce qui est converti, pour les statistiques : « m-cm », « km-m »… */
  sorte: string;
}

/** Les conversions des leçons (mm, cm, dm, m, km), et les kilos en grammes. Niveau 1 : une seule
 *  unité, les plus simples ; niveau 2 : toutes ; niveau 3 : les mesures mixtes, et les conversions
 *  dans l'autre sens ou entre unités éloignées (g → kg, m → mm). */
export function conversion(hasard: Hasard, niveau = NIVEAU_ATELIER_DEPART): Conversion {
  const cas = niveau <= 1 ? parmi(hasard, [0, 2, 5, 6, 8]) : niveau >= 3 ? parmi(hasard, [1, 3, 4, 7, 9, 10, 11]) : entier(hasard, 0, 8);
  switch (cas) {
    case 9: {
      const kg = entier(hasard, 2, 9);
      return { de: `${kg * 1000} g`, vers: 'kg', grandeur: 'masse', reponse: kg, sorte: 'g-kg' };
    }
    case 10: {
      const m = entier(hasard, 1, 5);
      return { de: `${m} m`, vers: 'mm', grandeur: 'longueur', reponse: m * 1000, sorte: 'm-mm' };
    }
    case 11: {
      // 2 kg 300 g = 2 300 g.
      const kg = entier(hasard, 1, 4);
      const g = entier(hasard, 1, 9) * 100;
      return { de: `${kg} kg ${g} g`, vers: 'g', grandeur: 'masse', reponse: kg * 1000 + g, sorte: 'kgg-g' };
    }
    case 0: {
      const m = entier(hasard, 1, 9);
      return { de: `${m} m`, vers: 'cm', grandeur: 'longueur', reponse: m * 100, sorte: 'm-cm' };
    }
    case 1: {
      // 136 cm = 1 m 36 cm : la mesure mixte, en centimètres.
      const m = entier(hasard, 1, 5);
      const cm = entier(hasard, 1, 99);
      return { de: `${m} m ${cm} cm`, vers: 'cm', grandeur: 'longueur', reponse: m * 100 + cm, sorte: 'mcm-cm' };
    }
    case 2: {
      const m = entier(hasard, 2, 9);
      return { de: `${m * 100} cm`, vers: 'm', grandeur: 'longueur', reponse: m, sorte: 'cm-m' };
    }
    case 3: {
      const km = entier(hasard, 1, 5);
      return { de: `${km} km`, vers: 'm', grandeur: 'longueur', reponse: km * 1000, sorte: 'km-m' };
    }
    case 4: {
      // 1 km 500 m = 1 500 m.
      const km = entier(hasard, 1, 4);
      const m = entier(hasard, 1, 9) * 50;
      return { de: `${km} km ${m} m`, vers: 'm', grandeur: 'longueur', reponse: km * 1000 + m, sorte: 'kmm-m' };
    }
    case 5: {
      const dm = entier(hasard, 1, 9);
      return { de: `${dm} dm`, vers: 'cm', grandeur: 'longueur', reponse: dm * 10, sorte: 'dm-cm' };
    }
    case 6: {
      const cm = entier(hasard, 1, 9);
      return { de: `${cm} cm`, vers: 'mm', grandeur: 'longueur', reponse: cm * 10, sorte: 'cm-mm' };
    }
    case 7: {
      const cm = entier(hasard, 2, 9);
      return { de: `${cm * 10} mm`, vers: 'cm', grandeur: 'longueur', reponse: cm, sorte: 'mm-cm' };
    }
    default: {
      const kg = entier(hasard, 1, 5);
      return { de: `${kg} kg`, vers: 'g', grandeur: 'masse', reponse: kg * 1000, sorte: 'kg-g' };
    }
  }
}

/** Les pas pour parcourir 1 m (la leçon : 20 cm). */
export const PAS = [20, 25, 50] as const;

export const mesures: StandEssai = atelier({
  id: 'mesures',
  titre: T.mesures.titre,
  consigne: T.mesures.consigne,
  brouillon: true,
  // Une fois par partie, le problème des pas.
  melange: ['convertir', 'unite', 'convertir', 'unite', 'pas', 'convertir'],
  sortes: {
    convertir(hasard, _rang, niveau) {
      const c = conversion(hasard, niveau);
      return {
        type: 'nombre',
        enonce: remplir(T.mesures.convertir, { ...c, de: c.de.replace(/\d+/g, (x) => ecrire(Number(x))) }),
        reponse: c.reponse,
        unite: c.vers,
        aide: remplir(T.mesures.aideConvertir, { ...c, reponse: ecrire(c.reponse) }),
        tableau: { grandeur: c.grandeur, unites: [...new Set([...(c.de.match(/[a-z]+/g) ?? []), c.vers])] },
        detail: c.sorte,
      };
    },
    unite(hasard) {
      const p = parmi(hasard, T.mesures.phrases);
      const choix = p.sorte === 'longueur' ? ['mm', 'cm', 'dm', 'm', 'km'] : ['g', 'kg'];
      const grandeur = p.sorte === 'longueur' ? 'longueur' : 'masse';
      return { type: 'choix', enonce: remplir(T.mesures.unite, p), choix, reponse: p.reponse, aide: remplir(T.mesures.aideUnite, p), tableau: { grandeur, unites: [] }, detail: p.sorte };
    },
    pas(hasard) {
      const pas = parmi(hasard, PAS);
      const reponse = 100 / pas;
      const v = { pas, reponse, addition: Array.from({ length: reponse }, () => pas).join(' + ') };
      return { type: 'nombre', enonce: remplir(T.mesures.pas, v), reponse, aide: remplir(T.mesures.aidePas, v), tableau: { grandeur: 'longueur', unites: ['m', 'cm'] } };
    },
  },
});

// --- Les fractions -----------------------------------------------------------------------------

const NOMS = T.fractions.noms as Record<string, string[]>;
export const PARTS = [2, 3, 4, 5, 6, 8, 10];

/** « un quart », « trois quarts » ; « 1/2 » : « un demi ». */
export function nomFraction(k: number, n: number): string {
  const [un, pluriel] = NOMS[String(n)] ?? ['', ''];
  return k === 1 ? un : `${lettres(k)} ${pluriel}`;
}
export const fraction = (k: number, n: number): string => `${k}/${n}`;

/** Une fraction de la partie : simple au début (demis, tiers, quarts) ; niveau 1 : toujours ;
 *  niveau 3 : toutes les parts dès le début. */
function tirerFraction(hasard: Hasard, rang: number, niveau = NIVEAU_ATELIER_DEPART): { k: number; n: number; forme: 'disque' | 'barre'; v: { k: number; n: number; nom: string; fraction: string } } {
  const simple = niveau <= 1 || (niveau === 2 && rang < 2);
  const n = simple ? parmi(hasard, [2, 3, 4]) : parmi(hasard, PARTS);
  const k = entier(hasard, 1, n - 1);
  const forme = hasard() < 0.5 ? 'disque' : 'barre';
  return { k, n, forme, v: { k, n, nom: nomFraction(k, n), fraction: fraction(k, n) } };
}

export const fractions: StandEssai = atelier({
  id: 'fractions',
  titre: T.fractions.titre,
  consigne: T.fractions.consigne,
  brouillon: false,
  melange: ['nommer', 'manger', 'colorier', 'collection', 'comparer', 'manger'],
  sortes: {
    colorier(hasard, rang, niveau) {
      const { k, n, forme, v } = tirerFraction(hasard, rang, niveau);
      return { type: 'colorier', enonce: remplir(T.fractions.colorier, v), forme, n, k, aide: remplir(T.fractions.aideColorier, v) };
    },
    nommer(hasard, rang, niveau) {
      const { k, n, forme, v } = tirerFraction(hasard, rang, niveau);
      return {
        type: 'choix',
        enonce: T.fractions.nommer,
        choix: choixDeFractions(hasard, k, n),
        reponse: fraction(k, n),
        aide: remplir(T.fractions.aideNommer, v),
        visuel: { sorte: 'parts', forme, n, colorees: k },
      };
    },
    // Une pizza ou une tablette de chocolat partagée : la part mangée, en image.
    manger(hasard, rang, niveau) {
      const { k, n, v } = tirerFraction(hasard, rang, niveau);
      const theme = hasard() < 0.5 ? 'pizza' : 'chocolat';
      const t = T.fractions[theme];
      const w = { ...v, parts: k > 1 ? t.parts : t.part };
      return {
        type: 'choix',
        enonce: remplir(t.enonce, w),
        choix: choixDeFractions(hasard, k, n),
        reponse: fraction(k, n),
        aide: remplir(T.fractions.aideManger, w),
        visuel: { sorte: 'parts', forme: theme === 'pizza' ? 'disque' : 'barre', n, colorees: k, theme },
        detail: theme,
      };
    },
    // Laquelle est la plus grande ? Deux parts de la même tarte, en image. Niveaux 1 et 2 : un
    // demi, un tiers, un quart… (plus on coupe, plus la part est petite) ; niveau 3 : aussi deux
    // fractions qui ont les mêmes parts (3/8 et 5/8).
    comparer(hasard, _rang, niveau) {
      // Deux tartes rondes : l'énoncé parle de tartes.
      const forme = 'disque';
      const memesParts = niveau >= 3 && hasard() < 0.5;
      let a: { n: number; k: number };
      let b: { n: number; k: number };
      if (memesParts) {
        const n = parmi(hasard, [4, 5, 6, 8, 10]);
        const [k1, k2] = melanger(hasard, Array.from({ length: n - 1 }, (_, i) => i + 1));
        a = { n, k: k1! };
        b = { n, k: k2! };
      } else {
        const [n1, n2] = melanger(hasard, niveau <= 1 ? [2, 3, 4] : PARTS);
        a = { n: n1!, k: 1 };
        b = { n: n2!, k: 1 };
      }
      const grand = a.k / a.n > b.k / b.n ? a : b;
      const petit = grand === a ? b : a;
      const v = { grande: fraction(grand.k, grand.n), petite: fraction(petit.k, petit.n), nomGrande: nomFraction(grand.k, grand.n), nomPetite: nomFraction(petit.k, petit.n) };
      return {
        type: 'choix',
        enonce: T.fractions.comparer,
        choix: [fraction(a.k, a.n), fraction(b.k, b.n)],
        reponse: v.grande,
        aide: remplir(memesParts ? T.fractions.aideComparerMemes : T.fractions.aideComparer, v),
        visuel: { sorte: 'deux', forme, a, b },
        detail: memesParts ? 'memes-parts' : 'unite',
      };
    },
    // La moitié, le tiers, le quart d'un paquet de bonbons, dessinés.
    collection(hasard, _rang, niveau) {
      const n = parmi(hasard, niveau <= 1 ? [2] : niveau === 2 ? [2, 3, 4] : [2, 3, 4, 5, 10]);
      const reponse = entier(hasard, 2, niveau <= 1 ? 6 : niveau === 2 ? 5 : 4);
      const total = n * reponse;
      const v = { total, n, reponse, fraction: fraction(1, n), nom: (T.fractions.partDe as Record<string, string>)[String(n)] ?? fraction(1, n), Nom: '' };
      v.Nom = v.nom.charAt(0).toUpperCase() + v.nom.slice(1);
      return {
        type: 'nombre',
        enonce: remplir(T.fractions.collection, v),
        reponse,
        aide: remplir(T.fractions.aideCollection, v),
        visuel: { sorte: 'collection', n: total },
        detail: `1-${n}`,
      };
    },
  },
});

/** Quatre fractions à choisir, dont la bonne : les pièges sont l'inverse, les parts qui restent,
 *  une part de plus. */
function choixDeFractions(hasard: Hasard, k: number, n: number): string[] {
  const pieges = new Set([fraction(k, n)]);
  for (const f of [fraction(n - k, n), k + 1 < n ? fraction(k + 1, n) : fraction(k, n + 1), fraction(k, n === 10 ? 8 : n + 1), fraction(1, k + 1)]) {
    if (pieges.size < 4) pieges.add(f);
  }
  // Toujours 4 choix : des fractions voisines si les pièges se ressemblent.
  for (let d = 1; pieges.size < 4; d++) pieges.add(fraction(Math.max(1, (k + d) % n || 1), n + d));
  return melanger(hasard, [...pieges]);
}

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

/** Un nombre à 4 chiffres, parfois avec des zéros (3 045, 7 600) : les pièges de CE2. Niveau 1 :
 *  3 chiffres ; niveau 3 : des zéros plus souvent. */
export function grandNombre(hasard: Hasard, niveau = NIVEAU_ATELIER_DEPART): number {
  if (niveau <= 1) return entier(hasard, 100, 999);
  const chiffres = [entier(hasard, 1, 9), entier(hasard, 0, 9), entier(hasard, 0, 9), entier(hasard, 0, 9)];
  if (hasard() < (niveau >= 3 ? 0.75 : 0.4)) chiffres[entier(hasard, 1, 3)] = 0;
  return Number(chiffres.join(''));
}

export const nombres: StandEssai = atelier({
  id: 'nombres',
  titre: T.nombres.titre,
  consigne: T.nombres.consigne,
  brouillon: false,
  melange: ['enChiffres', 'enChiffres', 'decomposer', 'chiffreDes', 'chiffreDes', 'plusGrand'],
  sortes: {
    enChiffres(hasard, _rang, niveau) {
      const n = grandNombre(hasard, niveau);
      const v = { lettres: lettres(n), chiffres: ecrire(n) };
      return { type: 'nombre', enonce: remplir(T.nombres.enChiffres, v), reponse: n, aide: remplir(T.nombres.aideEnChiffres, v) };
    },
    decomposer(hasard, _rang, niveau) {
      const n = grandNombre(hasard, niveau);
      const parts = [1000, 100, 10, 1].map((p) => (Math.floor(n / p) % 10) * p).filter((p) => p > 0);
      const somme = melanger(hasard, parts).map(ecrire).join(' + ');
      return { type: 'nombre', enonce: remplir(T.nombres.decomposer, { somme }), reponse: n, aide: remplir(T.nombres.aideDecomposer, { somme, reponse: ecrire(n) }) };
    },
    chiffreDes(hasard, _rang, niveau) {
      const n = grandNombre(hasard, niveau);
      const r = entier(hasard, 0, n >= 1000 ? 3 : 2);
      const reponse = Math.floor(n / 10 ** r) % 10;
      const detail = [3, 2, 1, 0].map((p) => `${Math.floor(n / 10 ** p) % 10} ${T.nombres.rangs[p]}`).join(', ');
      const v = { nombre: ecrire(n), rang: T.nombres.rangs[r]!, reponse, detail };
      return { type: 'nombre', enonce: remplir(T.nombres.chiffreDes, v), reponse, aide: remplir(T.nombres.aideChiffreDes, v), detail: ['unites', 'dizaines', 'centaines', 'milliers'][r] };
    },
    // Le plus grand : les mêmes chiffres, dans un autre ordre.
    plusGrand(hasard, _rang, niveau) {
      const n = grandNombre(hasard, Math.max(2, niveau));
      const c = String(n).split('');
      const autres = new Set([n]);
      for (let essai = 0; autres.size < 4 && essai < 40; essai++) {
        const m = Number(melanger(hasard, c).join(''));
        if (m >= 1000) autres.add(m);
      }
      for (let d = 1; autres.size < 4; d++) autres.add(n - d * 10 >= 1000 ? n - d * 10 : n + d * 100);
      const plusGrand = Math.max(...autres);
      return { type: 'choix', enonce: T.nombres.plusGrand, choix: melanger(hasard, [...autres].map(ecrire)), reponse: ecrire(plusGrand), aide: remplir(T.nombres.aidePlusGrand, { reponse: ecrire(plusGrand) }) };
    },
  },
});

// --- Les formes --------------------------------------------------------------------------------

export type Figure = keyof typeof T.formes.figures;
export const FIGURES = Object.keys(T.formes.figures) as Figure[];
export const COTES: Record<Figure, number> = { carre: 4, rectangle: 4, losange: 4, triangle: 3, triangleRectangle: 3, cercle: 0, pentagone: 5, hexagone: 6 };
export const ANGLES_DROITS: Record<Figure, number> = { carre: 4, rectangle: 4, losange: 0, triangle: 0, triangleRectangle: 1, cercle: 0, pentagone: 0, hexagone: 0 };

const FIGURES_DE_BASE: Figure[] = ['carre', 'rectangle', 'triangle', 'cercle'];

function questionForme(hasard: Hasard, sorte: 'nom' | 'cotes' | 'anglesDroits', niveau = NIVEAU_ATELIER_DEPART): QuestionBrute & { detail: string } {
  const toutes = niveau <= 1 ? FIGURES_DE_BASE : FIGURES;
  const avecCotes = toutes.filter((f) => f !== 'cercle');
  const figure = parmi(hasard, sorte === 'nom' ? toutes : sorte === 'cotes' ? avecCotes : (['carre', 'rectangle', 'losange', 'triangle', 'triangleRectangle'] as Figure[]).filter((f) => toutes.includes(f)));
  const d = T.formes.figures[figure];
  // Un peu tournée, parfois : un carré reste un carré.
  const tournee = niveau <= 1 ? 0 : niveau >= 3 ? 0.7 : 0.3;
  const visuel: Visuel = { sorte: 'figure', figure, tourne: hasard() < tournee ? parmi(hasard, [15, 30, -20]) : 0 };
  const v = { nom: d.nom, article: d.article.charAt(0).toUpperCase() + d.article.slice(1), pourquoi: d.pourquoi };
  if (sorte === 'nom') {
    const choix = new Set([d.nom]);
    for (const f of melanger(hasard, toutes.length >= 4 ? toutes : FIGURES)) if (choix.size < 4) choix.add(T.formes.figures[f].nom);
    return { type: 'choix', enonce: T.formes.nom, choix: melanger(hasard, [...choix]), reponse: d.nom, aide: remplir(T.formes.aideNom, { ...v, article: d.article }), visuel, detail: figure };
  }
  const n = sorte === 'cotes' ? COTES[figure] : ANGLES_DROITS[figure];
  return { type: 'nombre', enonce: sorte === 'cotes' ? T.formes.cotes : T.formes.anglesDroits, reponse: n, aide: remplir(sorte === 'cotes' ? T.formes.aideCotes : T.formes.aideAnglesDroits, { ...v, n }), visuel, detail: figure };
}

export const formes: StandEssai = atelier({
  id: 'formes',
  titre: T.formes.titre,
  consigne: T.formes.consigne,
  brouillon: false,
  melange: ['nom', 'nom', 'nom', 'cotes', 'anglesDroits', 'anglesDroits'],
  sortes: {
    nom: (hasard, _rang, niveau) => questionForme(hasard, 'nom', niveau),
    cotes: (hasard, _rang, niveau) => questionForme(hasard, 'cotes', niveau),
    anglesDroits: (hasard, _rang, niveau) => questionForme(hasard, 'anglesDroits', niveau),
  },
});

// --- Les phrases : le pluriel, les groupes de mots ---------------------------------------------

type Role = keyof typeof T.phrases.questions;

export const phrases: StandEssai = atelier({
  id: 'phrases',
  titre: T.phrases.titre,
  consigne: T.phrases.consigne,
  brouillon: false,
  melange: ['pluriel', 'groupe'],
  sortes: {
    pluriel(hasard) {
      const m = parmi(hasard, T.phrases.mots);
      const regle = (T.phrases.regles as Record<string, string>)[m.regle] ?? '';
      return { type: 'choix', enonce: remplir(T.phrases.pluriel, { singulier: m.singulier }), choix: melanger(hasard, m.choix), reponse: m.choix[0]!, aide: remplir(T.phrases.aidePluriel, { regle, reponse: m.choix[0]! }), detail: m.regle };
    },
    // Les groupes : une phrase de la leçon, une question sur un de ses groupes.
    groupe(hasard) {
      const ex = parmi(hasard, T.phrases.exemples);
      const roles = Object.entries(ex.roles) as Array<[Role, number]>;
      const [role, k] = parmi(hasard, roles);
      const reponse = ex.groupes[k]!;
      return {
        type: 'choix',
        enonce: remplir(T.phrases.groupe, { phrase: ex.phrase, question: T.phrases.questions[role] }),
        choix: [...ex.groupes],
        reponse,
        aide: remplir(role === 'supprimer' ? T.phrases.aideSupprimer : T.phrases.aideGroupe, { reponse }),
        detail: role,
      };
    },
  },
});

export const STANDS_ESSAI: readonly StandEssai[] = [monnaie, mesures, fractions, nombres, formes, phrases];
