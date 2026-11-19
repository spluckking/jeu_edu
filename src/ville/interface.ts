// Les petits outils d'interface de la ville : cartes, textes à lire (chaque mot se touche pour
// l'entendre), pièces et billets, images de produits.

import { avecPrenom } from './prenom-ecrit.ts';
import { bruitage } from '../son/bruitages.ts';
import { dire } from '../son/voix.ts';
import { euros } from './argent.ts';
import { aEntendre, decouper } from './mots.ts';

export const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  return e;
};
export const bouton = (classe: string, texte: string): HTMLButtonElement => {
  const b = creer('button', classe, texte);
  b.type = 'button';
  return b;
};

/** Remplace {cle} par sa valeur. */
export const remplir = (texte: string, valeurs: Record<string, string | number>): string => texte.replace(/\{(\w+)\}/g, (_, k: string) => String(valeurs[k] ?? ''));
export const majuscule = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Un texte que l'enfant lit lui-même : chaque mot se touche pour l'entendre. */
export function texteALire(texte: string, classe = 'exercice-texte texte-a-lire'): HTMLElement {
  const p = creer('p', classe);
  for (const m of decouper(avecPrenom(texte))) {
    if (!m.mot) {
      p.append(m.texte);
      continue;
    }
    const s = creer('span', 'mot', m.texte);
    s.addEventListener('click', () => {
      dire(aEntendre(m.texte));
      s.classList.add('entendu');
      document.dispatchEvent(new CustomEvent('mot-touche', { detail: m.texte }));
    });
    p.append(s);
  }
  return p;
}

/** Une pièce ou un billet, dessiné en HTML. */
export function piece(valeur: number): HTMLButtonElement {
  const b = bouton(`${valeur >= 500 ? 'billet' : 'piece'} argent-${valeur}`, euros(valeur));
  b.setAttribute('aria-label', euros(valeur));
  return b;
}

/** L'image d'un produit (icones/icone-<id>.webp) ; prefixe '' pour un meuble (icones/<id>.webp). */
export const icone = (id: string, prefixe = 'icone-'): HTMLImageElement => {
  const img = creer('img', 'produit-icone');
  img.src = `${import.meta.env.BASE_URL}icones/${prefixe}${id}.webp`;
  img.alt = '';
  return img;
};

/** Une carte avec un titre, un texte à lire et des boutons ; renvoie le bouton touché. */
export function carte(f: HTMLElement, titre: string, texte: string, boutons: string[], contenu: HTMLElement[] = []): Promise<number> {
  return new Promise((ok) => {
    const s = creer('section', 'exercice');
    s.append(creer('p', 'exercice-titre', titre), texteALire(texte), ...contenu);
    const actions = creer('div', 'exercice-actions');
    boutons.forEach((libelle, i) => {
      const b = bouton(i === 0 ? 'bouton-principal' : 'bouton-secondaire', libelle);
      b.addEventListener('click', () => {
        bruitage.touche();
        ok(i);
      });
      actions.append(b);
    });
    s.append(actions);
    f.replaceChildren(s);
  });
}
