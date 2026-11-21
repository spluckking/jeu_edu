// La Gazette de MiniVille : ce que dit le journal du jour, et ce qu'on en garde. Le premier jour de
// chaque semaine (à partir du lundi), l'histoire de la semaine puis les quêtes ; les autres jours,
// les quêtes pas encore finies ; quand toutes sont finies, un questionnaire sur ce qui s'est passé.
// Le grand projet (le chantier de la boulangerie) n'est pas une quête de la Gazette.
// Les textes sont dans content/ville/gazette.json ; ici, seulement les règles (testées).

import T from '../../content/ville/gazette.json';
import { ajouterJours, jourDeSemaine, type Jour } from '../memoire/jours.ts';
import { REUSSIS_POUR_FINIR, type EtatAttraction } from './attraction.ts';
import type { EtatDictee } from '../dictee/etat.ts';

export interface EtatGazette {
  /** Le dernier jour où la Gazette a été lue et son questionnaire réussi. */
  valideLe: Jour;
  /** Le lundi de la première semaine lue (la semaine 1 de l'histoire). */
  premiere: Jour;
  /** Les semaines dont l'histoire a été lue (leur lundi). */
  histoiresLues: Jour[];
  /** La chronique : ce qui s'est passé, jour par jour (pour s'en souvenir plus tard). */
  chronique: Array<{ jour: Jour; texte: string }>;
}

export const gazetteNeuve = (): EtatGazette => ({ valideLe: '', premiere: '', histoiresLues: [], chronique: [] });

export function lireGazette(brut: unknown): EtatGazette {
  if (typeof brut !== 'object' || brut === null) return gazetteNeuve();
  const o = brut as Partial<EtatGazette>;
  const texte = (v: unknown): string => (typeof v === 'string' ? v : '');
  return {
    valideLe: texte(o.valideLe),
    premiere: texte(o.premiere),
    histoiresLues: Array.isArray(o.histoiresLues) ? o.histoiresLues.filter((x): x is string => typeof x === 'string') : [],
    chronique: Array.isArray(o.chronique) ? o.chronique.filter((c): c is { jour: Jour; texte: string } => typeof c?.jour === 'string' && typeof c?.texte === 'string') : [],
  };
}

/** Le lundi de la semaine de ce jour. */
export function lundiDe(jour: Jour): Jour {
  let j = jour;
  while (jourDeSemaine(j) !== 1) j = ajouterJours(j, -1);
  return j;
}

export interface Question {
  question: string;
  /** La bonne réponse en premier (mélangées à l'écran). */
  choix: [string, string, string];
  /** La phrase à relire après une erreur (son texte), ou null. */
  indice: string | null;
}

export interface Quete {
  id: 'attraction' | 'mots' | 'annonces';
  titre: string;
  phrases: string[];
  /** Où elle se passe, pour la visite sur la carte. */
  lieu: 'fete' | 'tableau';
  faite: boolean;
  questions: Question[];
  /** Les questions de fin de semaine, sur ce qui s'est passé (seulement si elle est faite). */
  bilan: Question[];
}

/** Remplace {cle} (et {n+3}…) ; une majuscule en début de phrase. */
export function remplir(texte: string, v: Record<string, string | number>): string {
  const r = texte.replace(/\{(\w+)(\+(\d+))?\}/g, (_, k: string, __, plus: string | undefined) => {
    const x = v[k];
    if (x === undefined) return '';
    return plus ? String(Number(x) + Number(plus)) : String(x);
  });
  return r.charAt(0).toLocaleUpperCase('fr') + r.slice(1);
}

const minuscule = (s: string): string => s.charAt(0).toLocaleLowerCase('fr') + s.slice(1);

export interface Monde {
  jour: Jour;
  attraction: EtatAttraction;
  /** Le nom de chaque attraction (« La grande roue »). */
  nomsAttractions: Record<string, string>;
  /** Les prénoms proposés pour le forain de chaque attraction. */
  prenomsProposes: Record<string, readonly string[]>;
  dictee: EtatDictee;
  /** Les mots à revoir aujourd'hui, et s'ils sont faits. */
  motsDuJour: { mots: string[]; fini: boolean };
  /** Les habitants qui ont une demande aujourd'hui (leur nom, « L'épicière »). */
  annonces: string[];
  hasard: () => number;
}

/** La grande aventure du jour, dans la Gazette : un chapitre, ou la fin et sa morale. */
export interface Aventure {
  titre: string;
  sousTitre: string;
  phrases: string[];
  questions: Question[];
  /** Seulement à la fin : dite après le questionnaire. */
  morale?: string;
}

