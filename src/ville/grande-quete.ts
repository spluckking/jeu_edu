// La grande quête : une histoire en 5 chapitres, un par jour, lus dans la Gazette. Chaque chapitre
// a un rebondissement et une tâche dans la ville (une demande d'un habitant : apporter, aller
// chercher). Le chapitre suivant arrive le lendemain du jour où la tâche est faite : un jour
// manqué ne fait rien perdre. Après le 5e, la fin : une question pour réfléchir, puis la morale.
// Les quêtes viennent de content/ville/grandes-quetes.json, ou du rêve (validées par le parent).
// Pur : testé dans grande-quete.test.ts.

import type { Jour } from '../memoire/jours.ts';

export const CHAPITRES = 5;
/** Les habitants qui peuvent confier une tâche ou la recevoir. */
export const HABITANTS_QUETES = ['epiciere', 'forain-chamboule', 'postiere'] as const;

export interface LigneQ {
  produit: string;
  nombre: number;
}

/** Une tâche : la même forme qu'une demande d'habitant. */
export interface Tache {
  donneur: string;
  destinataire: string;
  fournit: LigneQ[];
  besoin: LigneQ[];
  /** Les pièces offertes, en centimes. */
  recompense: number[];
  texte: string;
  rappel: string;
  merci: string;
}

export interface QuestionBrute {
  question: string;
  /** La bonne réponse en premier. */
  choix: [string, string, string];
  /** Le rang (à partir de 1) de la phrase qui contient la réponse. */
  indice?: number;
}

export interface Chapitre {
  titre: string;
  phrases: string[];
  questions: QuestionBrute[];
  tache: Tache;
}

export interface Fin {
  titre: string;
  phrases: string[];
  /** Une question pour réfléchir (la meilleure réponse en premier), avant la morale. */
  reflexion: { question: string; choix: [string, string, string] };
  morale: string;
}

export interface GrandeQuete {
  id: string;
  titre: string;
  chapitres: Chapitre[];
  fin: Fin;
}

// --- La lecture (le rêve envoie des données : tout est vérifié) --------------------------------

const ID = /^[a-z0-9-]{3,60}$/;
const texte = (v: unknown, max = 400): string | null => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

function lignes(v: unknown, produits: ReadonlySet<string>): LigneQ[] | null {
  if (!Array.isArray(v) || v.length > 4) return null;
  const r: LigneQ[] = [];
  for (const x of v) {
    const o = x as Partial<LigneQ>;
    if (typeof o?.produit !== 'string' || !produits.has(o.produit)) return null;
    if (typeof o.nombre !== 'number' || !Number.isInteger(o.nombre) || o.nombre < 1 || o.nombre > 10) return null;
    r.push({ produit: o.produit, nombre: o.nombre });
  }
  return r;
}

/** Une tâche (ou une demande d'habitant) bien formée, ou la raison du refus. */
export function lireTache(brut: unknown, produits: ReadonlySet<string>): Tache | string {
  if (typeof brut !== 'object' || brut === null) return 'tâche illisible';
  const o = brut as Record<string, unknown>;
  const habitant = (v: unknown): string | null => (typeof v === 'string' && (HABITANTS_QUETES as readonly string[]).includes(v) ? v : null);
  const donneur = habitant(o.donneur);
  const destinataire = habitant(o.destinataire);
  if (!donneur || !destinataire) return 'habitant inconnu';
  const fournit = lignes(o.fournit ?? [], produits);
  const besoin = lignes(o.besoin, produits);
  if (!fournit || !besoin || !besoin.length) return 'produits inconnus ou nombres impossibles';
  const recompense = Array.isArray(o.recompense) ? o.recompense : [];
  if (recompense.length > 4 || !recompense.every((c) => c === 100 || c === 200 || c === 500)) return 'récompense impossible';
  const t = texte(o.texte);
  const rappel = texte(o.rappel);
  const merci = texte(o.merci);
  if (!t || !rappel || !merci) return 'texte manquant';
  return { donneur, destinataire, fournit, besoin, recompense: recompense as number[], texte: t, rappel, merci };
}

function lireQuestion(brut: unknown, nbPhrases: number): QuestionBrute | null {
  const o = brut as Partial<QuestionBrute>;
  const q = texte(o?.question, 200);
  if (!q || !Array.isArray(o.choix) || o.choix.length !== 3) return null;
  const choix = o.choix.map((c) => texte(c, 80));
  if (choix.some((c) => !c) || new Set(choix).size !== 3) return null;
  const indice = typeof o.indice === 'number' && Number.isInteger(o.indice) && o.indice >= 1 && o.indice <= nbPhrases ? o.indice : undefined;
  return { question: q, choix: choix as [string, string, string], ...(indice ? { indice } : {}) };
}

function lirePhrases(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length < 2 || v.length > 7) return null;
  const r = v.map((p) => texte(p, 220));
  return r.every((p) => p) ? (r as string[]) : null;
}

