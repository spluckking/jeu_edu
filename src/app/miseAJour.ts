// Mise à jour du jeu : quand une nouvelle version est téléchargée, un petit bandeau le dit.
// Elle s'installe quand on touche « Mettre à jour », ou toute seule au prochain lancement.
// Jamais de rechargement imposé pendant un exercice.

import { registerSW } from 'virtual:pwa-register';

export function surveillerMiseAJour(peutMontrer: () => boolean): void {
  let bandeau: HTMLElement | null = null;
  const mettreAJour = registerSW({
    immediate: true,
    onNeedRefresh() {
      const montrer = (): void => {
        if (bandeau) return;
        if (!peutMontrer()) {
          window.setTimeout(montrer, 5000);
          return;
        }
        bandeau = document.createElement('div');
        bandeau.className = 'mise-a-jour';
        bandeau.setAttribute('role', 'status');
        const texte = document.createElement('span');
        texte.textContent = 'Une nouvelle version du jeu est prête.';
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'bouton-principal';
        bouton.textContent = 'Mettre à jour';
        bouton.addEventListener('click', () => void mettreAJour(true));
        const plusTard = document.createElement('button');
        plusTard.type = 'button';
        plusTard.className = 'bouton-secondaire';
        plusTard.textContent = 'Plus tard';
        plusTard.addEventListener('click', () => bandeau?.remove());
        bandeau.append(texte, plusTard, bouton);
        document.body.append(bandeau);
      };
      montrer();
    },
  });
}
