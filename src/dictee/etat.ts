// L'état de la dictée dans la ville : la liste de la semaine, la révision du jour, la mémoire
// longue des mots, les mots sus pour toujours (le mur des mots) et le concours d'écriture.
// Pur, sans navigateur. Reprend les règles de Dictée-Blocs (voir docs/VILLE.md).

import { appliquer, joursAvantDictee, reviser, souvenirDe, type EtatMot, type Jour, type Souvenir } from './leitner.ts';
import { ficheNeuve, motsDuJour, noterEssai, reviser as reviserFiche, rythme, suPourToujours, type FicheMot } from './memoire.ts';

export interface MotDeListe {
  w: string;
  phrase: string;
}

export interface EtatDictee {
  version: 1;
  titre: string;
  mots: MotDeListe[];
  /** 0 = dimanche … 5 = vendredi. */
  jourDictee: number;
  progres: Record<string, EtatMot>;
  /** La révision du jour : tous les mots de la semaine et les souvenirs dus, jusqu'à ce que tout soit juste. */
  quotidien: { jour: Jour | null; mots: string[]; justes: string[]; fini: boolean };
  memoire: Record<string, Souvenir>;
  retires: Array<{ w: string; semaine: string; date: Jour }>;
  concours: Array<{ date: Jour; justes: number; total: number; rates: string[] }>;
  /** La mémoire de chaque mot (modèle FSRS : difficulté, stabilité ; voir memoire.ts). */
  fiches: Record<string, FicheMot>;
  /** Les mots que le rêve demande de revoir en priorité (dernière préparation). */
  prioritaires: string[];
  /** Ce que le rêve a trouvé faux alors que l'enfant l'avait jugé juste : on le lui montre. */
  aRevoir: Array<{ w: string; ecriture: string; jour: Jour }>;
  /** Le jour de la dernière préparation du rêve déjà appliquée. */
  retourLu?: string;
}

export function dicteeNeuve(): EtatDictee {
  return { version: 1, titre: '', mots: [], jourDictee: 5, progres: {}, quotidien: { jour: null, mots: [], justes: [], fini: false }, memoire: {}, retires: [], concours: [], fiches: {}, prioritaires: [], aRevoir: [] };
}

