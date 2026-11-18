// Les tuiles de lettres pour reconstituer un mot caché. On ne montre jamais un mot entier mal
// écrit : seulement les lettres du mot, mélangées, et deux lettres en plus prises au hasard
// (pour qu'il faille vraiment se souvenir du mot, pas seulement ranger des lettres).
// Le déterminant n'est pas à écrire (« la jungle » → jungle). Pur, sans navigateur.

import { separerDeterminant } from './correction.ts';

const EN_PLUS = 'aeiourstnlc';

/** Ce que l'enfant doit reconstituer : le mot sans son déterminant. */
export const aReconstituer = (mot: string): string => separerDeterminant(mot).coeur;

/** Les tuiles d'un mot : ses lettres (les espaces en moins), plus deux, mélangées. hasard : de 0 à 1. */
export function tuiles(mot: string, hasard: () => number = Math.random): string[] {
  const lettres = Array.from(aReconstituer(mot)).filter((c) => c.trim());
  const sac = [...lettres];
  for (let i = 0; i < 2; i++) sac.push(EN_PLUS[Math.floor(hasard() * EN_PLUS.length)] ?? 'e');
  // Mélange de Fisher-Yates ; on évite de rendre le mot déjà dans l'ordre.
  for (let essai = 0; essai < 5; essai++) {
    for (let i = sac.length - 1; i > 0; i--) {
      const j = Math.floor(hasard() * (i + 1));
      [sac[i], sac[j]] = [sac[j] as string, sac[i] as string];
    }
    if (sac.slice(0, lettres.length).join('') !== lettres.join('')) break;
  }
  return sac;
}
