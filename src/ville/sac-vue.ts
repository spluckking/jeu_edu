// Le sac à dos à l'écran : 8 cases, chacune avec son objet et son nombre. Toucher une case
// propose de jeter 1 objet ou toute la case ; ce qui est jeté reste par terre jusqu'au lendemain.

import T from '../../content/ville/sac.json';
import { bruitage } from '../son/bruitages.ts';
import type { Panier } from './commerce.ts';
import { nomDe } from './demandes-ville.ts';
import { bouton, creer, icone, remplir } from './interface.ts';
import { CASES, casesDuSac, casesPrises } from './sac.ts';

/** Ouvre le sac dans ce fond ; jeter(produit, n) retire et pose par terre. Se résout à la fermeture. */
export function voirSac(f: HTMLElement, sac: () => Panier, jeter: (produit: string, n: number) => void): Promise<void> {
  return new Promise((fini) => {
    const carte = creer('section', 'exercice sac');
    const dessiner = (): void => {
      const s = sac();
      const grille = creer('div', 'sac-grille');
      const cases = casesDuSac(s);
      for (let i = 0; i < CASES; i++) {
        const c = cases[i];
        const b = bouton(c ? 'sac-case pleine' : 'sac-case', '');
        if (c) {
          const [produit, n] = c;
          b.append(icone(produit), creer('span', 'sac-nombre', String(n)));
          b.setAttribute('aria-label', `${n} ${n > 1 ? nomDe(produit).pluriel : nomDe(produit).nom}`);
          b.addEventListener('click', () => choisir(produit, n));
        } else b.disabled = true;
        grille.append(b);
      }
      const fermer = bouton('bouton-principal', 'Fermer');
      fermer.addEventListener('click', () => {
        bruitage.touche();
        fini();
      });
      carte.replaceChildren(
        creer('p', 'exercice-titre', T.titre),
        creer('p', 'exercice-texte', cases.length ? T.aide : T.vide),
        grille,
        creer('p', 'sac-compte', remplir(T.cases, { n: casesPrises(s) })),
        fermer,
      );
    };
    // Une case touchée : jeter 1, jeter toute la case, ou garder.
    const choisir = (produit: string, n: number): void => {
      bruitage.touche();
      const nom = n > 1 ? nomDe(produit).pluriel : nomDe(produit).nom;
      const actions = creer('div', 'exercice-actions');
      const garder = bouton('bouton-secondaire', T.garder);
      garder.addEventListener('click', dessiner);
      const un = bouton('bouton-secondaire', T.jeterUn);
      un.addEventListener('click', () => {
        jeter(produit, 1);
        dessiner();
      });
      actions.append(garder, un);
      if (n > 1) {
        const tout = bouton('bouton-principal', T.jeterTout);
        tout.addEventListener('click', () => {
          jeter(produit, n);
          dessiner();
        });
        actions.append(tout);
      }
      const apercu = creer('div', 'sac-apercu');
      apercu.append(icone(produit), creer('span', 'produit-nom', `${n} ${nom}`));
      carte.replaceChildren(creer('p', 'exercice-titre', T.titre), apercu, actions);
    };
    dessiner();
    f.replaceChildren(carte);
  });
}