function questionsDe(brutes: ReadonlyArray<{ question: string; choix: string[]; indice?: number }>, phrases: string[], v: Record<string, string | number>): Question[] {
  return brutes.map((q) => ({
    question: remplir(q.question, v),
    choix: q.choix.map((c) => remplir(c, v)) as [string, string, string],
    indice: q.indice ? (phrases[q.indice - 1] ?? null) : null,
  }));
}

const reussie = (reussis: number, total: number): boolean => reussis >= (total === 1 ? 1 : REUSSIS_POUR_FINIR);

/** Les quêtes du jour (sans le grand projet) : l'attraction et son étape du jour, les mots du
 *  jour, les annonces des habitants. */
export function quetesDuJour(m: Monde): Quete[] {
  const lundi = lundiDe(m.jour);
  const dimanche = ajouterJours(lundi, 6);
  const quetes: Quete[] = [];

  // L'attraction de la fête : celle terminée cette semaine, sinon celle en construction.
  const a = m.attraction;
  const terminee = a.epreuves.find((e) => e.jour >= lundi && e.jour <= dimanche && reussie(e.reussis, e.total) && a.construites.includes(e.attraction));
  const id = terminee?.attraction ?? (a.enCours && (a.debut === '' || a.debut <= dimanche) ? a.enCours : null);
  if (id) {
    const Q = T.quetes.attraction;
    const nom = minuscule(m.nomsAttractions[id] ?? id);
    const forain = a.prenoms[id] ?? Q.forainSansNom;
    const v = { attraction: nom, forain };
    const etape = Math.min(5, a.compteLe === m.jour ? a.etapes : a.etapes + 1);
    const phrases = [...(terminee ? [] : [remplir(Q.etapeDuJour, { etape })]), ...Q.phrases.map((p) => remplir(p, v))];
    const proposes = (m.prenomsProposes[id] ?? []).filter((p) => p !== forain);
    const bilanForain = a.prenoms[id] && proposes.length >= 2;
    quetes.push({
      id: 'attraction',
      titre: remplir(Q.titre, v),
      phrases,
      lieu: 'fete',
      faite: Boolean(terminee),
      questions: questionsDe(Q.questions, phrases, v),
      bilan: terminee
        ? questionsDe(
            T.bilan.attraction.filter((_, i) => i === 0 || bilanForain),
            [],
            { ...v, autre1: proposes[0] ?? '', autre2: proposes[1] ?? '' },
          )
        : [],
    });
  }

  // Les mots du jour : ceux que la mémoire propose aujourd'hui, et un mot mis en avant.
  if (m.dictee.mots.length) {
    const Q = T.quetes.motsDuJour;
    const n = m.motsDuJour.mots.length;
    const mot = n ? m.motsDuJour.mots[Math.floor(m.hasard() * n)]! : '';
    const dansLaListe = new Set([...m.dictee.mots.map((x) => x.w), ...m.motsDuJour.mots].map((x) => x.toLocaleLowerCase('fr')));
    const leurres = T.bilan.leurres.filter((l) => !dansLaListe.has(l));
    const l1 = leurres[Math.floor(m.hasard() * leurres.length)] ?? '';
    const l2 = leurres.filter((l) => l !== l1)[Math.floor(m.hasard() * (leurres.length - 1))] ?? '';
    const v = { n, mot, leurre1: l1, leurre2: l2 };
    const phrases = n === 0 ? [Q.aucun, Q.phrases[2]!] : [n === 1 ? Q.un : remplir(Q.phrases[0]!, v), remplir(Q.phrases[1]!, v), Q.phrases[2]!];
    // Les questions (sans majuscule forcée : le mot du jour garde son orthographe), chacune avec
    // la phrase qui contient la réponse.
    const valeur = (k: string, plus?: string): string => String(plus ? Number(v.n) + Number(plus) : (v as Record<string, string | number>)[k]);
    const avec = (q: (typeof Q.questions)[number], indice: string | undefined): Question => ({
      question: q.question,
      choix: q.choix.map((c) => c.replace(/\{(\w+)(\+(\d+))?\}/g,(_, k: string, __, plus?: string) => valeur(k, plus))) as [string, string, string],
      indice: indice ?? null,
    });
    const questions = n === 0 ? [] : [...(n > 1 ? [avec(Q.questions[0]!, phrases[0])] : []), avec(Q.questions[1]!, phrases[1]), avec(Q.questions[2]!, phrases[0])];
    quetes.push({ id: 'mots', titre: Q.titre, phrases, lieu: 'tableau', faite: m.motsDuJour.fini, questions, bilan: [] });
  }

  // Les annonces : qui a besoin de toi aujourd'hui.
  const noms = [...new Set(m.annonces)];
  if (noms.length) {
    const Q = T.quetes.annonces;
    const phrases = noms.map((nom) => remplir(Q.phrase, { nom }));
    const leurres = Q.leurres.filter((l) => !noms.includes(l));
    const questions: Question[] = noms.slice(0, 2).map((nom, i) => ({
      question: Q.question,
      choix: [nom, leurres[i % leurres.length]!, leurres[(i + 1) % leurres.length]!],
      indice: phrases[i] ?? null,
    }));
    quetes.push({ id: 'annonces', titre: Q.titre, phrases, lieu: 'tableau', faite: false, questions: questions.slice(0, 1), bilan: [] });
  }
  return quetes;
}

