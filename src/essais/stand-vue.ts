// L'écran commun des essais de stands : une question à la fois (nombre au clavier, choix,
// pièces à donner, parts à colorier), deux essais, puis l'aide ; le bilan à la fin.

import T from '../../content/fete/essais.json';
import { bruitage } from '../son/bruitages.ts';
import { bouton as touche } from '../stands/stand.ts';
import { confettis } from '../ui/confettis.ts';
import { brouillonDisponible } from '../ville/brouillon.ts';
import { bouton, creer, remplir, texteALire } from '../ville/interface.ts';
import { euros, type Question, type StandEssai, type Visuel } from './stands-essai.ts';

const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attributs: Record<string, string | number>): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, String(v));
  return e;
};

/** Un disque ou une barre en n parts égales ; les parts coloriées, et celles qu'on touche. */
export function dessinParts(forme: 'disque' | 'barre', n: number, colorees: number, toucher?: (i: number, oui: boolean) => void): SVGSVGElement {
  const s = svg('svg', { viewBox: forme === 'disque' ? '-110 -110 220 220' : '0 0 420 110', class: 'essai-parts' });
  for (let i = 0; i < n; i++) {
    let part: SVGElement;
    if (forme === 'disque') {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const p = (a: number): string => `${(100 * Math.cos(a)).toFixed(2)} ${(100 * Math.sin(a)).toFixed(2)}`;
      part = svg('path', { d: n === 1 ? 'M0 -100 A100 100 0 1 1 0 100 A100 100 0 1 1 0 -100' : `M0 0 L${p(a0)} A100 100 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)} Z` });
    } else {
      const w = 400 / n;
      part = svg('rect', { x: 10 + i * w, y: 10, width: w, height: 90 });
    }
    part.setAttribute('class', i < colorees ? 'part coloree' : 'part');
    if (toucher) {
      part.addEventListener('click', () => {
        const oui = !part.classList.contains('coloree');
        part.classList.toggle('coloree', oui);
        bruitage.touche();
        toucher(i, oui);
      });
    }
    s.append(part);
  }
  return s;
}

/** Une figure de géométrie, un peu tournée parfois. */
export function dessinFigure(figure: string, tourne: number): SVGSVGElement {
  const s = svg('svg', { viewBox: '-120 -100 240 200', class: 'essai-figure' });
  const g = svg('g', { transform: `rotate(${tourne})` });
  const poly = (pts: Array<[number, number]>): SVGElement => svg('polygon', { points: pts.map((p) => p.join(',')).join(' ') });
  const regulier = (n: number): Array<[number, number]> => Array.from({ length: n }, (_, i) => [80 * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), 80 * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)]);
  const formes: Record<string, () => SVGElement> = {
    carre: () => poly([[-70, -70], [70, -70], [70, 70], [-70, 70]]),
    rectangle: () => poly([[-100, -55], [100, -55], [100, 55], [-100, 55]]),
    losange: () => poly([[0, -85], [60, 0], [0, 85], [-60, 0]]),
    triangle: () => poly([[-90, 70], [100, 70], [-10, -80]]),
    triangleRectangle: () => poly([[-80, 75], [90, 75], [-80, -75]]),
    cercle: () => svg('circle', { r: 80 }),
    pentagone: () => poly(regulier(5)),
    hexagone: () => poly(regulier(6)),
  };
  g.append((formes[figure] ?? formes.carre!)());
  s.append(g);
  return s;
}

function visuel(v: Visuel): SVGSVGElement {
  return v.sorte === 'parts' ? dessinParts(v.forme, v.n, v.colorees) : dessinFigure(v.figure, v.tourne);
}

