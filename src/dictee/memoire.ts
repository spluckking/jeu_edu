// La mémoire de chaque mot de dictée, sur le modèle de FSRS (l'algorithme d'Anki depuis 2023) :
// trois mesures par mot plutôt qu'une seule note.
//  - la difficulté D, de 1 à 10 : d'abord tirée du mot (longueur, pièges), puis ajustée à chaque
//    essai ;
//  - la stabilité S, en jours : combien de temps le souvenir tient avant que ses chances de
//    réussite tombent à 90 % ; elle grandit après chaque réussite (moins vite pour un mot
//    difficile), et retombe après une erreur ;
//  - la récupérabilité R : ses chances de réussir le mot aujourd'hui, qui baissent avec le temps.
// Chaque essai reçoit une note sur 4 (raté, difficile, bien, facile) : la justesse d'abord, puis
// l'aide (indice, « j'hésite ») et la vitesse, comparée au rythme de l'enfant lui-même (jamais
// à une norme, et jamais montrée à l'enfant).
// Chaque jour, on révise les mots dont R passe sous un seuil (90 %, 95 % juste avant la dictée),
// du plus fragile au plus solide, entre 3 et 8 mots (MOTS_PAR_JOUR, demandé par le parent) ; le
// premier jour d'une liste, ses 8 premiers mots, les suivants arrivent les jours d'après.
// Pur, sans navigateur ; testé dans memoire.test.ts. Paramètres : ceux de FSRS-4.5 par défaut
// (ils pourront être ajustés sur les données de l'enfant par le rêve).

import { ecart, type Jour } from './leitner.ts';
import { detecter } from './pieges.ts';

/** Note d'un essai : 1 raté, 2 difficile, 3 bien, 4 facile. */
export type Note = 1 | 2 | 3 | 4;

export interface Essai {
  jour: Jour;
  note: Note;
  juste: boolean;
  /** Temps d'écriture, en millisecondes (du premier trait à la validation). */
  ms: number;
  /** Nombre de lettres à écrire (pour le temps par lettre). */
  lettres: number;
  indice: boolean;
  hesite: boolean;
  /** Qui a jugé : l'enfant lui-même, le parent, ou le rêve (qui relit l'écriture la nuit). */
  juge: 'enfant' | 'parent' | 'reve';
  /** L'image de l'écriture (sur la tablette), s'il y en a une. */
  ecriture?: string;
  /** Ce qu'il a écrit, quand le rêve ou le parent l'a lu (pour les erreurs fréquentes). */
  ecrit?: string;
}

export interface FicheMot {
  /** Difficulté, de 1 (facile) à 10 (très difficile). */
  d: number;
  /** Stabilité, en jours. */
  s: number;
  /** Le dernier jour où le mot a été revu (null : jamais). */
  dernier: Jour | null;
  reussites: number;
  echecs: number;
  /** Les derniers essais (les plus récents à la fin). */
  essais: Essai[];
}

/** Les paramètres de FSRS-4.5 (valeurs par défaut publiées). */
export const W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61] as const;
const w = (i: number): number => W[i] ?? 0;
const borne = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));
const ESSAIS_GARDES = 40;

