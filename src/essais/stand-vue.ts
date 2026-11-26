// L'écran commun des essais de stands : une question à la fois (nombre au clavier, choix,
// pièces à donner, parts à colorier), deux essais, puis l'aide ; le bilan à la fin.

import T from '../../content/fete/essais.json';
import { bruitage } from '../son/bruitages.ts';
import { bouton as touche } from '../stands/stand.ts';
import { confettis } from '../ui/confettis.ts';
import { brouillonDisponible, tableauBrouillon } from '../ville/brouillon.ts';
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

/** Des bonbons de toutes les couleurs, par rangées de 10 et par groupes de 5 (faciles à compter). */
function dessinBonbons(n: number): SVGSVGElement {
  const colonnes = Math.min(10, n);
  const rangees = Math.ceil(n / 10);
  const s = svg('svg', { viewBox: `0 0 ${colonnes * 54 + 16} ${rangees * 46 + 8}`, class: 'essai-bonbons' });
  const couleurs = ['#e0443a', '#f6c945', '#35c47a', '#6aa8ef', '#c58ce8'];
  for (let i = 0; i < n; i++) {
    const x = 28 + (i % 10) * 54 + (i % 10 >= 5 ? 8 : 0);
    const y = 27 + Math.floor(i / 10) * 46;
    const g = svg('g', { transform: `translate(${x} ${y})` });
    const c = couleurs[Math.floor(i / 5) % couleurs.length]!;
    g.append(svg('path', { d: 'M-11 0 L-20 -8 L-20 8 Z M11 0 L20 -8 L20 8 Z', fill: c, stroke: '#3b2b2b', 'stroke-width': 1.5 }), svg('circle', { r: 12, fill: c, stroke: '#3b2b2b', 'stroke-width': 2 }));
    s.append(g);
  }
  return s;
}

function visuel(v: Visuel): SVGSVGElement | HTMLElement {
  if (v.sorte === 'parts') {
    const d = dessinParts(v.forme, v.n, v.colorees);
    if (v.theme) d.classList.add(v.theme);
    return d;
  }
  if (v.sorte === 'deux') {
    // Deux tartes pareilles, côte à côte, chacune avec sa part.
    const r = creer('div', 'essai-deux');
    for (const p of [v.a, v.b]) {
      const c = creer('div', 'essai-deux-part');
      c.append(dessinParts(v.forme, p.n, p.k), creer('p', 'essai-deux-nom', `${p.k}/${p.n}`));
      r.append(c);
    }
    return r;
  }
  if (v.sorte === 'collection') return dessinBonbons(v.n);
  return dessinFigure(v.figure, v.tourne);
}

/** Ce qu'a donné une question : pour le bilan, et pour le journal (les statistiques). */
export interface ResultatQuestion {
  /** Trouvée, au 1er ou au 2e essai. */
  trouve: boolean;
  /** Juste au premier essai. */
  premierCoup: boolean;
  /** L'aide a été montrée (deux essais faux). */
  aide: boolean;
  /** La première réponse donnée. */
  reponse: string;
  /** Le temps jusqu'à la première réponse, en millisecondes. */
  duree: number;
}

/** Une question ; se résout avec son résultat. */
function poser(carte: HTMLElement, q: Question, n: number, total: number): Promise<ResultatQuestion> {
  return new Promise((resoudre) => {
    const retour = creer('div', 'essai-retour');
    const zone = creer('div', 'essai-reponse');
    const debut = performance.now();
    let essais = 0;
    let saisie = '';
    let fait = false;
    let valider: HTMLButtonElement | null = null;
    let premiere: { reponse: string; duree: number } | null = null;
    const fini = (trouve: boolean): void => {
      const p = premiere ?? { reponse: '', duree: 0 };
      resoudre({ trouve, premierCoup: trouve && essais === 0, aide: !trouve, reponse: p.reponse, duree: p.duree });
    };

    // Juste, ou faux : au 2e essai faux, l'aide, puis « Suivant ».
    const juger = (juste: boolean, reponse: string): void => {
      if (fait) return;
      premiere ??= { reponse, duree: Math.round(performance.now() - debut) };
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
          juger(ok, saisie);
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
          juger(ok, c);
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
      valider.addEventListener('click', () => {
        const s = donnes.reduce((a, b) => a + b, 0);
        juger(s === q.montant, String(s));
      });
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
      valider.addEventListener('click', () => juger(colorees.size === q.k, `${colorees.size}/${q.n}`));
      zone.append(dessin, valider);
    }

    // Le tableau de conversion qui va avec la question, dans le brouillon.
    tableauBrouillon('tableau' in q && q.tableau ? q.tableau : null);
    carte.replaceChildren(
      creer('p', 'essai-compte', remplir(T.commun.questionN, { n, total })),
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
      if ((await poser(corps, q, i + 1, qs.length)).trouve) trouves++;
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

export interface PartieAtelier {
  /** Le titre en haut (« Le stand des mesures de Lucien »). */
  titre: string;
  /** Le nombre de questions. */
  n: number;
  /** Les compétences sur lesquelles insister (choisies par le rêve). */
  focus: readonly string[];
  /** Le niveau de l'atelier (1 à 3). */
  niveau?: number;
  /** Chaque réponse, pour le journal. */
  noter(q: Question, r: ResultatQuestion): void;
  /** Le texte du bouton de sortie. */
  sortie: string;
}

/** Une partie d'atelier de n questions, puis le bilan ; se résout avec le nombre de questions
 *  trouvées quand l'enfant sort. */
export async function jouerAtelier(f: HTMLElement, stand: StandEssai, p: PartieAtelier): Promise<number> {
  const carte = creer('section', 'exercice essai-stand');
  f.replaceChildren(carte);
  brouillonDisponible(stand.brouillon);
  let trouves = 0;
  const qs = stand.questions(Math.random, p.n, p.focus, p.niveau);
  for (const [i, q] of qs.entries()) {
    const corps = creer('div', 'essai-corps');
    carte.replaceChildren(creer('p', 'exercice-titre', p.titre), corps);
    const r = await poser(corps, q, i + 1, qs.length);
    p.noter(q, r);
    if (r.trouve) trouves++;
  }
  brouillonDisponible(false);
  bruitage.finDeManche();
  if (trouves >= Math.ceil((qs.length * 2) / 3)) confettis();
  const sortir = bouton('bouton-principal', p.sortie);
  const actions = creer('div', 'exercice-actions');
  actions.append(sortir);
  carte.replaceChildren(creer('p', 'exercice-titre', p.titre), texteALire(remplir(trouves <= 1 ? T.commun.bilanUn : T.commun.bilan, { n: trouves, total: qs.length })), actions);
  await new Promise<void>((ok) => sortir.addEventListener('click', () => ok()));
  return trouves;
}
