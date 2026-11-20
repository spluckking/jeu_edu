// Une photo de la maison, en grand : elle s'agrandit depuis le cadre. Pour l'enfant, son prénom
// dessous et le bouton pour le changer. Le parent change les photos dans l'espace parent.

import { bruitage } from '../son/bruitages.ts';
import { lirePhoto, type IdPhoto } from './photos.ts';

export interface VuePhoto {
  id: IdPhoto;
  /** Le prénom, écrit sous la photo (photo de l'enfant). */
  prenom?: string;
  /** Le bouton « Changer ton prénom » (photo de l'enfant). */
  changerPrenom?: () => Promise<string | null>;
}

function bouton(classe: string, texte: string): HTMLButtonElement {
  return Object.assign(document.createElement('button'), { type: 'button', className: classe, textContent: texte });
}

export async function voirPhoto(v: VuePhoto): Promise<void> {
  const photo = await lirePhoto(v.id);
  return new Promise((fini) => {
    const fond = Object.assign(document.createElement('div'), { className: 'photo-fond' });
    const carte = Object.assign(document.createElement('div'), { className: `photo-carte photo-${v.id}` });
    const cadre = Object.assign(document.createElement('div'), { className: 'photo-cadre' });
    let url = '';
    const montrer = (b: Blob | null): void => {
      if (url) URL.revokeObjectURL(url);
      url = '';
      cadre.replaceChildren();
      if (b) {
        url = URL.createObjectURL(b);
        cadre.append(Object.assign(document.createElement('img'), { src: url, alt: '' }));
      } else {
        cadre.append(Object.assign(document.createElement('p'), { className: 'photo-vide', textContent: 'Pas encore de photo.' }));
      }
    };
    montrer(photo);
    carte.append(cadre);

    const nom = v.prenom !== undefined ? Object.assign(document.createElement('p'), { className: 'photo-prenom', textContent: v.prenom }) : null;
    if (nom) carte.append(nom);
    const actions = Object.assign(document.createElement('div'), { className: 'photo-actions' });
    if (v.changerPrenom) {
      const changer = bouton('bouton-secondaire', 'Changer ton prénom');
      changer.addEventListener('click', () => {
        bruitage.touche();
        fond.hidden = true;
        void v.changerPrenom!().then((p) => {
          fond.hidden = false;
          if (p && nom) nom.textContent = p;
        });
      });
      actions.append(changer);
    }
    const fermer = bouton('bouton-principal', 'Fermer');
    fermer.addEventListener('click', () => {
      bruitage.touche();
      if (url) URL.revokeObjectURL(url);
      fond.remove();
      fini();
    });
    actions.append(fermer);
    carte.append(actions);

    fond.append(carte);
    document.body.append(fond);
  });
}
