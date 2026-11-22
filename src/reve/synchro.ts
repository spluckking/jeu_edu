// L'échange avec le dépôt privé (docs/adr/0001) : la tablette y dépose le journal du jour
// et les décisions du parent, et y lit la préparation du lendemain. C'est le seul échange
// réseau du jeu ; sans réseau ou sans clé, le jeu continue normalement.

import { ajouterJours, jourDe, type Jour } from '../memoire/jours.ts';
import { memoire } from '../app/essai.ts';
import type { Sauvegarde } from '../sauvegarde/format.ts';
import { lirePreparation, type Preparation } from './preparation.ts';
import { pointsFaibles, statistiques } from '../stats/stats.ts';
import { programme } from '../ville/programme.ts';
import { lundiDe } from '../ville/gazette.ts';

export interface Acces {
  /** « propriétaire/nom » du dépôt privé. */
  depot: string;
  /** Clé d'accès limitée à ce seul dépôt, saisie par le parent. */
  cle: string;
}

export type Recuperer = (url: string, init?: RequestInit) => Promise<Response>;

const CLE_ACCES = memoire('jeu-edu:acces');
const CLE_ENVOIS = memoire('jeu-edu:envois');
export const DEPOT_VALIDE = /^[\w.-]+\/[\w.-]+$/;

/** La clé reste sur la tablette, à part de la sauvegarde : elle n'est jamais envoyée ailleurs. */
export function lireAcces(): Acces | null {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_ACCES) ?? 'null') as Partial<Acces> | null;
    return brut && typeof brut.depot === 'string' && typeof brut.cle === 'string' && DEPOT_VALIDE.test(brut.depot)
      ? { depot: brut.depot, cle: brut.cle }
      : null;
  } catch {
    return null;
  }
}

export function ecrireAcces(acces: Acces | null): void {
  try {
    if (acces) localStorage.setItem(CLE_ACCES, JSON.stringify(acces));
    else localStorage.removeItem(CLE_ACCES);
  } catch {
    // Stockage indisponible : l'échange ne se fera pas.
  }
}

export interface Envoi {
  chemin: string;
  contenu: unknown;
  /** Un fichier binaire (une image) : envoyé tel quel, à la place du contenu JSON. */
  octets?: Uint8Array;
}

/**
 * Ce que la tablette dépose : un fichier de journal par jour récent (réponses, temps, séance),
 * sans prénom, et les décisions du parent sur les textes proposés.
 */
export function envoisAPreparer(s: Sauvegarde, aujourdhui: Jour, jours = 3): Envoi[] {
  const envois: Envoi[] = [];
  for (let i = jours - 1; i >= 0; i--) {
    const jour = ajouterJours(aujourdhui, -i);
    const reponses = s.journal.filter((e) => jourDe(new Date(e.instant)) === jour);
    const journee = s.journees[jour];
    if (reponses.length === 0 && !journee) continue;
    envois.push({
      chemin: `journal/${jour}.json`,
      contenu: {
        jour,
        journee: journee ?? null,
        reponses,
        niveaux: { defis: s.niveauDefis.niveau, horloge: s.niveauHorloge.niveau, peche: s.niveauPeche.niveau },
        tickets: s.tickets,
        roue: s.roue,
        jetons: s.jetons,
        maneges: s.maneges,
        garderobe: s.garderobe,
      },
    });
  }
  envois.push({ chemin: 'validations.json', contenu: s.validations });
  // L'état de la mémoire, pour que le rêve voie les éléments qui résistent.
  envois.push({ chemin: 'etats.json', contenu: s.etats });
  // Les statistiques de toutes les compétences, et les points faibles : le rêve s'en sert pour
  // choisir les exercices du lendemain (preparation.competences, preparation.ateliers).
  const stats = statistiques(s.journal, aujourdhui);
  // Le programme de la semaine (les devoirs) : le rêve ne choisit que pour les stands libres.
  const semaine = programme.semaines.find((x) => x.valide && x.lundi === lundiDe(aujourdhui)) ?? null;
  envois.push({ chemin: 'stats.json', contenu: { jour: aujourdhui, programme: semaine, pointsFaibles: pointsFaibles(stats), competences: stats } });
  return envois;
}

function enBase64(texte: string): string {
  const octets = new TextEncoder().encode(texte);
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire);
}

function octetsEnBase64(octets: Uint8Array): string {
  let binaire = '';
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire);
}

function depuisBase64(b64: string): string {
  const binaire = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binaire, (c) => c.charCodeAt(0)));
}

function dejaEnvoyes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CLE_ENVOIS) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export interface Resultat {
  envoyes: number;
  preparation: Preparation | null;
  /** La préparation telle que le rêve l'a écrite (pour les parties lues ailleurs : la dictée). */
  brut: unknown;
  /** Les chemins envoyés pendant cet échange. */
  chemins: string[];
}

/** Un échange complet. Lève une erreur lisible pour le parent si quelque chose échoue. */
/** extras : d'autres fichiers à déposer (la dictée de la ville, ses écritures). */
export async function synchroniser(s: Sauvegarde, acces: Acces, aujourdhui: Jour, recuperer: Recuperer = fetch, extras: Envoi[] = []): Promise<Resultat> {
  const base = `https://api.github.com/repos/${acces.depot}/contents/`;
  const entetes = {
    Authorization: `Bearer ${acces.cle}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const verifier = (r: Response, quoi: string): void => {
    if (r.status === 401 || r.status === 403) throw new Error('La clé est refusée : vérifie-la, ou ses droits sur le dépôt.');
    if (r.status === 404 && quoi !== 'lire') throw new Error('Dépôt introuvable : vérifie son nom.');
    if (!r.ok && r.status !== 404) throw new Error(`Le dépôt a répondu ${r.status}.`);
  };

  const envoyes = dejaEnvoyes();
  let nombre = 0;
  const chemins: string[] = [];
  for (const envoi of [...envoisAPreparer(s, aujourdhui), ...extras]) {
    // Une image : on retient seulement qu'elle est partie (son nom est unique).
    const texte = envoi.octets ? `image:${envoi.octets.length}` : `${JSON.stringify(envoi.contenu, null, 2)}\n`;
    if (envoyes[envoi.chemin] === texte) continue;
    const existant = await recuperer(base + envoi.chemin, { headers: entetes });
    verifier(existant, 'lire');
    const sha = existant.ok ? ((await existant.json()) as { sha?: string }).sha : undefined;
    const r = await recuperer(base + envoi.chemin, {
      method: 'PUT',
      headers: { ...entetes, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Tablette : ${envoi.chemin}`, content: envoi.octets ? octetsEnBase64(envoi.octets) : enBase64(texte), ...(sha ? { sha } : {}) }),
    });
    verifier(r, 'écrire');
    envoyes[envoi.chemin] = texte;
    chemins.push(envoi.chemin);
    nombre++;
  }
  try {
    localStorage.setItem(CLE_ENVOIS, JSON.stringify(envoyes));
  } catch {
    // Sans stockage, on renverra les mêmes fichiers la prochaine fois : sans gravité.
  }

  const r = await recuperer(`${base}preparation.json`, { headers: entetes });
  verifier(r, 'lire');
  if (!r.ok) return { envoyes: nombre, preparation: null, brut: null, chemins };
  const fichier = (await r.json()) as { content?: string };
  let brut: unknown = null;
  try {
    brut = JSON.parse(depuisBase64(fichier.content ?? ''));
  } catch {
    brut = null;
  }
  return { envoyes: nombre, preparation: lirePreparation(brut), brut, chemins };
}
