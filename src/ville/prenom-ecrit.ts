// Le prénom du personnage dans les saluts des habitants, seulement à l'écrit : « Bonjour ! »
// devient « Bonjour, Zoé ! ». La voix, enregistrée à l'avance, dit toujours la phrase d'origine.

let prenom = '';

export function retenirPrenomEcrit(p: string): void {
  prenom = p;
}

export function avecPrenom(texte: string): string {
  if (!prenom) return texte;
  return texte.replace(/^(Bonjour|Coucou) !/, `$1, ${prenom} !`);
}
