// Le découpage d'un texte en mots touchables : l'enfant lit lui-même, et peut toucher un seul
// mot pour l'entendre (jamais la phrase entière). Pur, sans navigateur.

export interface Morceau {
  texte: string;
  /** Vrai pour un mot (qu'on peut toucher), faux pour l'espace et la ponctuation entre deux mots. */
  mot: boolean;
}

/** Un mot : des lettres ou chiffres, avec apostrophes et traits d'union à l'intérieur (« aujourd'hui », « grand-père »). */
const MORCEAUX = /([\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*)|([^\p{L}\p{N}]+)/gu;

export function decouper(texte: string): Morceau[] {
  const morceaux: Morceau[] = [];
  for (const m of texte.matchAll(MORCEAUX)) {
    if (m[1]) morceaux.push({ texte: m[1], mot: true });
    else if (m[2]) morceaux.push({ texte: m[2], mot: false });
  }
  return morceaux;
}

/** Ce qu'on fait entendre d'un mot touché : « l'heure » se dit « l'heure », sans la ponctuation autour. */
export function aEntendre(mot: string): string {
  return mot.replace(/’/g, "'");
}
