// La confiserie : on entend un mot, on l'écrit avec le clavier maison, une sucette sort du comptoir.
// Pas de correction automatique ; un accent faux compte, une majuscule non.

import type { Element } from '../contenus/contenus.ts';
import { comparer, normaliser, type Lettre } from '../contenus/orthographe.ts';
import { dire } from '../son/voix.ts';
import { bouton, caseReponse, type JeuDeStand } from './stand.ts';

const RANGEES = [
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
  ['w', 'x', 'c', 'v', 'b', 'n', "'", '-', 'ë', 'û'],
  ['é', 'è', 'ê', 'à', 'â', 'ù', 'ç', 'ô', 'î', 'ï'],
];
const TOUTES = new Set(RANGEES.flat());
const LONGUEUR_MAX = 24;

function mot(e: Element): { mot: string; phrase?: string; reponse: string } {
  if (e.type !== 'mots') throw new Error(`La confiserie ne prend que des mots (${e.id})`);
  return e;
}

function lettres(liste: Lettre[], classe: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = `mot-corrige ${classe}`;
  for (const l of liste) {
    const s = document.createElement('span');
    s.textContent = l.lettre === ' ' ? ' ' : l.lettre;
    if (!l.ok) s.className = 'lettre-fausse';
    span.append(s);
  }
  return span;
}

export const confiserie: JeuDeStand = {
  id: 'confiserie',
  type: 'mots',
  titre: 'Confiserie',
  unite: (n) => `${n} mot${n > 1 ? 's' : ''}`,
  large: true,
  construireClavier(clavier, toucher) {
    clavier.className = 'clavier lettres';
    const rangees = RANGEES.map((rangee) => {
      const div = document.createElement('div');
      div.className = 'rangee';
      div.append(...rangee.map((t) => bouton(t, toucher, /[a-z]/.test(t) ? '' : 'accent')));
      return div;
    });
    const bas = document.createElement('div');
    bas.className = 'rangee bas';
    bas.append(bouton('effacer', toucher), bouton(' ', toucher), bouton('valider', toucher));
    clavier.replaceChildren(...rangees, bas);
  },
  touchePhysique(cle) {
    const t = cle.toLocaleLowerCase('fr');
    return TOUTES.has(t) || t === ' ' ? t : null;
  },
  saisir(saisie, touche) {
    if (saisie.length >= LONGUEUR_MAX) return saisie;
    if (touche === ' ' && (saisie === '' || saisie.endsWith(' '))) return saisie;
    return saisie + touche;
  },
  preparer() {},
  afficher(e, saisie, etat) {
    const montre = etat === 'saisie' ? saisie || '?' : mot(e).mot;
    const reponse = caseReponse(montre, etat === 'saisie' ? 'case mot' : 'case mot juste');
    // Tant que rien n'est tapé, une consigne courte rappelle quoi faire.
    return etat === 'saisie' && saisie === '' ? [caseReponse('Écoute et écris : ', 'consigne'), reponse] : [reponse];
  },
  verifier: (e, saisie) => comparer(saisie, mot(e).reponse).juste,
  correction(e, saisie) {
    const c = comparer(saisie, mot(e).reponse);
    const ligne = (titre: string, contenu: HTMLElement): HTMLSpanElement => {
      const l = document.createElement('span');
      l.className = 'ligne-correction';
      l.append(titre, contenu);
      return l;
    };
    return [ligne('Tu as écrit : ', lettres(c.ecrit, 'ecrit')), ligne('On écrit : ', lettres(c.attendu, 'attendu'))];
  },
  ecouter(e) {
    const { mot: m, phrase } = mot(e);
    dire(phrase ? `${m}. ${phrase} ${m}.` : `${m}. ${m}.`, true);
  },
  voixCorrection: (e) => `On écrit ${mot(e).mot}. On le revoit tout à l'heure.`,
  indice(e, niveau) {
    const lettresDuMot = [...normaliser(mot(e).mot)];
    const nombre = lettresDuMot.filter((l) => /\p{L}/u.test(l)).length;
    const trous = (premiere: boolean): string =>
      lettresDuMot.map((l, i) => (/\p{L}/u.test(l) ? (premiere && i === 0 ? l : '_') : l)).join(' ');
    if (niveau === 1) return `${nombre} lettres : ${trous(false)}`;
    if (niveau === 2) return `Il commence par « ${lettresDuMot[0] ?? ''} » : ${trous(true)}`;
    return null;
  },
  reussite(fete) {
    fete.sucette();
    fete.saluerForain('confiserie');
  },
};
