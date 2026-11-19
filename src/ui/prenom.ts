// Donner un prénom à un forain arrivé après l'introduction (la première fois qu'on le rencontre).

import { METIERS, nettoyerPrenom, PROPOSITIONS } from '../histoire/lecture.ts';
import type { IdStand } from '../scene/fete.ts';
import { bruitage } from '../son/bruitages.ts';

export function demanderPrenom(id: IdStand, presentation: string): Promise<string> {
  return demanderUnPrenom(PROPOSITIONS[id], METIERS[id], presentation);
}

/** Le même choix pour un autre personnage : trois prénoms proposés, ou un prénom écrit. */
export function demanderUnPrenom(propositions: readonly string[], metier: string, presentation: string): Promise<string> {
  return new Promise((fini) => {
    const fond = document.createElement('div');
    fond.className = 'vitrine-fond';
    const carte = document.createElement('div');
    carte.className = 'vitrine';
    fond.append(carte);
    document.body.append(fond);

    const choisir = (prenom: string): void => {
      bruitage.ouverture();
      fond.remove();
      fini(prenom);
    };
    const texte = (classe: string, contenu: string): HTMLParagraphElement => {
      const p = document.createElement('p');
      p.className = classe;
      p.textContent = contenu;
      return p;
    };
    const bouton = (classe: string, contenu: string, action: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = classe;
      b.textContent = contenu;
      b.addEventListener('click', action);
      return b;
    };

    const proposer = (): void => {
      const liste = document.createElement('div');
      liste.className = 'lecture-choix';
      liste.append(...propositions.map((p) => bouton('choix', p, () => choisir(p))));
      carte.replaceChildren(
        texte('lecture-texte', presentation),
        texte('lecture-titre', `Comment s’appelle ${metier} ?`),
        liste,
        bouton('bouton-secondaire', 'Un autre prénom', () => {
          bruitage.touche();
          taper();
        }),
      );
    };
    const taper = (): void => {
      const champ = document.createElement('input');
      champ.className = 'champ-prenom';
      champ.maxLength = 14;
      champ.autocomplete = 'off';
      champ.spellcheck = false;
      champ.setAttribute('aria-label', 'Prénom');
      const valider = bouton('bouton-principal', 'C’est son prénom', () => choisir(nettoyerPrenom(champ.value)));
      valider.disabled = true;
      champ.addEventListener('input', () => {
        champ.value = champ.value.replace(/[^\p{L}' -]/gu, '');
        valider.disabled = nettoyerPrenom(champ.value).length < 2;
      });
      champ.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !valider.disabled) valider.click();
      });
      const boutons = document.createElement('div');
      boutons.className = 'lecture-boutons';
      boutons.append(bouton('bouton-secondaire', 'Retour', proposer), valider);
      carte.replaceChildren(texte('lecture-titre', `Écris le prénom de ${metier}.`), champ, boutons);
      champ.focus();
    };
    proposer();
  });
}
