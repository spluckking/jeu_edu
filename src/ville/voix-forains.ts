// Les voix des forains dans la ville : chacun garde la voix du jeu d'avant (src/son/salutations.ts),
// le forain de l'attraction a la sienne. Les phrases (content/ville/fete.json) sont enregistrées à
// l'avance par scripts/generer-voix.mjs, dans public/voix/ville/ ; le nom du fichier dépend de la
// voix et de la phrase, comme pour les autres voix. Pur, sans navigateur.

import { empreinte, normaliserPhrase } from '../son/cle-voix.ts';
import { SALUTATIONS } from '../son/salutations.ts';

export interface Reglage {
  voix: string;
  /** Azure : prosody. */
  hauteur: string;
  debit: string;
  /** Azure : express-as, seulement pour les voix qui l'ont (Henri, Denise : « cheerful »). */
  style?: string;
}

const depuis = (id: string, style?: string): Reglage => {
  const s = SALUTATIONS[id];
  if (!s) throw new Error(`Pas de voix pour ${id}`);
  return { voix: s.voix, hauteur: s.hauteur, debit: s.debit, ...(style ? { style } : {}) };
};

/** Les voix, par forain : les cinq stands, puis celui de l'attraction. */
export const VOIX_FORAINS: Record<string, Reglage> = {
  chamboule: depuis('chamboule', 'cheerful'),
  confiserie: depuis('confiserie'),
  chantier: depuis('chantier'),
  horloge: depuis('horloge'),
  peche: depuis('peche'),
  roue: { voix: 'fr-FR-YvesNeural', hauteur: '+3%', debit: '-3%' },
  // Les habitants de la ville (content/ville/salutations-habitants.json), des voix que les forains n'ont pas.
  epiciere: { voix: 'fr-FR-JosephineNeural', hauteur: '+0%', debit: '-4%' },
  postiere: { voix: 'fr-FR-YvetteNeural', hauteur: '+2%', debit: '-2%' },
  boulanger: { voix: 'fr-FR-ClaudeNeural', hauteur: '-2%', debit: '-5%' },
};

/** Le fichier d'une phrase dite par ce forain (relatif au dossier des voix). */
export function fichierForain(forain: string, texte: string): string | null {
  const r = VOIX_FORAINS[forain];
  return r ? `ville/${forain}-${empreinte(`${r.voix}|${r.style ?? ''}|${r.hauteur}|${r.debit}|${normaliserPhrase(texte)}`)}.mp3` : null;
}

interface TextesFete {
  apresUneManche: string;
  finiAujourdhui: string;
  salutations: Record<string, string[]>;
  attraction: Record<string, string>;
}

/** Toutes les phrases dites par les forains, à enregistrer : [forain, phrase]. */
export function phrasesDesForains(t: TextesFete): Array<[string, string]> {
  const r: Array<[string, string]> = [];
  for (const [stand, phrases] of Object.entries(t.salutations)) for (const p of [...phrases, t.apresUneManche, t.finiAujourdhui]) r.push([stand, p]);
  for (const [cle, p] of Object.entries(t.attraction)) if (cle !== 'nom') r.push(['roue', p]);
  return r;
}

/** Les salutations des habitants, à enregistrer : [habitant, phrase]. */
export function phrasesDesHabitants(t: { habitants: Record<string, { phrases: string[] }> }): Array<[string, string]> {
  return Object.entries(t.habitants).flatMap(([id, h]) => h.phrases.map((p): [string, string] => [id, p]));
}
