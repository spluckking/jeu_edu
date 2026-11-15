// Le feuilleton : un épisode par jour, étape de la séance du jour. Les semaines sont
// écrites par Claude dans content/feuilleton/*.json et n'arrivent devant l'enfant qu'une
// fois « valide » mis à vrai par le parent. Fonctions pures, testées.

import { FORAINS } from './lecture.ts';

export interface Episode {
  /** « semaine-01:3 » : la semaine et le rang de l'épisode (à partir de 1). */
  id: string;
  titre: string;
  phrases: string[];
  question: string;
  /** Trois choix, le bon en premier (mélangés à l'affichage). */
  choix: [string, string, string];
  /** Rang (à partir de 1) de la phrase qui contient la réponse : elle s'allume après une erreur. */
  reponse: number;
}

export interface Semaine {
  id: string;
  titre: string;
  valide: boolean;
  episodes: Episode[];
}

const ID_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MARQUE = /\{([^}]*)\}/g;

function texteValide(v: unknown): v is string {
  return (
    typeof v === 'string' && v.trim() !== '' && [...v.matchAll(MARQUE)].every((m) => (FORAINS as readonly string[]).includes(m[1] ?? ''))
  );
}

/** Vérifie une semaine brute : liste des problèmes, ou la semaine. */
export function lireSemaine(brut: unknown, source: string): Semaine | string[] {
  if (typeof brut !== 'object' || brut === null) return [`${source} : ce n'est pas un objet`];
  const o = brut as Record<string, unknown>;
  const problemes: string[] = [];
  if (typeof o.id !== 'string' || !ID_VALIDE.test(o.id)) problemes.push(`${source} : « id » invalide`);
  if (!texteValide(o.titre)) problemes.push(`${source} : « titre » manque`);
  if (typeof o.valide !== 'boolean') problemes.push(`${source} : « valide » doit être vrai ou faux`);
  if (!Array.isArray(o.episodes) || o.episodes.length === 0) {
    problemes.push(`${source} : « episodes » doit être une liste non vide`);
    return problemes;
  }
  const episodes: Episode[] = [];
  o.episodes.forEach((brutEpisode: unknown, i) => {
    const e = (brutEpisode ?? {}) as Record<string, unknown>;
    const ou = `${source}, épisode ${i + 1}`;
    const phrases = Array.isArray(e.phrases) ? e.phrases : [];
    if (!texteValide(e.titre)) problemes.push(`${ou} : « titre » manque`);
    if (phrases.length < 3 || phrases.length > 6 || !phrases.every(texteValide)) problemes.push(`${ou} : il faut 3 à 6 phrases`);
    if (!texteValide(e.question)) problemes.push(`${ou} : « question » manque`);
    if (!Array.isArray(e.choix) || e.choix.length !== 3 || !e.choix.every(texteValide) || new Set(e.choix).size !== 3) {
      problemes.push(`${ou} : il faut trois choix différents`);
    }
    if (typeof e.reponse !== 'number' || !Number.isInteger(e.reponse) || e.reponse < 1 || e.reponse > phrases.length) {
      problemes.push(`${ou} : « reponse » doit être le rang d'une phrase`);
    }
    episodes.push({
      id: `${String(o.id)}:${i + 1}`,
      titre: e.titre as string,
      phrases: phrases as string[],
      question: e.question as string,
      choix: e.choix as [string, string, string],
      reponse: e.reponse as number,
    });
  });
  if (problemes.length > 0) return problemes;
  return { id: o.id as string, titre: o.titre as string, valide: o.valide as boolean, episodes };
}

/**
 * L'épisode à lire aujourd'hui : le premier épisode validé pas encore lu, dans l'ordre
 * des semaines. Un seul par jour : si un épisode a déjà été lu aujourd'hui, on le rend
 * (pour le relire) mais il ne compte plus comme à faire.
 */
export function episodeDuJour(semaines: readonly Semaine[], lus: ReadonlySet<string>): Episode | null {
  const ordre = [...semaines].filter((s) => s.valide).sort((a, b) => a.id.localeCompare(b.id));
  for (const s of ordre) for (const e of s.episodes) if (!lus.has(e.id)) return e;
  return null;
}

/** Toutes les semaines du dossier content/feuilleton, vérifiées au chargement. */
export function chargerFeuilleton(): Semaine[] {
  const fichiers = import.meta.glob<unknown>('/content/feuilleton/*.json', { eager: true, import: 'default' });
  const semaines: Semaine[] = [];
  for (const [chemin, brut] of Object.entries(fichiers)) {
    const lu = lireSemaine(brut, chemin);
    if (Array.isArray(lu)) console.error(lu.join('\n'));
    else semaines.push(lu);
  }
  return semaines;
}
