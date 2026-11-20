// La rivière et le bois dans la ville (tranche 1C). Au ponton : la pêche à la canne (6 lancers,
// chaque poisson a un poids), puis le poids total et les poissons à relâcher (100 g au plus).
// Au bois : trois buissons de mûres, chacun en porte autant ; après le troisième, la même phrase avec les mûres.

import riviere from '../../content/ville/riviere.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { mettre } from './commerce.ts';
import type { PointInteret } from './dictee-ville.ts';
import type { EtatVille } from './etat.ts';
import { carte, creer, icone, remplir } from './interface.ts';
import { brouillonDisponible } from './brouillon.ts';
import { finDePeche, lancers } from './peche-canne-vue.ts';
import { addition, BUISSONS, buissonsCharges, cueillirBuisson, muresParBuisson, peutPecher } from './riviere.ts';

export interface ContexteRiviere {
  points: PointInteret[];
  etat(): EtatVille;
  changer(e: EtatVille): void;
  occupe(oui: boolean): void;
  apresUnChangement(): void;
  ponton: { x: number; z: number };
  buissons: Array<{ x: number; z: number }>;
  /** Montre ce nombre de grappes sur le buisson i. */
  muresSurBuisson(i: number, n: number): void;
}

const T = riviere;

function ouvrir(c: ContexteRiviere): HTMLElement {
  c.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  return f;
}
function fermer(c: ContexteRiviere, f: HTMLElement): void {
  brouillonDisponible(false);
  f.remove();
  c.occupe(false);
  c.apresUnChangement();
}

async function auPonton(c: ContexteRiviere): Promise<void> {
  const jour = aujourdhui();
  const f = ouvrir(c);
  if (!peutPecher(c.etat().riviere, jour)) {
    await carte(f, T.ponton, T.dejaPeche, ['D’accord']);
    fermer(c, f);
    return;
  }
  const poissons = await lancers(f);
  // La partie du jour est jouée, même s'il n'a rien attrapé.
  const e = c.etat();
  c.changer({ ...e, riviere: { ...e.riviere, peche: jour } });
  if (!poissons.length) await carte(f, T.ponton, T.canne.aucun, ['D’accord']);
  else {
    const gardes = await finDePeche(f, poissons);
    const e2 = c.etat();
    c.changer({ ...e2, panier: mettre(e2.panier, 'poisson', gardes) });
  }
  fermer(c, f);
}

async function auBuisson(c: ContexteRiviere, i: number): Promise<void> {
  const jour = aujourdhui();
  const e = c.etat();
  const r = cueillirBuisson(e.riviere, i, jour);
  const parBuisson = muresParBuisson(jour);
  const f = ouvrir(c);
  if (!r) {
    await carte(f, T.buisson, T.buissonVide, ['D’accord']);
    fermer(c, f);
    return;
  }
  c.changer({ ...e, riviere: r, panier: mettre(e.panier, 'mure', parBuisson) });
  c.muresSurBuisson(i, 0);
  bruitage.reussite();
  const rangee = creer('div', 'rangee-icones');
  for (let k = 0; k < parBuisson; k++) rangee.append(icone('mure'));
  await carte(f, T.buisson, remplir(T.cueilli, { nombre: parBuisson }), ['D’accord !'], [rangee]);
  // Les trois buissons cueillis : la phrase des groupes égaux.
  if (!buissonsCharges(r, jour).length) {
    confettis();
    await carte(f, T.buisson, remplir(T.bilanCueillette, { buissons: BUISSONS, parBuisson, addition: addition(BUISSONS, parBuisson) }), ['Super !']);
  }
  fermer(c, f);
}

export function installerRiviere(c: ContexteRiviere): void {
  c.points.push({ verbe: T.pecher, nom: T.ponton, x: c.ponton.x, z: c.ponton.z, action: () => void auPonton(c) });
  const jour = aujourdhui();
  const charges = buissonsCharges(c.etat().riviere, jour);
  c.buissons.forEach((b, i) => {
    c.muresSurBuisson(i, charges.includes(i) ? muresParBuisson(jour) : 0);
    c.points.push({ verbe: T.cueillir, nom: T.buisson, x: b.x, z: b.z, action: () => void auBuisson(c, i) });
  });
}
