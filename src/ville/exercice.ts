// L'exercice d'un mot de dictée, à l'écran : la fiche d'étude (le premier jour), puis le mot
// caché, dit à voix haute avec sa phrase, à écrire au stylet (ecriture.ts). L'enfant compare
// ensuite son écriture au mot juste et dit lui-même si c'est pareil (le rêve et le parent
// relisent l'image plus tard). Après une erreur, il regarde le mot juste, puis l'écrit encore de
// mémoire (cette deuxième fois ne compte pas pour sa mémoire du mot).

import { separerDeterminant } from '../dictee/correction.ts';
import type { Reponse } from '../dictee/etat.ts';
import { detecter, LIEUX, morceaux } from '../dictee/pieges.ts';
import { syllabes } from '../dictee/syllabes.ts';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { dire } from '../son/voix.ts';
import { zoneEcriture } from './ecriture.ts';
import { changerEcriture, garderEcriture } from './ecritures.ts';

export interface OptionsExercice {
  mot: string;
  phrase: string;
  /** Montrer d'abord la fiche d'étude (mot jamais vu). */
  fiche: boolean;
  /** Indice permis et correction immédiate (pas pendant le concours d'écriture). */
  aide: boolean;
  /** Où en est la série : « 3 / 12 ». */
  rang: string;
}

const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  return e;
};
const bouton = (classe: string, texte: string): HTMLButtonElement => {
  const b = creer('button', classe, texte);
  b.type = 'button';
  return b;
};

/** Le mot découpé en syllabes, ses pièges en couleur (fiche d'étude et correction). */
function motColore(mot: string): HTMLElement {
  const p = creer('p', 'fiche-mot');
  for (const m of morceaux(mot, syllabes(mot))) {
    const s = creer('span', m.coupe ? 'syllabe nouvelle' : 'syllabe', m.texte);
    if (m.piege) s.style.color = LIEUX[m.piege].couleur;
    p.append(s);
  }
  return p;
}

/** Dit le mot, puis sa phrase. */
function ecouter(mot: string, phrase: string): void {
  dire(mot, true);
  if (phrase) window.setTimeout(() => dire(phrase, true), 1600);
}

