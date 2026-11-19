// Le potager dans la ville (tranche 1C) : quatre parcelles près de la maison. On y plante des
// graines achetées à l'épicerie (l'enfant lit le dos du sachet), on arrose une fois par jour,
// on récolte quand c'est prêt. Le bouton d'action dit ce qu'on peut faire : Planter, Arroser,
// Récolter, ou Regarder quand c'est déjà arrosé aujourd'hui.

import jardin from '../../content/ville/jardin.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { enlever, mettre } from './commerce.ts';
import { nomDe } from './demandes-ville.ts';
import { enMots } from './demandes.ts';
import type { PointInteret } from './dictee-ville.ts';
import type { EtatVille } from './etat.ts';
import { bouton, carte, creer, icone, majuscule, remplir } from './interface.ts';
import { arroser, etape, planter, recolter, type Etape } from './jardin.ts';

export interface ContexteJardin {
  points: PointInteret[];
  etat(): EtatVille;
  changer(e: EtatVille): void;
  occupe(oui: boolean): void;
  apresUnChangement(): void;
  /** Où est chaque parcelle. */
  places: Array<{ x: number; z: number }>;
  /** Montre ce qui pousse dans la parcelle i (modèle du légume mûr si c'est prêt). */
  dessiner(i: number, e: Etape, modeleMur: string | null): void;
}

const T = jardin.textes;
const graineDe = (id: string | null): (typeof jardin.graines)[number] | undefined => jardin.graines.find((g) => g.id === id);

function ouvrir(c: ContexteJardin): HTMLElement {
  c.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  return f;
}
function fermer(c: ContexteJardin, f: HTMLElement): void {
  f.remove();
  c.occupe(false);
  c.apresUnChangement();
}

/** Ce que dit le potager : combien d'arrosages faits, combien il en reste. */
function etatEnMots(arrosages: number, total: number): string {
  const fait = remplir(arrosages > 1 ? T.arroseN : T.arrose, { fait: arrosages, total });
  const reste = total - arrosages;
  return `${fait} ${reste <= 0 ? T.pret : remplir(reste > 1 ? T.encoreN : T.encore, { reste })}`;
}

function mettreAJour(c: ContexteJardin, i: number, point: PointInteret): void {
  const p = c.etat().parcelles[i];
  if (!p) return;
  const g = graineDe(p.graine);
  const e = etape(p, g);
  c.dessiner(i, e, g?.modele ?? null);
  const jour = aujourdhui();
  point.verbe = e === 'libre' ? T.planter : e === 'mure' ? T.recolter : p.arrosages.includes(jour) ? T.regarder : T.arroser;
}

async function agir(c: ContexteJardin, i: number, point: PointInteret): Promise<void> {
  const jour = aujourdhui();
  const e = c.etat();
  const p = e.parcelles[i];
  if (!p) return;
  const g = graineDe(p.graine);
  const f = ouvrir(c);
  switch (etape(p, g)) {
    case 'libre': {
      const sachets = jardin.graines.filter((x) => (e.panier[x.id] ?? 0) > 0);
      if (!sachets.length) {
        await carte(f, T.nom, T.pasDeGraines, ['D’accord']);
        break;
      }
      // Choisir un sachet, puis lire son dos avant de planter.
      const choix = await new Promise<(typeof jardin.graines)[number] | null>((ok) => {
        const s = creer('section', 'exercice');
        const grille = creer('div', 'grille-produits');
        for (const x of sachets) {
          const b = bouton('produit', '');
          b.append(icone(x.id), creer('span', 'produit-nom', majuscule(nomDe(x.id).nom)));
          b.addEventListener('click', () => {
            bruitage.touche();
            ok(x);
          });
          grille.append(b);
        }
        const actions = creer('div', 'exercice-actions');
        const non = bouton('bouton-secondaire', 'Plus tard');
        non.addEventListener('click', () => ok(null));
        actions.append(non);
        s.append(creer('p', 'exercice-titre', T.nom), creer('p', 'exercice-texte texte-a-lire', T.choisirGraines), grille, actions);
        f.replaceChildren(s);
      });
      if (!choix) break;
      if ((await carte(f, majuscule(nomDe(choix.id).nom), choix.fiche, [T.planter, 'Plus tard'], [icone(choix.id)])) !== 0) break;
      const plantee = planter(p, choix.id);
      const panier = enlever(e.panier, choix.id);
      if (!plantee || !panier) break;
      c.changer({ ...e, panier, parcelles: e.parcelles.map((x, k) => (k === i ? plantee : x)) });
      bruitage.reussite();
      await carte(f, T.nom, T.plante, ['D’accord !']);
      break;
    }
    case 'graine':
    case 'pousse': {
      const arrosee = arroser(p, g, jour);
      if (!arrosee || !g) {
        await carte(f, T.nom, `${T.dejaArrose} ${etatEnMots(p.arrosages.length, g?.jours ?? 0)}`, ['D’accord']);
        break;
      }
      c.changer({ ...e, parcelles: e.parcelles.map((x, k) => (k === i ? arrosee : x)) });
      bruitage.reussite();
      await carte(f, T.nom, etatEnMots(arrosee.arrosages.length, g.jours), ['D’accord !']);
      break;
    }
    case 'mure': {
      const r = recolter(p, g);
      if (!r) break;
      c.changer({ ...e, panier: mettre(e.panier, r.legume, r.nombre), parcelles: e.parcelles.map((x, k) => (k === i ? r.parcelle : x)) });
      bruitage.finDeManche();
      confettis();
      const rangee = creer('div', 'rangee-icones');
      rangee.append(icone(r.legume));
      await carte(f, T.nom, remplir(T.recolte, { liste: enMots([{ produit: r.legume, nombre: r.nombre }], nomDe) }), ['Super !'], [rangee]);
      break;
    }
  }
  fermer(c, f);
  mettreAJour(c, i, point);
}

export function installerJardin(c: ContexteJardin): void {
  c.places.forEach((place, i) => {
    const point: PointInteret = { verbe: T.planter, nom: T.nom, x: place.x, z: place.z, action: () => void agir(c, i, point) };
    c.points.push(point);
    mettreAJour(c, i, point);
  });
}
