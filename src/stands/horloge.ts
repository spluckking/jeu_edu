// L'horloge : lire l'heure sur un cadran, calculer une heure d'arrivée, se repérer dans la
// journée et la semaine. On tape l'heure (« 3 h 15 ») ou on touche une des trois réponses.

import { genererQuestionHeure, verifierHeure, type Heure, type QuestionHeure } from '../exercices/horloge.ts';
import { melanger } from '../memoire/moteur.ts';
import { dire } from '../son/voix.ts';
import { bouton, caseReponse, type JeuDeStand } from './stand.ts';

const SVG = 'http://www.w3.org/2000/svg';

/** Un cadran à aiguilles dessiné en SVG, chiffres de 1 à 12. */
export function dessinCadran({ h, m }: Heure): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '-110 -110 220 220');
  svg.setAttribute('class', 'cadran');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Une horloge');
  const ajouter = (nom: string, attributs: Record<string, string | number>, texte?: string): void => {
    const e = document.createElementNS(SVG, nom);
    for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, String(v));
    if (texte) e.textContent = texte;
    svg.append(e);
  };
  ajouter('circle', { r: 104, class: 'cadran-bord' });
  ajouter('circle', { r: 94, class: 'cadran-fond' });
  for (let i = 0; i < 60; i++) {
    const a = (i * Math.PI) / 30;
    const r1 = i % 5 === 0 ? 80 : 86;
    ajouter('line', {
      x1: Math.sin(a) * r1,
      y1: -Math.cos(a) * r1,
      x2: Math.sin(a) * 91,
      y2: -Math.cos(a) * 91,
      class: i % 5 === 0 ? 'cadran-trait fort' : 'cadran-trait',
    });
  }
  for (let n = 1; n <= 12; n++) {
    const a = (n * Math.PI) / 6;
    ajouter('text', { x: Math.sin(a) * 64, y: -Math.cos(a) * 64 + 9, class: 'cadran-chiffre' }, String(n));
  }
  const aiguille = (angle: number, longueur: number, classe: string): void => {
    const a = (angle * Math.PI) / 180;
    ajouter('line', { x1: 0, y1: 0, x2: Math.sin(a) * longueur, y2: -Math.cos(a) * longueur, class: classe });
  };
  aiguille((h % 12) * 30 + m * 0.5, 46, 'aiguille petite');
  aiguille(m * 6, 76, 'aiguille grande');
  ajouter('circle', { r: 7, class: 'cadran-centre' });
  return svg;
}

export interface SourceHorloge {
  niveau(): number;
}

export function creerHorloge(source: SourceHorloge): JeuDeStand {
  let courante: QuestionHeure | null = null;
  let choixMelanges: string[] = [];
  let clavier: HTMLElement | null = null;
  let toucher: ((touche: string) => void) | null = null;
  const question = (): QuestionHeure => {
    if (!courante) throw new Error('Aucune question de l’horloge en cours');
    return courante;
  };

  /** Le clavier change selon la question : chiffres et « h », ou trois réponses. */
  function remplirClavier(): void {
    if (!clavier || !toucher) return;
    const t = toucher;
    if (courante?.saisie === 'choix') {
      clavier.className = 'clavier choix-heure';
      clavier.replaceChildren(
        ...choixMelanges.map((texte) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'choix';
          b.textContent = texte;
          b.addEventListener('click', () => {
            t(texte);
            t('valider');
          });
          return b;
        }),
      );
      return;
    }
    clavier.className = 'clavier chiffres heure';
    clavier.replaceChildren(
      // Quatre colonnes : effacer et « h » à droite, valider en grand, 0 en bas.
      ...['7', '8', '9', 'effacer', '4', '5', '6', 'h', '1', '2', '3', 'valider', '0'].map((x) =>
        bouton(x, t, x === 'h' ? 'touche-h' : x === '0' ? 'zero' : ''),
      ),
    );
  }

  return {
    id: 'horloge',
    type: 'heure',
    titre: 'L’horloge',
    unite: (n) => `${n} question${n > 1 ? 's' : ''}`,
    large: false,
    construireClavier(c, t) {
      clavier = c;
      toucher = t;
      remplirClavier();
    },
    touchePhysique: (cle) => (/^\d$/.test(cle) ? cle : cle.toLowerCase() === 'h' ? 'h' : null),
    saisir(saisie, touche) {
      if (courante?.saisie === 'choix') return touche;
      const [heures = '', minutes] = saisie.split('h');
      if (touche === 'h') return heures !== '' && minutes === undefined ? `${saisie}h` : saisie;
      if (!/^\d$/.test(touche)) return saisie;
      if (minutes === undefined) return heures.length < 2 ? saisie + touche : saisie;
      return minutes.length < 2 ? saisie + touche : saisie;
    },
    preparer() {
      courante = genererQuestionHeure(source.niveau(), Math.random);
      choixMelanges = courante.saisie === 'choix' ? melanger(courante.choix, Math.random) : [];
      remplirClavier();
    },
    afficher(_e, saisie, etat) {
      const q = question();
      const morceaux: (string | Node)[] = [];
      if (q.cadran) morceaux.push(dessinCadran(q.cadran));
      morceaux.push(caseReponse(q.enonce, 'enonce-heure'));
      if (q.saisie === 'heure' || etat !== 'saisie') {
        const montre = etat === 'saisie' ? saisie.replace('h', ' h ') || '? h ?' : q.reponse;
        morceaux.push(caseReponse(montre, etat === 'saisie' ? 'case' : 'case juste'));
      }
      return morceaux;
    },
    verifier: (_e, saisie) => verifierHeure(question(), saisie),
    correction(_e, saisie) {
      const q = question();
      const ecrit = document.createElement('s');
      ecrit.textContent = q.saisie === 'heure' ? saisie.replace('h', ' h ') : saisie;
      const explication = document.createElement('span');
      explication.className = 'explication';
      explication.textContent = q.explication;
      return [q.saisie === 'heure' ? 'Tu as écrit ' : 'Tu as choisi ', ecrit, `. La réponse est ${q.reponse}.`, explication];
    },
    ecouter: () => dire(question().voix),
    voixCorrection: () => `La réponse est ${question().reponse}. ${question().explication}`,
    indice: () => null,
    reussite(fete) {
      fete.saluerForain('horloge');
    },
    idExercice: () => courante?.id ?? null,
  };
}
