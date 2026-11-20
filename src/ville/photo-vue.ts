// Une photo de la maison, en grand : elle s'agrandit depuis le cadre. Pour l'enfant, son prénom
// dessous et le bouton pour le changer. Le parent change la photo par un appui long (1,5 s) sur
// le petit bouton du bas : un toucher rapide de l'enfant ne fait rien.

import { bruitage } from '../son/bruitages.ts';
import { choisirPhoto, lirePhoto, type IdPhoto } from './photos.ts';

export interface VuePhoto {
  id: IdPhoto;
  /** Le prénom, écrit sous la photo (photo de l'enfant). */
  prenom?: string;
  /** Le bouton « Changer ton prénom » (photo de l'enfant). */
  changerPrenom?: () => Promise<string | null>;
  /** Appelé quand le parent a mis une nouvelle photo. */
  nouvelle(photo: Blob): void;
}

function bouton(classe: string, texte: string): HTMLButtonElement {
  return Object.assign(document.createElement('button'), { type: 'button', className: classe, textContent: texte });
}

/** Un appui long sur ce bouton (le parent) ; un toucher court ne fait rien. */
function appuiLong(b: HTMLElement, action: () => void): void {
  let minuterie = 0;
  const annuler = (): void => {
    window.clearTimeout(minuterie);
    b.classList.remove('appui');
  };
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      b.setPointerCapture(e.pointerId);
    } catch {
      // Sans capture, l'appui long marche quand même si le doigt ne bouge pas.
    }
    b.classList.add('appui');
    window.clearTimeout(minuterie);
    minuterie = window.setTimeout(() => {
      annuler();
      action();
    }, 1500);
  });
  for (const fin of ['pointerup', 'pointercancel'] as const) b.addEventListener(fin, annuler);
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

    const parent = bouton('photo-parent', 'Photo (parent : appui long)');
    appuiLong(parent, () => {
      void choisirPhoto(v.id).then((b) => {
        if (!b) return;
        montrer(b);
        v.nouvelle(b);
      });
    });
    carte.append(parent);
    fond.append(carte);
    document.body.append(fond);
  });
}