/** Une grande quête bien formée (5 chapitres, une fin), ou la raison du refus. */
export function lireGrandeQuete(brut: unknown, produits: ReadonlySet<string>): GrandeQuete | string {
  if (typeof brut !== 'object' || brut === null) return 'quête illisible';
  const o = brut as Record<string, unknown>;
  if (typeof o.id !== 'string' || !ID.test(o.id)) return 'identifiant invalide';
  const titre = texte(o.titre, 80);
  if (!titre) return 'titre manquant';
  if (!Array.isArray(o.chapitres) || o.chapitres.length !== CHAPITRES) return `il faut ${CHAPITRES} chapitres`;
  const chapitres: Chapitre[] = [];
  for (const [i, c] of o.chapitres.entries()) {
    const ch = c as Record<string, unknown>;
    const t = texte(ch?.titre, 80);
    const phrases = lirePhrases(ch?.phrases);
    if (!t || !phrases) return `chapitre ${i + 1} : titre ou phrases`;
    const questions = Array.isArray(ch.questions) ? ch.questions.map((q) => lireQuestion(q, phrases.length)) : [];
    if (questions.length < 2 || questions.some((q) => !q)) return `chapitre ${i + 1} : il faut au moins 2 questions à 3 choix`;
    const tache = lireTache(ch.tache, produits);
    if (typeof tache === 'string') return `chapitre ${i + 1} : ${tache}`;
    chapitres.push({ titre: t, phrases, questions: questions as QuestionBrute[], tache });
  }
  const f = o.fin as Record<string, unknown> | undefined;
  const titreFin = texte(f?.titre, 80);
  const phrasesFin = lirePhrases(f?.phrases);
  const reflexion = lireQuestion(f?.reflexion, 0);
  const morale = texte(f?.morale, 200);
  if (!titreFin || !phrasesFin || !reflexion || !morale) return 'fin incomplète';
  return { id: o.id, titre, chapitres, fin: { titre: titreFin, phrases: phrasesFin, reflexion: { question: reflexion.question, choix: reflexion.choix }, morale } };
}

// --- L'avancée ---------------------------------------------------------------------------------

export interface EtatGrandeQuete {
  /** La quête en cours ('' : aucune). */
  id: string;
  /** Le chapitre en cours (0 à 4), ou CHAPITRES pour la fin. */
  chapitre: number;
  /** Le jour où ce chapitre (ou la fin) a été montré pour la première fois. */
  depuis: Jour;
  /** La fin lue (questionnaire réussi) : la quête suivante commence le lendemain. */
  finLue: boolean;
  finies: string[];
}

export const grandeQueteNeuve = (): EtatGrandeQuete => ({ id: '', chapitre: 0, depuis: '', finLue: false, finies: [] });

export function lireEtatGrandeQuete(brut: unknown): EtatGrandeQuete {
  if (typeof brut !== 'object' || brut === null) return grandeQueteNeuve();
  const o = brut as Partial<EtatGrandeQuete>;
  return {
    id: typeof o.id === 'string' ? o.id : '',
    chapitre: typeof o.chapitre === 'number' && o.chapitre >= 0 && o.chapitre <= CHAPITRES ? o.chapitre : 0,
    depuis: typeof o.depuis === 'string' ? o.depuis : '',
    finLue: o.finLue === true,
    finies: Array.isArray(o.finies) ? o.finies.filter((x): x is string => typeof x === 'string') : [],
  };
}

/** L'identifiant de la tâche d'un chapitre (une demande du jour comme les autres). */
export const idTache = (quete: string, chapitre: number): string => `gq-${quete}-${chapitre + 1}`;

/** Où en est la grande quête aujourd'hui. tacheFaite : la tâche a-t-elle été faite (un jour
 *  passé ou aujourd'hui) ? On avance d'un chapitre par jour au plus. */
export function queteDuJour(e: EtatGrandeQuete, quetes: readonly GrandeQuete[], jour: Jour, tacheFaite: (id: string) => boolean): { etat: EtatGrandeQuete; quete: GrandeQuete | null } {
  let etat = e;
  let quete = quetes.find((q) => q.id === etat.id) ?? null;
  // Un nouveau jour : le chapitre fait laisse place au suivant ; la fin lue, à la quête suivante.
  if (quete && etat.depuis && etat.depuis < jour) {
    if (etat.chapitre < CHAPITRES && tacheFaite(idTache(quete.id, etat.chapitre))) etat = { ...etat, chapitre: etat.chapitre + 1, depuis: jour };
    else if (etat.chapitre === CHAPITRES && etat.finLue) {
      etat = { ...etat, id: '', finies: [...etat.finies, quete.id] };
      quete = null;
    }
  }
  if (!quete) {
    const suivante = quetes.find((q) => !etat.finies.includes(q.id));
    if (!suivante) return { etat: etat.id ? { ...etat, id: '' } : etat, quete: null };
    return { etat: { ...etat, id: suivante.id, chapitre: 0, depuis: jour, finLue: false }, quete: suivante };
  }
  return { etat: etat.depuis ? etat : { ...etat, depuis: jour }, quete };
}

/** La tâche du jour (null pour la fin, ou si la tâche du chapitre est déjà faite). */
export function tacheDuJour(e: EtatGrandeQuete, q: GrandeQuete | null): { id: string; tache: Tache } | null {
  if (!q || e.chapitre >= CHAPITRES) return null;
  const c = q.chapitres[e.chapitre];
  return c ? { id: idTache(q.id, e.chapitre), tache: c.tache } : null;
}
