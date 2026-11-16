// La clé d'une phrase lue à voix haute : la même dans le jeu et dans le script qui génère les
// MP3 (scripts/generer-voix.mjs). Pure, sans navigateur.

/** Mode de lecture : normal, ou lent pour la dictée. */
export type ModeVoix = 'normal' | 'dictee';

/** Les espaces en trop ne changent pas la phrase. */
export function normaliserPhrase(texte: string): string {
  return texte.replace(/\s+/g, ' ').trim();
}

/** Empreinte FNV-1a sur 32 bits, en hexadécimal (8 caractères). */
export function empreinte(texte: string): string {
  let h = 0x811c9dc5;
  for (const octet of new TextEncoder().encode(texte)) {
    h ^= octet;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** La clé d'une phrase dans le manifeste des voix. */
export function cleVoix(texte: string, mode: ModeVoix): string {
  return empreinte(`${mode}|${normaliserPhrase(texte)}`);
}
