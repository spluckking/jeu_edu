// Le brouillon : une feuille à petits carreaux, au stylet, pour poser ses calculs pendant un
// exercice de calcul (stands de la fête, épicerie, demandes, chantier, pêche). Un onglet
// « Brouillon » sur le bord gauche l'ouvre et le ferme ; ce qu'il y écrit reste tant que
// l'exercice est ouvert, et s'efface ensuite. Rien n'est gardé ni envoyé : c'est son brouillon.

import { bruitage } from '../son/bruitages.ts';
import { zoneEcriture, type ZoneEcriture } from './ecriture.ts';

let onglet: HTMLButtonElement | null = null;
let panneau: HTMLElement | null = null;
let zone: ZoneEcriture | null = null;

function construire(): void {
  if (onglet) return;
  onglet = Object.assign(document.createElement('button'), { type: 'button', className: 'brouillon-onglet', textContent: 'Brouillon' });
  onglet.hidden = true;
  panneau = Object.assign(document.createElement('aside'), { className: 'brouillon' });
  panneau.hidden = true;
  zone = zoneEcriture();
  zone.element.classList.add('brouillon-zone');
  const outils = Object.assign(document.createElement('div'), { className: 'brouillon-outils' });
  const bouton = (texte: string): HTMLButtonElement => Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-secondaire', textContent: texte });
  const gomme = bouton('Gomme');
  const effacer = bouton('Tout effacer');
  const fermer = bouton('Fermer');
  let enGomme = false;
  gomme.addEventListener('click', () => {
    enGomme = !enGomme;
    zone?.gomme(enGomme);
    gomme.textContent = enGomme ? 'Crayon' : 'Gomme';
  });
  effacer.addEventListener('click', () => {
    bruitage.touche();
    zone?.effacer();
  });
  fermer.addEventListener('click', () => basculer(false));
  outils.append(gomme, effacer, fermer);
  panneau.append(outils, zone.element);
  onglet.addEventListener('click', () => basculer(Boolean(panneau?.hidden)));
  document.body.append(onglet, panneau);
}

function basculer(ouvert: boolean): void {
  if (!panneau || !onglet) return;
  bruitage.touche();
  panneau.hidden = !ouvert;
  onglet.classList.toggle('ouvert', ouvert);
}

/** Pendant un exercice de calcul : l'onglet apparaît. À la fin : il disparaît, la feuille s'efface. */
export function brouillonDisponible(oui: boolean): void {
  construire();
  if (!onglet || !panneau) return;
  onglet.hidden = !oui;
  if (!oui) {
    panneau.hidden = true;
    onglet.classList.remove('ouvert');
    zone?.effacer();
  }
}