const propre = (s: string): string => s.normalize('NFC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

/** Le format de Dictée-Blocs : « # Titre », puis « mot | phrase », une ligne par mot. */
export function lireListe(texte: string): { titre: string; mots: MotDeListe[] } {
  const titre = texte.match(/^\s*#\s*(.+)$/m)?.[1]?.trim() ?? '';
  const vus = new Set<string>();
  const mots: MotDeListe[] = [];
  for (const ligne of texte.split(/\r?\n/)) {
    if (/^\s*#/.test(ligne) || !ligne.trim()) continue;
    const [w, ...reste] = ligne.split('|');
    const mot = propre(w ?? '');
    if (!mot || vus.has(mot)) continue;
    vus.add(mot);
    mots.push({ w: mot, phrase: reste.join('|').trim() });
  }
  return { titre, mots };
}

/**
 * Une nouvelle liste. Si le titre change, c'est une nouvelle semaine : les mots de l'ancienne
 * liste entrent dans la mémoire longue (sauf ceux repris), et la semaine repart de zéro. Même
 * titre : une simple correction, la progression des mots inchangés est gardée.
 */
export function changerListe(e: EtatDictee, texte: string, jour: Jour): EtatDictee {
  const { titre, mots } = lireListe(texte);
  const noms = new Set(mots.map((m) => m.w));
  if (titre === e.titre) {
    const progres = Object.fromEntries(Object.entries(e.progres).filter(([w]) => noms.has(w)));
    return { ...e, mots, progres, quotidien: { jour: null, mots: [], justes: [], fini: false } };
  }
  const memoire = { ...e.memoire };
  for (const m of e.mots) {
    if (!noms.has(m.w) && !memoire[m.w]) memoire[m.w] = souvenirDe(e.progres[m.w], jour, m.phrase, e.titre);
  }
  for (const w of noms) delete memoire[w];
  return { ...e, titre, mots, progres: {}, quotidien: { jour: null, mots: [], justes: [], fini: false }, memoire, concours: [] };
}

export const joursRestants = (e: EtatDictee, jour: Jour): number => joursAvantDictee(e.jourDictee, jour);

/** La veille de la dictée : jour du concours d'écriture. */
export const estJourDeConcours = (e: EtatDictee, jour: Jour): boolean => e.mots.length > 0 && joursRestants(e, jour) === 1;

/** Les mots jamais vus : ils passent d'abord par la fiche d'étude. */
export const jamaisVu = (e: EtatDictee, w: string): boolean => !e.memoire[w] && !e.progres[w]?.vu;

/** La révision du jour (créée le premier jour où l'on en parle) : le premier jour d'une liste,
 *  ses 8 premiers mots ; ensuite, les mots pas encore vus et ceux dont la mémoire faiblit, 8 au
 *  plus (voir memoire.ts). */
export function revisionDuJour(e: EtatDictee, jour: Jour): EtatDictee {
  if (e.quotidien.jour === jour) return e;
  const mots = motsDuJour({
    semaine: e.mots.map((m) => m.w),
    anciens: Object.keys(e.memoire),
    fiches: e.fiches ?? {},
    jour,
    joursAvantDictee: joursRestants(e, jour),
    prioritaires: e.prioritaires ?? [],
  });
  return { ...e, quotidien: { jour, mots, justes: [], fini: mots.length === 0 } };
}

/** Les mots qu'il reste à réussir aujourd'hui, dans l'ordre. */
export const motsRestants = (e: EtatDictee): string[] => e.quotidien.mots.filter((w) => !e.quotidien.justes.includes(w));

export function phraseDe(e: EtatDictee, w: string): string {
  return e.mots.find((m) => m.w === w)?.phrase ?? e.memoire[w]?.phrase ?? '';
}

export interface Reponse {
  juste: boolean;
  indice: boolean;
  hesite: boolean;
  reponse: string;
  /** Temps d'écriture (ms) et lettres à écrire : pour la vitesse, jamais montrée à l'enfant. */
  ms?: number;
  lettres?: number;
  /** L'image de l'écriture, gardée sur la tablette. */
  ecriture?: string;
  /** Qui a jugé la réponse (l'enfant, en se corrigeant lui-même ; le parent ; le rêve). */
  juge?: 'enfant' | 'parent' | 'reve';
}

/** Note une réponse : boîtes pour un mot de la semaine, mémoire longue pour un ancien mot. */
export function noter(e: EtatDictee, w: string, r: Reponse, jour: Jour): { etat: EtatDictee; retire: boolean } {
  let etat = { ...e };
  let retire = false;
  // La mémoire du mot (FSRS) : la note de l'essai, puis sa difficulté et sa stabilité.
  const fiches = e.fiches ?? {};
  const note = noterEssai({ juste: r.juste, indice: r.indice, hesite: r.hesite, ms: r.ms ?? 0, lettres: r.lettres ?? 0 }, rythme(fiches));
  const fiche = reviserFiche(fiches[w] ?? ficheNeuve(w), {
    jour,
    note,
    juste: r.juste,
    ms: r.ms ?? 0,
    lettres: r.lettres ?? 0,
    indice: r.indice,
    hesite: r.hesite,
    juge: r.juge ?? 'enfant',
    ...(r.ecriture ? { ecriture: r.ecriture } : {}),
    ...(r.reponse ? { ecrit: r.reponse } : {}),
  });
  etat.fiches = { ...fiches, [w]: fiche };
  if (e.mots.some((m) => m.w === w)) {
    etat.progres = { ...e.progres, [w]: appliquer(e.progres[w], { ...r, jour, joursRestants: joursRestants(e, jour) }).etat };
  } else if (e.memoire[w]) {
    const res = reviser(e.memoire[w], r, jour);
    const memoire = { ...e.memoire };
    if (res.retire || suPourToujours(fiche)) {
      retire = true;
      delete memoire[w];
      etat.retires = [...e.retires, { w, semaine: e.memoire[w].semaine, date: jour }];
    } else memoire[w] = res.souvenir;
    etat.memoire = memoire;
  }
  if (r.juste && etat.quotidien.jour === jour && etat.quotidien.mots.includes(w) && !etat.quotidien.justes.includes(w)) {
    const justes = [...etat.quotidien.justes, w];
    etat = { ...etat, quotidien: { ...etat.quotidien, justes, fini: justes.length >= etat.quotidien.mots.length } };
  }
  return { etat, retire };
}

export function noterConcours(e: EtatDictee, jour: Jour, resultats: Array<{ w: string; juste: boolean }>): EtatDictee {
  const rates = resultats.filter((x) => !x.juste).map((x) => x.w);
  return { ...e, concours: [...e.concours.filter((c) => c.date !== jour), { date: jour, justes: resultats.length - rates.length, total: resultats.length, rates }] };
}

// --- Import de Dictée-Blocs ----------------------------------------------------------------

const nombre = (v: unknown, defaut: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : defaut);
const texte = (v: unknown, defaut = ''): string => (typeof v === 'string' ? v : defaut);
const jourOuNul = (v: unknown): Jour | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Lit l'export de Dictée-Blocs (son état localStorage « dicteeMot.v1 ») ; null s'il est illisible. */
export function importerDicteeBlocs(brut: unknown, jour: Jour): EtatDictee | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const s = brut as Record<string, unknown>;
  if (!Array.isArray(s.words)) return null;
  const e = dicteeNeuve();
  e.titre = texte(s.listTitle);
  e.jourDictee = Math.min(6, Math.max(0, Math.round(nombre(s.dictationDay, 5))));
  for (const x of s.words as Array<Record<string, unknown>>) {
    const w = propre(texte(x?.w));
    if (w && !e.mots.some((m) => m.w === w)) e.mots.push({ w, phrase: texte(x.sentence) });
  }
  for (const [w, p] of Object.entries((s.progress ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!p) continue;
    const boite = Math.min(3, Math.max(1, Math.round(nombre(p.box, 1)))) as 1 | 2 | 3;
    e.progres[w] = {
      boite,
      reussites: nombre(p.success, 0),
      echecs: nombre(p.fail, 0),
      indices: nombre(p.hinted, 0),
      hesitations: nombre(p.unsure, 0),
      erreurs: typeof p.errors === 'object' && p.errors ? (p.errors as Record<string, number>) : {},
      prochaine: jourOuNul(p.nextDue),
      vu: jourOuNul(p.lastSeen),
    };
  }
  for (const [w, a] of Object.entries((s.archive ?? {}) as Record<string, Record<string, unknown>>)) {
    if (!a) continue;
    // Les très anciennes entrées de Dictée-Blocs avaient des « niveaux » au lieu d'un intervalle.
    const intervalle = a.interval != null ? nombre(a.interval, 1) : ([2, 7, 14, 30][nombre(a.level, 0)] ?? 2);
    e.memoire[w] = {
      intervalle,
      facilite: nombre(a.ease, 2.2),
      serie: nombre(a.streak, nombre(a.level, 0)),
      reussites: nombre(a.ok, 0),
      echecs: nombre(a.fail, 0),
      ajoute: jourOuNul(a.added) ?? jour,
      prochaine: jourOuNul(a.nextDue) ?? jour,
      ...(jourOuNul(a.lastSeen) ? { vu: jourOuNul(a.lastSeen) as Jour } : {}),
      phrase: texte(a.sentence),
      semaine: texte(a.week),
    };
  }
  for (const r of (Array.isArray(s.retired) ? s.retired : []) as Array<Record<string, unknown>>) {
    const w = texte(r?.w);
    if (w) e.retires.push({ w, semaine: texte(r.week), date: jourOuNul(r.date) ?? jour });
  }
  for (const b of (Array.isArray(s.blanche) ? s.blanche : []) as Array<Record<string, unknown>>) {
    const date = jourOuNul(b?.date);
    if (date) e.concours.push({ date, justes: nombre(b.score, 0), total: nombre(b.total, 0), rates: [] });
  }
  // Son historique démarre la mémoire de chaque mot (sinon tout repartirait de zéro).
  e.fiches = fichesDepuisHistorique(e);
  return e;
}

/** Corrige un essai après coup (le parent le soir, ou le rêve la nuit, qui relisent l'écriture) :
 *  sa justesse change, puis la mémoire du mot est recalculée en rejouant tous ses essais. */
export function corrigerEssai(e: EtatDictee, w: string, ecriture: string, juste: boolean, juge: 'parent' | 'reve', lu?: string): EtatDictee {
  const f = e.fiches?.[w];
  if (!f || !f.essais.some((x) => x.ecriture === ecriture)) return e;
  const essais = f.essais.map((x) => (x.ecriture === ecriture ? { ...x, juste, juge, ...(lu ? { ecrit: lu } : {}) } : x));
  let refaite = ficheNeuve(w);
  for (const x of essais) {
    const note = noterEssai({ juste: x.juste, indice: x.indice, hesite: x.hesite, ms: x.ms, lettres: x.lettres }, rythme(e.fiches));
    refaite = reviserFiche(refaite, { ...x, note });
  }
  return { ...e, fiches: { ...e.fiches, [w]: refaite } };
}

/** Ce que l'historique de Dictée-Blocs dit de chaque mot, pour démarrer sa mémoire (FSRS) sans
 *  repartir de zéro : la stabilité vient de sa boîte (semaine) ou de son intervalle (mine), la
 *  difficulté du mot est ajustée par ses échecs et sa facilité, et ses fautes connues deviennent
 *  des essais ratés (pour les statistiques et le rêve). */
export function fichesDepuisHistorique(e: EtatDictee): Record<string, FicheMot> {
  const fiches: Record<string, FicheMot> = { ...e.fiches };
  const borne = (x: number): number => Math.min(10, Math.max(1, x));
  const fautes = (erreurs: Record<string, number>, jour: Jour): FicheMot['essais'] =>
    Object.entries(erreurs)
      .slice(0, 8)
      .map(([ecrit]) => ({ jour, note: 1 as const, juste: false, ms: 0, lettres: 0, indice: false, hesite: false, juge: 'enfant' as const, ecrit }));
  for (const [w, p] of Object.entries(e.progres)) {
    if (fiches[w]?.dernier || !p.vu) continue;
    const base = ficheNeuve(w);
    const total = p.reussites + p.echecs;
    fiches[w] = {
      d: borne(base.d + (total ? (p.echecs / total) * 3 - 0.5 : 0) + p.indices * 0.2),
      s: p.boite === 3 ? 7 : p.boite === 2 ? 3 : 1,
      dernier: p.vu,
      reussites: p.reussites,
      echecs: p.echecs,
      essais: fautes(p.erreurs, p.vu),
    };
  }
  for (const [w, m] of Object.entries(e.memoire)) {
    if (fiches[w]?.dernier) continue;
    const base = ficheNeuve(w);
    // La facilité de Dictée-Blocs va de 1,3 (difficile) à 3 (facile).
    fiches[w] = {
      d: borne((base.d + (10 - ((m.facilite - 1.3) / 1.7) * 9)) / 2),
      s: Math.max(1, m.intervalle),
      dernier: m.vu ?? m.ajoute,
      reussites: m.reussites,
      echecs: m.echecs,
      essais: [],
    };
  }
  return fiches;
}
