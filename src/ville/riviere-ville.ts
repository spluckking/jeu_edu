// La rivière et le bois dans la ville (tranche 1C). Au ponton : des poissons nagent, l'enfant
// les touche un par un et ils remplissent des seaux de même taille ; à la fin, la phrase
// « 3 seaux de 4 poissons, 4 + 4 + 4 = 12, c'est 3 fois 4 ». Au bois : trois buissons de
// mûres, chacun en porte autant ; après le troisième, la même phrase avec les mûres.

import riviere from '../../content/ville/riviere.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { mettre } from './commerce.ts';
import type { PointInteret } from './dictee-ville.ts';
import type { EtatVille } from './etat.ts';
import { bouton, carte, creer, icone, remplir, texteALire } from './interface.ts';
import { addition, BUISSONS, buissonsCharges, cueillirBuisson, muresParBuisson, pecheDuJour, peutPecher } from './riviere.ts';

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
  f.remove();
  c.occupe(false);
  c.apresUnChangement();
}

/** La pêche : chaque poisson touché va dans le premier seau qui n'est pas plein. */
function pecher(f: HTMLElement, seaux: number, parSeau: number): Promise<void> {
  return new Promise((ok) => {
    const total = seaux * parSeau;
    const s = creer('section', 'exercice');
    const eau = creer('div', 'eau-peche');
    const rangee = creer('div', 'rangee-seaux');
    const contenus: HTMLElement[] = [];
    for (let i = 0; i < seaux; i++) {
      const seau = creer('div', 'seau');
      const dedans = creer('div', 'seau-poissons');
      seau.append(icone('seau'), dedans, creer('span', 'seau-compte', `0 / ${parSeau}`));
      contenus.push(dedans);
      rangee.append(seau);
    }
    s.append(creer('p', 'exercice-titre', T.ponton), texteALire(remplir(T.consignePeche, { parSeau })), eau, rangee);
    f.replaceChildren(s);
    let attrapes = 0;
    for (let i = 0; i < total; i++) {
      const p = bouton('poisson-nage', '');
      p.append(icone('poisson'));
      p.setAttribute('aria-label', 'Un poisson');
      // Chaque poisson nage à sa hauteur, à sa vitesse, dans un sens ou l'autre.
      p.style.top = `${8 + ((i * 37) % 76)}%`;
      p.style.animationDuration = `${5 + ((i * 13) % 6)}s`;
      p.style.animationDelay = `${-((i * 7) % 9)}s`;
      if (i % 2) p.classList.add('vers-la-gauche');
      p.addEventListener('click', () => {
        p.remove();
        const n = Math.floor(attrapes / parSeau);
        const dedans = contenus[n];
        attrapes++;
        if (dedans) {
          dedans.append(icone('poisson'));
          const dans = attrapes - n * parSeau;
          const compte = dedans.parentElement?.querySelector('.seau-compte');
          if (compte) compte.textContent = `${dans} / ${parSeau}`;
          if (dans === parSeau) {
            dedans.parentElement?.classList.add('plein');
            bruitage.reussite();
          } else bruitage.touche();
        }
        if (attrapes === total) setTimeout(ok, 600);
      });
      eau.append(p);
    }
  });
}

async function auPonton(c: ContexteRiviere): Promise<void> {
  const jour = aujourdhui();
  const f = ouvrir(c);
  if (!peutPecher(c.etat().riviere, jour)) {
    await carte(f, T.ponton, T.dejaPeche, ['D’accord']);
    fermer(c, f);
    return;
  }
  const { seaux, parSeau } = pecheDuJour(jour);
  await pecher(f, seaux, parSeau);
  const e = c.etat();
  c.changer({ ...e, riviere: { ...e.riviere, peche: jour }, panier: mettre(e.panier, 'poisson', seaux * parSeau) });
  bruitage.finDeManche();
  confettis();
  await carte(f, T.ponton, remplir(T.bilanPeche, { seaux, parSeau, addition: addition(seaux, parSeau) }), ['Super !']);
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