/** L'ancien nom (les quêtes changent maintenant chaque jour). */
export const quetesDeLaSemaine = quetesDuJour;

export interface Histoire {
  numero: number;
  titre: string;
  phrases: string[];
  questions: Question[];
}

export type Edition = (
  | { type: 'histoire'; histoire: Histoire; quetes: Quete[] }
  | { type: 'quetes'; quetes: Quete[] }
  | { type: 'bilan'; quetes: Quete[] }
) & { aventure?: Aventure };

/** L'édition du jour. premiere : le lundi de la semaine 1 (celle de la première lecture). */
export function editionDuJour(g: EtatGazette, quetes: Quete[], jour: Jour, prenom: string, aventure?: Aventure): Edition {
  const e = editionSansAventure(g, quetes, jour, prenom);
  return aventure ? { ...e, aventure } : e;
}

function editionSansAventure(g: EtatGazette, quetes: Quete[], jour: Jour, prenom: string): Edition {
  const lundi = lundiDe(jour);
  const premiere = g.premiere || lundi;
  const numero = Math.round((Date.parse(lundi) - Date.parse(premiere)) / (7 * 86400000)) + 1;
  const restantes = quetes.filter((q) => !q.faite);
  const brute = T.histoires[numero - 1];
  if (brute && !g.histoiresLues.includes(lundi)) {
    // Sans prénom (pas encore choisi), « c'est toi, {prenom} ! » devient « c'est toi ! ».
    const phrases = brute.phrases.map((p) => remplir(prenom ? p : p.replace(/, {prenom}/g, ''), { prenom }));
    return { type: 'histoire', histoire: { numero, titre: remplir(brute.titre, { prenom }), phrases, questions: questionsDe(brute.questions, phrases, { prenom }) }, quetes: restantes };
  }
  if (restantes.length) return { type: 'quetes', quetes: restantes };
  return { type: 'bilan', quetes: quetes.filter((q) => q.faite) };
}

/** Les questions du jour : 3 tirées au hasard (moins s'il n'y en a pas assez). Pour l'histoire,
 *  au moins deux sur l'histoire. */
export function questionnaire(e: Edition, hasard: () => number, nombre = 3): Question[] {
  const tirer = (liste: Question[], k: number): Question[] => {
    const reste = [...liste];
    const pris: Question[] = [];
    while (pris.length < k && reste.length) pris.push(reste.splice(Math.floor(hasard() * reste.length), 1)[0]!);
    return pris;
  };
  if (e.aventure) {
    const surAventure = e.aventure.morale ? e.aventure.questions.slice(0, 1) : tirer(e.aventure.questions, 2);
    const autres = e.type === 'bilan' ? e.quetes.flatMap((q) => q.bilan) : e.quetes.flatMap((q) => q.questions);
    return [...surAventure, ...tirer(autres, nombre - surAventure.length)];
  }
  if (e.type === 'histoire') {
    const surQuetes = tirer(e.quetes.flatMap((q) => q.questions), 1);
    return [...tirer(e.histoire.questions, nombre - surQuetes.length), ...surQuetes];
  }
  if (e.type === 'quetes') return tirer(e.quetes.flatMap((q) => q.questions), nombre);
  return tirer(e.quetes.flatMap((q) => q.bilan), nombre);
}

/** Les autres questions de l'édition (pas déjà posées), dans le désordre : à la deuxième erreur,
 *  la question est remplacée par l'une d'elles. */
export function reserve(e: Edition, posees: readonly Question[], hasard: () => number): Question[] {
  const aventure = e.aventure && !e.aventure.morale ? e.aventure.questions : [];
  const toutes = aventure.concat(e.type === 'histoire' ? [...e.histoire.questions, ...e.quetes.flatMap((q) => q.questions)] : e.type === 'quetes' ? e.quetes.flatMap((q) => q.questions) : e.quetes.flatMap((q) => q.bilan));
  const reste = toutes.filter((q) => !posees.includes(q));
  for (let i = reste.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [reste[i], reste[j]] = [reste[j]!, reste[i]!];
  }
  return reste;
}
