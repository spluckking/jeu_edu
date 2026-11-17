// La garde-robe : le personnage reste visible à gauche, dans la fête ; à droite, des onglets
// ronds (chapeaux, lunettes, hauts, chaussures, objets) et une grille de vignettes.
// En fin de séance, la même fenêtre sert de vitrine : l'enfant y choisit un lot (jamais tiré au sort).

import { GENRES, LOTS, NOMS_GENRES, type Garderobe, type GenreLot, type Lot } from '../recompenses/recompenses.ts';
import { bruitage } from '../son/bruitages.ts';

const ICONES: Record<GenreLot, string> = {
  chapeau: '<path d="M3 16h18M7 16c0-5 2-9 5-9s5 4 5 9" />',
  lunettes: '<circle cx="7" cy="13" r="3.5" /><circle cx="17" cy="13" r="3.5" /><path d="M10.5 13h3" />',
  haut: '<path d="M8 4l-5 4 3 4 2-1v9h8v-9l2 1 3-4-5-4c-1 2-2.5 3-4 3S9 6 8 4z" />',
  chaussures: '<path d="M4 9v8h16v-2c0-2-3-3-6-3l-3-3H4z" />',
  objet: '<circle cx="12" cy="8" r="4.5" /><path d="M12 12.5V21" />',
};

export interface OptionsGarderobe {
  titre: string;
  texte: string;
  garderobe: Garderobe;
  /** porter : ce qu'il possède (et « rien ») ; choisir : un lot pas encore gagné, un seul. */
  mode: 'porter' | 'choisir';
  /** Appelé à chaque case touchée ; renvoie la garde-robe mise à jour. */
  quandChoisi(id: string): Garderobe;
  /** Enlever l'accessoire d'une place (mode porter). */
  quandRetire(genre: GenreLot): Garderobe;
  /** Tourner le personnage (en radians, s'ajoute). */
  tourner(angle: number): void;
  vignette(genre: GenreLot, id: string): string;
  fermer: string;
}

function bouton(classe: string, contenu: string, etiquette?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.innerHTML = contenu;
  if (etiquette) b.setAttribute('aria-label', etiquette);
  return b;
}

export function ouvrirGarderobe(o: OptionsGarderobe): Promise<void> {
  return new Promise((fini) => {
    let g = o.garderobe;
    const visibles = (genre: GenreLot): Lot[] =>
      LOTS.filter((l) => l.genre === genre && (o.mode === 'choisir' ? !l.manege && !g.possedes.includes(l.id) : g.possedes.includes(l.id)));
    let onglet: GenreLot = GENRES.find((x) => visibles(x).length > 0) ?? 'chapeau';
    let choisi = false;

    const fond = document.createElement('section');
    fond.className = 'garderobe-fond';
    const panneau = document.createElement('div');
    panneau.className = 'garderobe-panneau';
    const titre = document.createElement('p');
    titre.className = 'garderobe-titre';
    titre.textContent = o.titre;
    const texte = document.createElement('p');
    texte.className = 'garderobe-texte';
    texte.textContent = o.texte;
    const onglets = document.createElement('div');
    onglets.className = 'garderobe-onglets';
    const ruban = document.createElement('p');
    ruban.className = 'garderobe-ruban';
    const grille = document.createElement('div');
    grille.className = 'garderobe-grille';
    const valider = bouton('bouton-principal garderobe-valider', o.fermer);
    const tourner = document.createElement('div');
    tourner.className = 'garderobe-tourner';
    const gauche = bouton('bouton-rond', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4V2M4.5 7A8 8 0 1 1 4 13" /></svg>', 'Tourner à gauche');
    const droite = bouton('bouton-rond', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7h5V2M19.5 7A8 8 0 1 0 20 13" /></svg>', 'Tourner à droite');
    gauche.addEventListener('click', () => o.tourner(-0.8));
    droite.addEventListener('click', () => o.tourner(0.8));
    tourner.append(gauche, droite);

    const dessiner = (): void => {
      onglets.replaceChildren(
        ...GENRES.filter((x) => o.mode === 'porter' || visibles(x).length > 0).map((x) => {
          const b = bouton(`garderobe-onglet${x === onglet ? ' choisi' : ''}`, `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[x]}</svg>`, NOMS_GENRES[x]);
          b.addEventListener('click', () => {
            bruitage.touche();
            onglet = x;
            dessiner();
          });
          return b;
        }),
      );
      ruban.textContent = NOMS_GENRES[onglet];
      const cases: HTMLButtonElement[] = [];
      if (o.mode === 'porter') {
        const rien = bouton(`garderobe-case${g.porte[onglet] === 'rien' ? ' choisie' : ''}`, '<span class="garderobe-rien">Rien</span>', 'Rien');
        rien.addEventListener('click', () => {
          bruitage.touche();
          g = o.quandRetire(onglet);
          dessiner();
        });
        cases.push(rien);
      }
      for (const l of visibles(onglet)) {
        const url = o.vignette(l.genre, l.id);
        const b = bouton(`garderobe-case${g.porte[l.genre] === l.id ? ' choisie' : ''}`, url ? `<img alt="" src="${url}">` : '', l.nom);
        b.title = l.nom;
        if (choisi) b.disabled = g.porte[l.genre] !== l.id;
        b.addEventListener('click', () => {
          if (choisi) return;
          bruitage.ouverture();
          g = o.quandChoisi(l.id);
          if (o.mode === 'choisir') {
            // Un seul lot par séance : on montre le choix, puis on peut repartir.
            choisi = true;
            texte.textContent = `Tu as choisi : ${l.nom}. Ton personnage le porte déjà !`;
            valider.hidden = false;
          }
          dessiner();
        });
        cases.push(b);
      }
      grille.replaceChildren(...cases);
    };
    dessiner();
    // En mode choisir, on ne referme qu'après avoir choisi.
    valider.hidden = o.mode === 'choisir';
    valider.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini();
    });
    panneau.append(titre, texte, onglets, ruban, grille, valider);
    fond.append(panneau, tourner);
    document.body.append(fond);
  });
}
