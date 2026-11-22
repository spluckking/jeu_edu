// La page d'essais pour la fête (essais-fete.html) : le parent essaie les nouveaux stands et
// manèges avant de choisir ceux qu'on met en place. Rien n'est enregistré.

import '../style.css';
import '../ville/ville.css';
import './essais.css';
import T from '../../content/fete/essais.json';
import { bruitage } from '../son/bruitages.ts';
import { bouton, creer } from '../ville/interface.ts';
import G from '../../content/fete/golem-express.json';
import { jouerGolem, voirResultats } from './golem-express-vue.ts';
import { jouerManege } from './manege-cadre.ts';
import { MANEGES_ESSAI } from './maneges-essai.ts';
import { jouerStand } from './stand-vue.ts';
import { STANDS_ESSAI } from './stands-essai.ts';

const menu = document.getElementById('essais')!;

/** Ouvre un jeu par-dessus le menu, et le referme à la sortie. */
async function ouvrir(jouer: (f: HTMLElement) => Promise<void>): Promise<void> {
  bruitage.touche();
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  await jouer(f);
  f.remove();
}

const rangee = (titre: string, jeux: Array<{ titre: string; jouer: (f: HTMLElement) => Promise<void> }>): HTMLElement => {
  const s = creer('section', 'essais-rangee');
  const grille = creer('div', 'essais-grille');
  for (const j of jeux) {
    const b = bouton('essais-carte', j.titre);
    b.addEventListener('click', () => void ouvrir(j.jouer));
    grille.append(b);
  }
  s.append(creer('h2', '', titre), grille);
  return s;
};

// Retour à la ville (on arrive ici depuis l'espace parent).
const retour = bouton('bouton-secondaire essais-retour', T.page.retour);
retour.addEventListener('click', () => location.assign(`${import.meta.env.BASE_URL}ville.html`));

menu.append(
  retour,
  creer('h1', '', T.page.titre),
  creer('p', 'essais-aide', T.page.aide),
  // Le Golem Express d'abord : c'est l'essai en cours, visible sans faire défiler.
  rangee(T.page.attention, [
    { titre: G.titre, jouer: jouerGolem },
    { titre: G.parent.titre, jouer: voirResultats },
  ]),
  rangee(T.page.stands, STANDS_ESSAI.map((s) => ({ titre: s.titre, jouer: (f) => jouerStand(f, s) }))),
  rangee(T.page.maneges, MANEGES_ESSAI.map((m) => ({ titre: m.titre, jouer: (f) => jouerManege(f, m) }))),
);
