// Ce qu'un stand de révision apporte au déroulé commun (cartes, manches, journal, mémoire) :
// sa façon de poser la question, son clavier, sa correction et sa réaction dans la scène.

import type { Element, TypeContenu } from '../contenus/contenus.ts';
import type { Fete, IdStand } from '../scene/fete.ts';

export type EtatQuestion = 'saisie' | 'juste' | 'faux';

export interface JeuDeStand {
  id: IdStand;
  /** Le type de contenu que ce stand fait réviser. */
  type: TypeContenu;
  titre: string;
  /** « 8 calculs », « 5 mots ». */
  unite(nombre: number): string;
  /** Panneau plus large (clavier de lettres). */
  large: boolean;
  /** Le clavier à l'écran ; chaque touche appelle toucher(). */
  construireClavier(clavier: HTMLElement, toucher: (touche: string) => void): void;
  /** Touche du clavier physique → touche du stand (essais sur ordinateur). */
  touchePhysique(cle: string): string | null;
  /** Ajoute une touche à la saisie (effacer et valider sont gérés à part). */
  saisir(saisie: string, touche: string): string;
  /** Prépare une nouvelle question pour cet élément (ordre des facteurs…). */
  preparer(element: Element): void;
  /** Le contenu de la ligne de question. */
  afficher(element: Element, saisie: string, etat: EtatQuestion): (string | Node)[];
  verifier(element: Element, saisie: string): boolean;
  /** Ce qui s'affiche sous la question après une erreur. */
  correction(element: Element, saisie: string): (string | Node)[];
  /** Lire la question (au début, et sur « Écouter »). */
  ecouter(element: Element): void;
  /** Ce que dit la voix après une erreur. */
  voixCorrection(element: Element): string;
  /** Indice de ce niveau (1, 2…), ou null s'il n'y en a plus. Un stand sans indice renvoie toujours null. */
  indice(element: Element, niveau: number): string | null;
  /** Bonne réponse : la réaction dans la scène. */
  reussite(fete: Fete): void;
  /** Exercice fabriqué par le jeu : son identifiant pour le journal (modèle et valeurs). */
  idExercice?(): string | null;
}

/** Une touche de clavier en bouton : chiffre, lettre, ou icône (effacer, valider). */
export function bouton(touche: string, toucher: (touche: string) => void, classe = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  if (touche === 'effacer') {
    b.classList.add('effacer');
    b.setAttribute('aria-label', 'Effacer');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11v12H9l-6-6z M12 9l5 6 M17 9l-5 6"/></svg>';
  } else if (touche === 'valider') {
    b.classList.add('valider');
    b.setAttribute('aria-label', 'Valider');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
  } else if (touche === ' ') {
    b.classList.add('espace');
    b.setAttribute('aria-label', 'Espace');
    b.textContent = 'espace';
  } else {
    b.textContent = touche;
  }
  b.addEventListener('click', () => toucher(touche));
  return b;
}

export function caseReponse(texte: string, classe: string): HTMLSpanElement {
  const c = document.createElement('span');
  c.className = classe;
  c.textContent = texte;
  return c;
}
