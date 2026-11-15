// La pêche aux canards : une phrase à trou, deux canards portent chacun un mot ;
// on pêche celui qui complète la phrase (a / à, et / est, on / ont, son / sont).

import { genererHomophone, verifierHomophone, type QuestionHomophone } from '../exercices/homophones.ts';
import { remplir, type Noms } from '../histoire/lecture.ts';
import { melanger } from '../memoire/moteur.ts';
import { dire } from '../son/voix.ts';
import { caseReponse, type JeuDeStand } from './stand.ts';

export interface SourcePeche {
  niveau(): number;
  noms(): Noms;
}

const CANARD =
  '<svg viewBox="0 0 64 48" aria-hidden="true" class="canard"><ellipse cx="30" cy="32" rx="24" ry="13" fill="#ffd447"/><circle cx="44" cy="16" r="11" fill="#ffd447"/><path d="M53 16l9 3-9 3z" fill="#ff8a3a"/><circle cx="47" cy="13" r="2.4" fill="#3a2f4a"/><path d="M6 40q24 10 48 0" stroke="#4cc4ff" stroke-width="4" fill="none"/></svg>';

export function creerPeche(source: SourcePeche): JeuDeStand {
  let courante: QuestionHomophone | null = null;
  let clavier: HTMLElement | null = null;
  let toucher: ((t: string) => void) | null = null;
  const question = (): QuestionHomophone => {
    if (!courante) throw new Error('Aucune pêche en cours');
    return courante;
  };

  function remplirClavier(): void {
    if (!clavier || !toucher || !courante) return;
    const t = toucher;
    clavier.className = 'clavier canards';
    clavier.replaceChildren(
      ...melanger(courante.mots, Math.random).map((mot) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'canard-bouton';
        b.innerHTML = CANARD;
        const etiquette = document.createElement('span');
        etiquette.textContent = mot;
        b.append(etiquette);
        b.setAttribute('aria-label', `Pêcher le canard « ${mot} »`);
        b.addEventListener('click', () => {
          t(mot);
          t('valider');
        });
        return b;
      }),
    );
  }

  /** La phrase, avec le trou ou le mot pêché à sa place. */
  function phrase(mot: string | null, classe: string): (string | Node)[] {
    const [avant = '', apres = ''] = remplir(question().phrase, source.noms()).split('___');
    return [caseReponse(avant, 'phrase-trou'), caseReponse(mot ?? '___', classe), caseReponse(apres, 'phrase-trou')];
  }

  return {
    id: 'peche',
    type: 'homophone',
    titre: 'La pêche aux canards',
    unite: (n) => `${n} canard${n > 1 ? 's' : ''} à pêcher`,
    large: false,
    construireClavier(c, t) {
      clavier = c;
      toucher = t;
      remplirClavier();
    },
    touchePhysique: () => null,
    saisir: (_s, touche) => touche,
    preparer() {
      courante = genererHomophone(source.niveau(), Math.random);
      remplirClavier();
    },
    afficher(_e, saisie, etat) {
      const q = question();
      const ligne = document.createElement('span');
      ligne.className = 'phrase-a-trou';
      ligne.append(...phrase(etat === 'saisie' ? (saisie || null) : q.reponse, etat === 'saisie' ? 'mot-trou' : 'mot-trou juste'));
      return [caseReponse('Pêche le canard qui complète la phrase :', 'enonce-heure'), ligne];
    },
    verifier: (_e, saisie) => verifierHomophone(question(), saisie),
    correction(_e, saisie) {
      const q = question();
      const ecrit = document.createElement('s');
      ecrit.textContent = saisie;
      const astuce = document.createElement('span');
      astuce.className = 'explication';
      astuce.textContent = q.explication;
      return ['Tu as pêché ', ecrit, `. Ici, on écrit « ${q.reponse} ».`, astuce];
    },
    ecouter: () => dire(remplir(question().phrase, source.noms()).replace('___', '…')),
    voixCorrection: () => `Ici, on écrit ${question().reponse}. ${question().explication}`,
    indice: () => null,
    reussite(fete) {
      fete.pecher();
      fete.saluerForain('peche');
    },
    idExercice: () => courante?.id ?? null,
  };
}