/** La difficulté de départ d'un mot (1 à 10) : sa longueur et ses pièges. */
export function difficulteDuMot(mot: string): number {
  const coeur = mot.replace(/^(le|la|les|un|une|des|l['’])\s*/i, '');
  const lettres = Array.from(coeur.replace(/[\s'’-]/g, '')).length;
  const pieges = detecter(mot).pieges.length;
  return borne(1.5 + Math.max(0, lettres - 3) * 0.55 + pieges * 1.3, 1, 10);
}

/** Les chances de réussir le mot après t jours, pour une stabilité s (0,9 quand t = s). */
export function recuperabilite(s: number, t: number): number {
  return Math.pow(1 + t / (9 * Math.max(0.1, s)), -1);
}

export function ficheNeuve(mot: string): FicheMot {
  return { d: difficulteDuMot(mot), s: 0, dernier: null, reussites: 0, echecs: 0, essais: [] };
}

/** R aujourd'hui (0 pour un mot jamais revu). */
export function chances(f: FicheMot, jour: Jour): number {
  if (!f.dernier || f.s <= 0) return 0;
  return recuperabilite(f.s, Math.max(0, ecart(f.dernier, jour)));
}

/** Le temps habituel de l'enfant, en millisecondes par lettre (médiane de ses essais justes). */
export function rythme(fiches: Record<string, FicheMot>): number | null {
  const t = Object.values(fiches)
    .flatMap((f) => f.essais)
    .filter((e) => e.juste && e.ms > 0 && e.lettres > 0)
    .slice(-80)
    .map((e) => e.ms / e.lettres)
    .sort((a, b) => a - b);
  if (t.length < 5) return null;
  return t[Math.floor(t.length / 2)] ?? null;
}

/** La note d'un essai : juste ou non, avec ou sans aide, et sa vitesse par rapport à son rythme. */
export function noterEssai(r: { juste: boolean; indice: boolean; hesite: boolean; ms: number; lettres: number }, rythmeHabituel: number | null): Note {
  if (!r.juste) return 1;
  if (r.indice || r.hesite) return 2;
  if (!rythmeHabituel || r.ms <= 0 || r.lettres <= 0) return 3;
  const rapport = r.ms / r.lettres / rythmeHabituel;
  if (rapport > 1.6) return 2;
  if (rapport < 0.7) return 4;
  return 3;
}

/** Une révision : la fiche après cet essai (une seule mise à jour de la mémoire par jour). */
export function reviser(f: FicheMot, e: Essai): FicheMot {
  const essais = [...f.essais, e].slice(-ESSAIS_GARDES);
  // Un deuxième essai le même jour ne change pas la mémoire (le sommeil n'est pas passé),
  // sauf un échec après une réussite : on garde la note la plus basse.
  const dejaRevu = f.dernier === e.jour && f.s > 0;
  const g = e.note;
  if (dejaRevu && g >= 3) return { ...f, essais };
  let { d, s } = f;
  if (f.s <= 0 || !f.dernier) {
    // Première fois : la stabilité de départ selon la note, la difficulté du mot ajustée.
    s = w(g - 1);
    d = borne(d - w(6) * (g - 3), 1, 10);
  } else {
    const r = chances(f, e.jour);
    const d1 = borne(d - w(6) * (g - 3), 1, 10);
    d = borne(w(7) * difficulteMoyenne() + (1 - w(7)) * d1, 1, 10);
    if (g === 1) {
      s = Math.min(s, w(11) * Math.pow(d, -w(12)) * (Math.pow(s + 1, w(13)) - 1) * Math.exp(w(14) * (1 - r)));
    } else {
      const facteur = Math.exp(w(8)) * (11 - d) * Math.pow(s, -w(9)) * (Math.exp(w(10) * (1 - r)) - 1);
      s = s * (1 + facteur * (g === 2 ? w(15) : 1) * (g === 4 ? w(16) : 1));
    }
  }
  return {
    d,
    s: borne(s, 0.1, 3650),
    dernier: e.jour,
    reussites: f.reussites + (e.juste ? 1 : 0),
    echecs: f.echecs + (e.juste ? 0 : 1),
    essais,
  };
}
/** La difficulté moyenne vers laquelle on revient doucement (FSRS : D de départ d'une note « bien »). */
const difficulteMoyenne = (): number => w(4);

/** Un mot « su pour toujours » : solide (stabilité d'au moins 4 mois) et ses 4 derniers essais justes. */
export function suPourToujours(f: FicheMot): boolean {
  const derniers = f.essais.slice(-4);
  return f.s >= 120 && derniers.length === 4 && derniers.every((e) => e.juste);
}

export interface Choix {
  /** Les mots de la liste de la semaine. */
  semaine: string[];
  /** Les anciens mots, encore en mémoire. */
  anciens: string[];
  fiches: Record<string, FicheMot>;
  jour: Jour;
  /** Jours avant la dictée (0 le jour même, 1 la veille). */
  joursAvantDictee: number;
  /** Mots que le rêve demande de revoir en priorité. */
  prioritaires?: readonly string[];
  min?: number;
  max?: number;
}

/** Jamais plus de mots de dictée par jour, même le premier jour d'une liste. */
export const MOTS_PAR_JOUR = 8;

/** Les mots à revoir aujourd'hui, du plus fragile au plus solide. */
export function motsDuJour(c: Choix): string[] {
  const min = c.min ?? 3;
  const max = c.max ?? MOTS_PAR_JOUR;
  const fiche = (m: string): FicheMot | undefined => c.fiches[m];
  // Le premier jour d'une liste (aucun mot de la semaine revu) : ses premiers mots ; les autres,
  // jamais vus, passent en tête les jours suivants.
  if (c.semaine.length && c.semaine.every((m) => !fiche(m)?.dernier)) return c.semaine.slice(0, max);
  const hier = (m: string): boolean => {
    const derniers = fiche(m)?.essais ?? [];
    const dernier = derniers[derniers.length - 1];
    return Boolean(dernier && !dernier.juste && ecart(dernier.jour, c.jour) <= 1);
  };
  const seuil = (m: string): number => (c.semaine.includes(m) && c.joursAvantDictee <= 2 ? 0.95 : 0.9);
  const tous = [...new Set([...c.semaine, ...c.anciens])];
  const r = (m: string): number => {
    const f = fiche(m);
    return f ? chances(f, c.jour) : 0;
  };
  const prio = new Set(c.prioritaires ?? []);
  const rang = (m: string): number => (prio.has(m) ? -2 : 0) + (hier(m) ? -1 : 0) + r(m);
  const dus = tous.filter((m) => prio.has(m) || hier(m) || r(m) < seuil(m)).sort((a, b) => rang(a) - rang(b));
  const choisis = dus.slice(0, max);
  // Au moins quelques mots chaque jour : les plus fragiles parmi les autres mots de la semaine.
  if (choisis.length < min) {
    const autres = (c.semaine.length ? c.semaine : tous).filter((m) => !choisis.includes(m)).sort((a, b) => r(a) - r(b));
    choisis.push(...autres.slice(0, min - choisis.length));
  }
  return choisis;
}