/** Une question ; se résout avec vrai si trouvée (au 1er ou au 2e essai). */
function poser(carte: HTMLElement, q: Question, n: number): Promise<boolean> {
  return new Promise((fini) => {
    const retour = creer('div', 'essai-retour');
    const zone = creer('div', 'essai-reponse');
    let essais = 0;
    let saisie = '';
    let fait = false;
    let valider: HTMLButtonElement | null = null;

    // Juste, ou faux : au 2e essai faux, l'aide, puis « Suivant ».
    const juger = (juste: boolean): void => {
      if (fait) return;
      if (juste) {
        fait = true;
        bruitage.reussite();
        retour.replaceChildren(texteALire(T.commun.bravo));
        retour.className = 'essai-retour juste';
        setTimeout(() => fini(true), 1100);
        return;
      }
      essais++;
      bruitage.erreur();
      retour.className = 'essai-retour';
      if (essais < 2) {
        retour.replaceChildren(texteALire(T.commun.pasJuste));
        return;
      }
      fait = true;
      const suivant = bouton('bouton-principal', T.commun.suivant);
      suivant.addEventListener('click', () => fini(false));
      retour.replaceChildren(texteALire(q.aide), suivant);
    };

    if (q.type === 'nombre') {
      const caseR = creer('span', 'case', '?');
      const ligne = creer('p', 'question essai-ligne');
      ligne.append(caseR);
      if (q.unite) ligne.append(creer('span', 'essai-unite', q.unite));
      const clavier = creer('div', 'clavier chiffres essai-clavier');
      const maj = (): void => {
        caseR.textContent = saisie || '?';
        if (valider) valider.disabled = saisie === '';
      };
      const toucher = (t: string): void => {
        if (fait) return;
        bruitage.touche();
        if (t === 'effacer') saisie = saisie.slice(0, -1);
        else if (t === 'valider') {
          const ok = Number(saisie) === q.reponse;
          if (ok) caseR.className = 'case juste';
          juger(ok);
          if (!ok) saisie = '';
        } else if (saisie.length < 5) saisie = (saisie + t).replace(/^0+(?=\d)/, '');
        maj();
      };
      clavier.replaceChildren(...['7', '8', '9', '4', '5', '6', '1', '2', '3', 'effacer', '0', 'valider'].map((t) => touche(t, toucher)));
      valider = clavier.querySelector('.valider');
      zone.append(ligne, clavier);
      maj();
    } else if (q.type === 'choix') {
      const choix = creer('div', 'essai-choix');
      for (const c of q.choix) {
        const b = bouton('bouton-secondaire essai-choix-bouton', c);
        b.addEventListener('click', () => {
          if (fait) return;
          const ok = c === q.reponse;
          b.classList.add(ok ? 'juste' : 'faux');
          if (!ok) b.disabled = true;
          juger(ok);
        });
        choix.append(b);
      }
      zone.append(choix);
    } else if (q.type === 'argent') {
      const donnes: number[] = [];
      const plateau = creer('div', 'essai-plateau');
      const somme = creer('p', 'essai-somme');
      const maj = (): void => {
        const s = donnes.reduce((a, b) => a + b, 0);
        somme.textContent = remplir(T.monnaie.tonArgent, { somme: euros(s) });
        if (valider) valider.disabled = !donnes.length;
      };
      const caisse = creer('div', 'essai-pieces');
      for (const v of q.pieces) {
        const b = bouton(`${v >= 500 ? 'billet' : 'piece'} argent-${v}`, euros(v));
        b.addEventListener('click', () => {
          if (fait) return;
          bruitage.touche();
          donnes.push(v);
          const p = bouton(`${v >= 500 ? 'billet' : 'piece'} argent-${v} petite`, euros(v));
          // Toucher une pièce posée la reprend.
          p.addEventListener('click', () => {
            if (fait) return;
            donnes.splice(donnes.indexOf(v), 1);
            p.remove();
            maj();
          });
          plateau.append(p);
          maj();
        });
        caisse.append(b);
      }
      valider = bouton('bouton-principal', T.commun.valider);
      valider.addEventListener('click', () => juger(donnes.reduce((a, b) => a + b, 0) === q.montant));
      zone.append(plateau, somme, caisse, valider);
      maj();
    } else {
      const colorees = new Set<number>();
      const dessin = dessinParts(q.forme, q.n, 0, (i, oui) => {
        if (oui) colorees.add(i);
        else colorees.delete(i);
        if (valider) valider.disabled = colorees.size === 0;
      });
      valider = bouton('bouton-principal', T.commun.valider);
      valider.disabled = true;
      valider.addEventListener('click', () => juger(colorees.size === q.k));
      zone.append(dessin, valider);
    }

    carte.replaceChildren(
      creer('p', 'essai-compte', remplir(T.commun.questionN, { n, total: 6 })),
      texteALire(q.enonce),
      ...('visuel' in q && q.visuel ? [visuel(q.visuel)] : []),
      zone,
      retour,
    );
  });
}

/** Une partie du stand ; se résout quand l'enfant sort. */
export async function jouerStand(f: HTMLElement, stand: StandEssai): Promise<void> {
  const carte = creer('section', 'exercice essai-stand');
  f.replaceChildren(carte);
  for (;;) {
    brouillonDisponible(stand.brouillon);
    let trouves = 0;
    const qs = stand.questions(Math.random);
    for (const [i, q] of qs.entries()) {
      const corps = creer('div', 'essai-corps');
      carte.replaceChildren(creer('p', 'exercice-titre', stand.titre), corps);
      if (await poser(corps, q, i + 1)) trouves++;
    }
    brouillonDisponible(false);
    bruitage.finDeManche();
    if (trouves >= 4) confettis();
    const encore = bouton('bouton-principal', T.commun.encore);
    const sortir = bouton('bouton-secondaire', T.commun.sortir);
    const actions = creer('div', 'exercice-actions');
    actions.append(sortir, encore);
    carte.replaceChildren(creer('p', 'exercice-titre', stand.titre), texteALire(remplir(trouves <= 1 ? T.commun.bilanUn : T.commun.bilan, { n: trouves, total: qs.length })), actions);
    const rejouer = await new Promise<boolean>((ok) => {
      encore.addEventListener('click', () => ok(true));
      sortir.addEventListener('click', () => ok(false));
    });
    if (!rejouer) return;
  }
}
