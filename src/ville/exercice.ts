// L'exercice d'un mot de dictée, à l'écran : la fiche d'étude (le premier jour), puis le mot
// caché, dit à voix haute avec sa phrase, à reconstituer avec des tuiles. On ne montre jamais
// de fausse orthographe. Après une erreur, l'enfant regarde le mot juste, puis le reconstitue
// encore de mémoire (cette deuxième fois ne compte pas pour sa mémoire du mot).

import { corriger, separerDeterminant, type Verdict } from '../dictee/correction.ts';
import type { Reponse } from '../dictee/etat.ts';
import { detecter, LIEUX, morceaux } from '../dictee/pieges.ts';
import { syllabes } from '../dictee/syllabes.ts';
import { aReconstituer, tuiles } from '../dictee/tuiles.ts';
import { bruitage } from '../son/bruitages.ts';
import { dire } from '../son/voix.ts';

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
    const reconstituer = (essai: number): void => {
      const { det } = separerDeterminant(o.mot);
      const cible = Array.from(aReconstituer(o.mot));
      const titre = creer('p', 'exercice-titre', essai === 0 ? 'Écoute, puis reconstitue le mot' : 'À toi, de mémoire !');
      const ligne = creer('div', 'cases');
      if (det) ligne.append(creer('span', 'determinant', det.endsWith("'") ? det : `${det} `));
      const cases: Array<{ el: HTMLButtonElement; tuile: HTMLButtonElement | null; espace: boolean }> = cible.map((c) => {
        const el = bouton(c.trim() ? 'case' : 'case espace', c.trim() ? '' : ' ');
        ligne.append(el);
        return { el, tuile: null, espace: !c.trim() };
      });
      const sac = creer('div', 'tuiles');
      const reecouter = bouton('bouton-secondaire', 'Réécouter');
      const indice = bouton('bouton-secondaire', 'Indice');
      indice.hidden = !o.aide || essai > 0;
      const actions = creer('div', 'exercice-actions');
      const sur = bouton('bouton-principal', 'Sûr de moi');
      const hesite = bouton('bouton-secondaire', 'J’hésite');
      actions.append(hesite, sur);
      actions.hidden = true;
      let aideUtilisee = false;

      const reponse = (): string => cases.map((c) => (c.espace ? ' ' : (c.tuile?.textContent ?? ''))).join('');
      const majActions = (): void => {
        actions.hidden = cases.some((c) => !c.espace && !c.tuile);
      };
      const poser = (t: HTMLButtonElement): void => {
        const libre = cases.find((c) => !c.espace && !c.tuile);
        if (!libre) return;
        bruitage.touche();
        libre.tuile = t;
        libre.el.textContent = t.textContent;
        libre.el.classList.add('pleine');
        t.disabled = true;
        majActions();
      };
      for (const c of cases) {
        c.el.addEventListener('click', () => {
          if (!c.tuile) return;
          c.tuile.disabled = false;
          c.tuile = null;
          c.el.textContent = '';
          c.el.classList.remove('pleine');
          majActions();
        });
      }
      for (const l of tuiles(o.mot)) {
        const t = bouton('tuile', l);
        t.addEventListener('click', () => poser(t));
        sac.append(t);
      }
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
      const valider = (h: boolean): void => {
        const v = corriger(reponse(), o.mot);
        if (!premiere) premiere = { juste: v.juste, indice: aideUtilisee, hesite: h, reponse: v.reponse };
        if (!o.aide) {
          fini(premiere);
          return;
        }
        montrerCorrection(v, essai);
      };
      sur.addEventListener('click', () => valider(false));
      hesite.addEventListener('click', () => valider(true));
      const outils = creer('div', 'exercice-outils');
      outils.append(reecouter, indice);
      carte.replaceChildren(tete, titre, ligne, sac, outils, actions);
      ecouter(o.mot, o.phrase);
    };

    const montrerCorrection = (v: Verdict, essai: number): void => {
      const correction = creer('p', 'correction-lettres');
      for (const op of v.ops) {
        const s = creer('span', `lettre ${op.op}`, op.op === 'trop' ? op.donne : op.attendu);
        correction.append(s);
      }
      const titre = creer('p', 'exercice-titre', v.juste ? 'Bravo !' : v.accentSeulement ? 'Presque ! Regarde l’accent.' : 'On réessaie !');
      const suite = bouton('bouton-principal', v.juste ? 'Mot suivant' : 'Je regarde le mot');
      carte.replaceChildren(tete, titre, v.juste ? motColore(o.mot) : correction, suite);
      if (v.juste) bruitage.reussite();
      else bruitage.erreur();
      suite.addEventListener('click', () => {
        bruitage.touche();
        if (v.juste) fini(premiere as Reponse);
        // Après une erreur : le mot juste, puis le reconstituer de mémoire (une fois).
        else if (essai === 0) montrerFiche(() => reconstituer(1), true);
        else fini(premiere as Reponse);
      });
    };

    if (o.fiche && o.aide) montrerFiche(() => reconstituer(0));
    else reconstituer(0);
  });
}
