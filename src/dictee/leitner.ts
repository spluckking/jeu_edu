// La méthode des mots de dictée, reprise de Dictée-Blocs (js/leitner.js).
//
// Pendant la semaine : 3 boîtes de Leitner planifiées jusqu'au jour de la dictée.
//  - réussite sans indice et sûre → boîte suivante, une seule montée par jour ;
//  - réussite avec indice, ou « j'hésite » → le mot reste dans sa boîte ;
//  - erreur → retour en boîte 1.
// Après la semaine : chaque mot garde sa propre mémoire (intervalle × facilité, à la manière
// d'Anki simplifié) ; il est « su pour toujours » après 4 réussites sûres d'affilée et un
// prochain intervalle d'au moins 45 jours. Pur, sans navigateur. Dates locales « AAAA-MM-JJ ».

export type Jour = string;

export function aujourdhui(date = new Date()): Jour {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function lire(j: Jour): Date {
  const [a, m, d] = j.split('-').map(Number);
  return new Date(a ?? 2000, (m ?? 1) - 1, d ?? 1, 12); // midi : pas de souci d'heure d'été
}

export function ajouter(j: Jour, n: number): Jour {
  const d = lire(j);
  d.setDate(d.getDate() + n);
  return aujourdhui(d);
}

export function ecart(a: Jour, b: Jour): number {
  return Math.round((lire(b).getTime() - lire(a).getTime()) / 86400000);
}

/** Jours avant la dictée (0 le jour même, 1 la veille). jourDictee : 0 = dimanche … 5 = vendredi. */
export function joursAvantDictee(jourDictee: number, j: Jour): number {
  return (jourDictee - lire(j).getDay() + 7) % 7;
}

// --- La semaine : les boîtes ---------------------------------------------------------------

export interface EtatMot {
  boite: 1 | 2 | 3;
  reussites: number;
  echecs: number;
  indices: number;
  hesitations: number;
  /** Les fausses réponses, et combien de fois (pour le rêve et le parent). */
  erreurs: Record<string, number>;
  prochaine: Jour | null;
  vu: Jour | null;
}

export function motNeuf(): EtatMot {
  return { boite: 1, reussites: 0, echecs: 0, indices: 0, hesitations: 0, erreurs: {}, prochaine: null, vu: null };
}

function intervalle(boite: number, joursRestants: number): number {
  if (boite <= 1) return 1;
  if (boite === 2) return joursRestants >= 4 ? 2 : 1;
  return joursRestants >= 5 ? 3 : joursRestants >= 3 ? 2 : 1;
}

/** Jamais après la veille de la dictée : tout est revu au concours d'écriture. */
export function prochaineDate(boite: number, j: Jour, joursRestants: number): Jour {
  let suivante = ajouter(j, intervalle(boite, joursRestants));
  if (joursRestants >= 2) {
    const veille = ajouter(j, joursRestants - 1);
    if (suivante > veille) suivante = veille;
  }
  return suivante;
}

export interface Tentative {
  juste: boolean;
  indice: boolean;
  hesite: boolean;
  reponse: string;
  jour: Jour;
  joursRestants: number;
}

/** Applique une tentative ; renvoie un nouvel état et ce qui a changé. */
export function appliquer(etat: EtatMot | undefined, t: Tentative): { etat: EtatMot; changement: 'monte' | 'reste' | 'descend' } {
  const s: EtatMot = { ...motNeuf(), ...etat, erreurs: { ...(etat?.erreurs ?? {}) } };
  const avant = s.boite;
  const memeJour = etat?.vu === t.jour;
  if (t.juste) {
    s.reussites++;
    if (t.indice) s.indices++;
    if (t.hesite) s.hesitations++;
    if (!t.indice && !t.hesite && !memeJour && s.boite < 3) s.boite = (s.boite + 1) as 2 | 3;
  } else {
    s.echecs++;
    s.boite = 1;
    const r = t.reponse.trim();
    if (r) s.erreurs[r] = (s.erreurs[r] ?? 0) + 1;
  }
  s.vu = t.jour;
  s.prochaine = prochaineDate(s.boite, t.jour, t.joursRestants);
  return { etat: s, changement: s.boite > avant ? 'monte' : s.boite < avant ? 'descend' : 'reste' };
}

// --- Après la semaine : la mémoire de chaque mot ---------------------------------------------

export const FACILITE_DEPART = 2.2;
const FACILITE_MIN = 1.3;
const FACILITE_MAX = 3;
export const JOURS_RETRAIT = 45;
export const SERIE_RETRAIT = 4;

export interface Souvenir {
  intervalle: number;
  facilite: number;
  serie: number;
  reussites: number;
  echecs: number;
  ajoute: Jour;
  prochaine: Jour;
  vu?: Jour;
  phrase: string;
  /** Le titre de la liste d'où vient le mot. */
  semaine: string;
}

/** Un mot de la semaine qui se termine entre dans la mémoire longue. */
export function souvenirDe(etat: EtatMot | undefined, j: Jour, phrase: string, semaine: string): Souvenir {
  const su = etat?.boite === 3;
  const iv = su ? 3 : 1;
  return { intervalle: iv, facilite: su ? FACILITE_DEPART : FACILITE_DEPART - 0.2, serie: 0, reussites: 0, echecs: 0, ajoute: j, prochaine: ajouter(j, iv), phrase, semaine };
}

const arrondi = (x: number): number => Math.round(x * 100) / 100;

/** Révision d'un mot de la mémoire longue ; retire : il est su pour toujours. */
export function reviser(s: Souvenir, t: { juste: boolean; hesite: boolean }, j: Jour): { souvenir: Souvenir; retire: boolean } {
  const e = { ...s };
  // Déjà vu aujourd'hui (raté puis réécrit) : la réussite ne compte pas.
  if (t.juste && e.vu === j) return { souvenir: e, retire: false };
  e.vu = j;
  if (t.juste && !t.hesite) {
    e.reussites++;
    e.serie++;
    const suivant = Math.max(e.intervalle + 1, Math.round(e.intervalle * e.facilite));
    e.facilite = Math.min(FACILITE_MAX, arrondi(e.facilite + 0.1));
    if (e.serie >= SERIE_RETRAIT && suivant >= JOURS_RETRAIT) return { souvenir: e, retire: true };
    e.intervalle = suivant;
  } else if (t.juste) {
    e.reussites++;
    e.intervalle = Math.max(1, Math.round(e.intervalle * 1.2));
    e.facilite = Math.max(FACILITE_MIN, arrondi(e.facilite - 0.05));
  } else {
    e.echecs++;
    e.serie = 0;
    e.intervalle = 1;
    e.facilite = Math.max(FACILITE_MIN, arrondi(e.facilite - 0.3));
  }
  e.prochaine = ajouter(j, e.intervalle);
  return { souvenir: e, retire: false };
}

/** Les mots de la mémoire longue à revoir aujourd'hui : les plus en retard, puis les plus difficiles. */
export function souvenirsDus(memoire: Record<string, Souvenir>, j: Jour, max = 10): string[] {
  const retard = (w: string): number => {
    const e = memoire[w] as Souvenir;
    return ecart(e.prochaine, j) / Math.max(1, e.intervalle);
  };
  return Object.keys(memoire)
    .filter((w) => (memoire[w] as Souvenir).prochaine <= j)
    .sort((a, b) => retard(b) - retard(a) || (memoire[a] as Souvenir).facilite - (memoire[b] as Souvenir).facilite)
    .slice(0, max);
}
