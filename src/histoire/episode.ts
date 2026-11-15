// Lire l'épisode du jour : le texte reste visible, une question à trois choix.
// Le texte n'est pas lu à voix haute d'emblée (le but est qu'il lise) ; « Écouter » apparaît
// après un premier essai raté, et la phrase qui contient la réponse s'allume.

import { melanger } from '../memoire/moteur.ts';
import { bruitage } from '../son/bruitages.ts';
import { dire } from '../son/voix.ts';
import type { Episode } from './feuilleton.ts';
import { remplir, type Noms } from './lecture.ts';

export interface ResultatEpisode {
  /** Nombre de réponses données avant la bonne (0 : juste du premier coup). */
  erreurs: number;
}

function el<K extends keyof HTMLElementTagNameMap>(balise: K, classe: string, texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(balise);
  e.className = classe;
  e.textContent = texte;
  if (e instanceof HTMLButtonElement) e.type = 'button';
  return e;
}

export function lireEpisode(episode: Episode, numero: number, noms: Noms, recompense: string): Promise<ResultatEpisode> {
  return new Promise((fini) => {
    const fond = el('div', 'vitrine-fond');
    const carte = el('div', 'episode');
    const entete = el('p', 'lecture-compte', `Le feuilleton · épisode ${numero}`);
    const titre = el('p', 'lecture-titre', remplir(episode.titre, noms));
    const texte = el('div', 'episode-texte');
    const phrases = episode.phrases.map((p) => el('span', 'episode-phrase', `${remplir(p, noms)} `));
    texte.append(...phrases);

    const ligneQuestion = el('div', 'episode-question');
    const question = el('p', 'lecture-titre', remplir(episode.question, noms));
    const ecouter = el('button', 'bouton-rond ecouter');
    ecouter.setAttribute('aria-label', 'Écouter l’histoire');
    ecouter.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>';
    ecouter.hidden = true;
    ecouter.addEventListener('click', () => dire(phrases.map((p) => p.textContent).join(' ')));
    ligneQuestion.append(question, ecouter);

    const message = el('p', 'lecture-texte');
    const liste = el('div', 'lecture-choix');
    const bon = remplir(episode.choix[0], noms);
    let erreurs = 0;
    for (const choix of melanger(episode.choix.map((c) => remplir(c, noms)), Math.random)) {
      const b = el('button', 'choix', choix);
      b.addEventListener('click', () => {
        if (choix === bon) {
          bruitage.finDeManche();
          b.classList.add('juste');
          liste.querySelectorAll('button').forEach((x) => (x.disabled = true));
          message.textContent = `Bravo, tu as bien lu ! ${recompense}`;
          const suite = el('button', 'bouton-principal', 'Continuer');
          suite.addEventListener('click', () => {
            bruitage.touche();
            fond.remove();
            fini({ erreurs });
          });
          carte.append(suite);
          return;
        }
        // Une erreur : on ne donne pas la réponse, on montre où la trouver.
        erreurs++;
        bruitage.erreur();
        b.disabled = true;
        b.classList.add('rate');
        phrases[episode.reponse - 1]?.classList.add('allumee');
        ecouter.hidden = false;
        message.textContent = 'Relis la phrase qui brille, puis essaie encore.';
      });
      liste.append(b);
    }

    carte.append(entete, titre, texte, ligneQuestion, liste, message);
    fond.append(carte);
    document.body.append(fond);
  });
}
