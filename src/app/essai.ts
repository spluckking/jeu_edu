// Le mode essai, pour le parent : « ville.html?test ». Toutes les mémoires du jeu (la ville, la
// sauvegarde des stands, les écritures, les photos, la clé du dépôt) ont un autre nom : la partie
// de l'enfant n'est jamais touchée, et rien n'est envoyé au rêve. Un bandeau « ESSAI » le rappelle.
// (« ?essai », lui, sert aux captures sur ordinateur et ne change pas les mémoires.)

export const MODE_ESSAI = typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');

/** Le nom d'une mémoire : celui de la partie de l'enfant, ou celui de l'essai. */
export const memoire = (nom: string): string => (MODE_ESSAI ? `${nom}-essai` : nom);

/** Le bandeau, en haut de l'écran. */
export function bandeauEssai(): void {
  if (!MODE_ESSAI) return;
  const b = document.createElement('p');
  b.className = 'bandeau-essai';
  b.textContent = 'ESSAI — la partie de l’enfant n’est pas touchée, rien n’est envoyé au rêve';
  document.body.append(b);
}