/** Lance l'exercice d'un mot ; se résout avec la première réponse (celle qui compte). */
export function exercer(fond: HTMLElement, o: OptionsExercice): Promise<Reponse> {
  return new Promise((fini) => {
    const carte = creer('section', 'exercice');
    fond.replaceChildren(carte);
    const { lieu } = detecter(o.mot);
    const tete = creer('p', 'exercice-rang', o.rang);

    const montrerFiche = (puis: () => void, bref = false): void => {
      const titre = creer('p', 'exercice-titre', bref ? 'Regarde bien le mot !' : 'Un nouveau mot');
      const lieuTexte = creer('p', 'fiche-lieu');
      const pastille = creer('span', 'fiche-pastille');
      pastille.style.background = LIEUX[lieu].couleur;
      lieuTexte.append(pastille, ` Il habite ${LIEUX[lieu].nom.replace(/^L[ae’] ?/, (x) => x.toLowerCase())}. ${LIEUX[lieu].regle}`);
      const phrase = creer('p', 'fiche-phrase', o.phrase);
      const suite = bouton('bouton-principal', 'Je l’ai bien regardé');
      carte.replaceChildren(tete, titre, motColore(o.mot), lieuTexte, phrase, suite);
      ecouter(o.mot, o.phrase);
      if (bref) {
        suite.hidden = true;
        window.setTimeout(puis, 3500);
      } else {
        suite.addEventListener('click', () => {
          bruitage.touche();
          puis();
        });
      }
    };

    let premiere: Reponse | null = null;
    // Écrire le mot au stylet. essai 0 : celui qui compte ; essai 1 : de mémoire, après avoir
    // regardé le mot juste (ne compte pas pour sa mémoire du mot).
    const ecrire = (essai: number): void => {
      const { det, coeur } = separerDeterminant(o.mot);
      const lettres = Array.from(coeur.replace(/[\s'’-]/g, '')).length;
      const titre = creer('p', 'exercice-titre', essai === 0 ? 'Écoute, puis écris le mot' : 'À toi, de mémoire !');
      const ligne = creer('div', 'ecriture-ligne');
      if (det) ligne.append(creer('span', 'determinant', det.endsWith("'") ? det : `${det} `));
      const zone = zoneEcriture();
      ligne.append(zone.element);
      const reecouter = bouton('bouton-secondaire', 'Réécouter');
      const indice = bouton('bouton-secondaire', 'Indice');
      indice.hidden = !o.aide || essai > 0;
      const gomme = bouton('bouton-secondaire bouton-gomme', 'Gomme');
      const effacer = bouton('bouton-secondaire', 'Tout effacer');
      const actions = creer('div', 'exercice-actions');
      const sur = bouton('bouton-principal', 'Sûr de moi');
      const hesite = bouton('bouton-secondaire', 'J’hésite');
      actions.append(hesite, sur);
      // Les boutons restent à leur place (grisés tant que rien n'est écrit) : rien ne bouge sous le stylet.
      sur.disabled = hesite.disabled = true;
      let aideUtilisee = false;
      let enGomme = false;
      zone.quandChange(() => (sur.disabled = hesite.disabled = zone.vide()));
      gomme.addEventListener('click', () => {
        enGomme = !enGomme;
        zone.gomme(enGomme);
        gomme.classList.toggle('active', enGomme);
        gomme.textContent = enGomme ? 'Crayon' : 'Gomme';
      });
      effacer.addEventListener('click', () => {
        bruitage.touche();
        zone.effacer();
      });
      reecouter.addEventListener('click', () => ecouter(o.mot, o.phrase));
      indice.addEventListener('click', () => {
        aideUtilisee = true;
        indice.hidden = true;
        // L'indice : le mot découpé, 3 secondes, puis on reprend là où on en était.
        const apercu = creer('div', 'indice-apercu');
        apercu.append(motColore(o.mot));
        carte.append(apercu);
        window.setTimeout(() => apercu.remove(), 3000);
      });
      const valider = async (h: boolean): Promise<void> => {
        sur.disabled = hesite.disabled = true;
        const fin = performance.now();
        const ms = Math.round(fin - (zone.debut() ?? fin));
        const image = await zone.image();
        const id = image ? await garderEcriture({ jour: aujourdhui(), mot: o.mot, sorte: essai === 0 ? (o.aide ? 'revision' : 'concours') : 'reprise', ms, enfant: null, image }) : '';
        if (essai === 0) premiere = { juste: false, indice: aideUtilisee, hesite: h, reponse: '', ms, lettres, juge: 'enfant', ...(id ? { ecriture: id } : {}) };
        // Le concours : pas de correction tout de suite (on compare tout à la fin).
        if (!o.aide) {
          fini(premiere as Reponse);
          return;
        }
        comparer(image, id, essai);
      };
      sur.addEventListener('click', () => void valider(false));
      hesite.addEventListener('click', () => void valider(true));
      // Tous les boutons en haut : la main posée en bas pour écrire ne les touche pas.
      const outils = creer('div', 'exercice-outils');
      outils.append(reecouter, indice, gomme, effacer);
      const barre = creer('div', 'barre-ecriture');
      barre.append(outils, actions);
      carte.replaceChildren(tete, titre, barre, ligne);
      carte.classList.add('avec-ecriture');
      ecouter(o.mot, o.phrase);
    };

    // L'enfant compare son écriture au mot juste et dit lui-même si c'est pareil. Le rêve (la
    // nuit) et le parent (le soir) relisent ensuite l'image.
    const comparer = (image: Blob | null, id: string, essai: number): void => {
      const titre = creer('p', 'exercice-titre', 'Compare avec le mot juste');
      const tienne = creer('div', 'ecriture-comparee');
      if (image) {
        const url = URL.createObjectURL(image);
        const img = creer('img');
        img.src = url;
        img.alt = '';
        img.addEventListener('load', () => URL.revokeObjectURL(url));
        tienne.append(creer('span', 'ecriture-etiquette', 'Toi'), img);
      }
      const juste = creer('div', 'ecriture-comparee');
      juste.append(creer('span', 'ecriture-etiquette', 'Le mot'), motColore(o.mot));
      const question = creer('p', 'exercice-texte', 'Est-ce que tu as écrit exactement pareil, lettre par lettre ?');
      const pareil = bouton('bouton-principal', 'C’est pareil');
      const trompe = bouton('bouton-secondaire', 'Je me suis trompé');
      const actions = creer('div', 'exercice-actions');
      actions.append(trompe, pareil);
      carte.replaceChildren(tete, titre, tienne, juste, question, actions);
      const repondre = (oui: boolean): void => {
        if (id) void changerEcriture(id, { enfant: oui });
        if (essai === 0 && premiere) premiere = { ...premiere, juste: oui };
        if (oui) {
          bruitage.reussite();
          if (essai === 0) {
            const t = creer('p', 'exercice-titre', 'Bravo !');
            const suite = bouton('bouton-principal', 'Mot suivant');
            carte.replaceChildren(tete, t, motColore(o.mot), suite);
            suite.addEventListener('click', () => {
              bruitage.touche();
              fini(premiere as Reponse);
            });
          } else fini(premiere as Reponse);
          return;
        }
        bruitage.erreur();
        // Après une erreur : regarder le mot juste, puis l'écrire de mémoire (une fois).
        if (essai === 0) montrerFiche(() => ecrire(1), true);
        else fini(premiere as Reponse);
      };
      pareil.addEventListener('click', () => repondre(true));
      trompe.addEventListener('click', () => repondre(false));
    };

    if (o.fiche && o.aide) montrerFiche(() => ecrire(0));
    else ecrire(0);
  });
}
