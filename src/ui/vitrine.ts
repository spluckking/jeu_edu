// La vitrine des lots : en fin de séance l'enfant y choisit un lot (jamais tiré au sort),
// et à tout moment il y remet un lot qu'il possède déjà.

import { LOTS, type Garderobe, type Lot } from '../recompenses/recompenses.ts';
import { bruitage } from '../son/bruitages.ts';

const DESSINS: Record<number, string> = {
  0: '<path d="M4 15c0-5 3.5-8 8-8s8 3 8 8z M2 15h14" />',
  1: '<path d="M7 4h10v11H7z M3 15h18 M7 12h10" />',
  2: '<path d="M4 17l-1-10 5 4 4-7 4 7 5-4-1 10z" />',
  3: '<path d="M5 16c0-6 3-10 7-10s7 4 7 10z M4 16h16v3H4z M12 6V3" />',
};

function vignette(l: Lot): HTMLElement {
  const v = document.createElement('span');
  v.className = 'lot-dessin';
  if (l.genre === 'maillot') {
    v.style.background = `#${l.valeur.toString(16).padStart(6, '0')}`;
    v.classList.add('couleur');
  } else {
    v.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${DESSINS[l.valeur] ?? ''}</svg>`;
  }
  return v;
}

export interface OptionsVitrine {
  titre: string;
  texte: string;
  garderobe: Garderobe;
  /** choisir : les lots pas encore gagnés ; porter : ceux qu'il possède. */
  mode: 'choisir' | 'porter';
  /** Appelé à chaque lot touché ; renvoie la garde-robe mise à jour. */
  quandChoisi(id: string): Garderobe;
  fermer: string;
}

export function ouvrirVitrine(o: OptionsVitrine): Promise<void> {
  return new Promise((fini) => {
    const fond = document.createElement('div');
    fond.className = 'vitrine-fond';
    const carte = document.createElement('div');
    carte.className = 'vitrine';
    const titre = document.createElement('p');
    titre.className = 'lecture-titre';
    titre.textContent = o.titre;
    const texte = document.createElement('p');
    texte.className = 'lecture-texte';
    texte.textContent = o.texte;
    const grille = document.createElement('div');
    grille.className = 'vitrine-grille';
    const fermer = document.createElement('button');
    fermer.type = 'button';
    fermer.className = 'bouton-principal';
    fermer.textContent = o.fermer;
    let g = o.garderobe;

    const dessiner = (): void => {
      const lots = LOTS.filter((l) => (o.mode === 'choisir' ? !g.possedes.includes(l.id) : g.possedes.includes(l.id)));
      grille.replaceChildren(
        ...lots.map((l) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'lot';
          if (g.porte.tenue === l.id || g.porte.maillot === l.id) b.classList.add('porte');
          const nom = document.createElement('span');
          nom.textContent = l.nom;
          b.append(vignette(l), nom);
          b.addEventListener('click', () => {
            bruitage.ouverture();
            g = o.quandChoisi(l.id);
            if (o.mode === 'choisir') {
              // Un seul lot par séance : on montre le choix, puis on referme.
              grille.querySelectorAll('button').forEach((x) => (x.disabled = x !== b));
              b.classList.add('porte');
              texte.textContent = `Tu as choisi : ${l.nom}. Ton personnage le porte déjà !`;
              fermer.hidden = false;
            } else dessiner();
          });
          return b;
        }),
      );
    };
    dessiner();
    // En mode choisir, on ne referme qu'après avoir choisi.
    fermer.hidden = o.mode === 'choisir';
    fermer.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini();
    });
    carte.append(titre, texte, grille, fermer);
    fond.append(carte);
    document.body.append(fond);
  });
}
