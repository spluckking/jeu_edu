// Les grands projets dans la ville (tranche 1C). Au chantier, un panneau dit ce qu'il faut
// encore (récoltes, euros, coups de main) avec une barre d'avancement ; l'enfant apporte ses
// récoltes et donne des pièces. Quand tout y est, les ouvriers construisent la nuit : le
// lendemain, le lieu est là et son habitant s'installe devant.

import projets from '../../content/ville/projets.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { euros, pieces, retirer, somme, total } from './argent.ts';
import { enlever } from './commerce.ts';
import { nomDe } from './demandes-ville.ts';
import { enMots } from './demandes.ts';
import type { PointInteret } from './dictee-ville.ts';
import type { EtatVille } from './etat.ts';
import { bouton, carte, creer, icone, piece, remplir, texteALire } from './interface.ts';
import { apporter, avancement, complet, ouvrir as ouvrirLieu, reste, terminer, verser } from './projets.ts';

export interface ContexteProjets {
  points: PointInteret[];
  etat(): EtatVille;
  changer(e: EtatVille): void;
  occupe(oui: boolean): void;
  apresUnChangement(): void;
  /** Où se construit chaque projet. */
  lieux: Record<string, { x: number; z: number }>;
  /** Montre le chantier du projet en cours (ou rien). */
  montrerChantier(id: string | null): void;
  /** Pose un lieu construit et son habitant. */
  montrerLieu(id: string): void;
  annoncer(texte: string): void;
}

type Projet = (typeof projets.projets)[number];
const T = projets.textes;
const projetDe = (id: string | null): Projet | undefined => projets.projets.find((p) => p.id === id);

function ouvrir(c: ContexteProjets): HTMLElement {
  c.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  return f;
}
function fermer(c: ContexteProjets, f: HTMLElement): void {
  f.remove();
  c.occupe(false);
  c.apresUnChangement();
}

/** Ce qu'il faut encore, en images, et la barre d'avancement. */
function etatDuChantier(p: Projet, e: EtatVille): HTMLElement[] {
  const r = reste(p, e.projets);
  const barre = creer('div', 'barre-projet');
  const plein = creer('div', 'barre-projet-plein');
  plein.style.width = `${Math.round(avancement(p, e.projets) * 100)}%`;
  barre.append(plein);
  const liste = creer('div', 'grille-produits besoins');
  for (const l of r.recoltes) {
    const b = creer('div', 'produit');
    b.append(icone(l.produit), creer('span', 'produit-nom', `${l.nombre} ${l.nombre > 1 ? nomDe(l.produit).pluriel : nomDe(l.produit).nom}`));
    liste.append(b);
  }
  if (r.euros) {
    const b = creer('div', 'produit');
    b.append(piece(200), creer('span', 'produit-nom', euros(r.euros)));
    liste.append(b);
  }
  if (r.aides) {
    const b = creer('div', 'produit');
    b.append(creer('span', 'besoin-aide', '🤝'), creer('span', 'produit-nom', r.aides > 1 ? remplir(T.aides, { nombre: r.aides }) : T.aide));
    liste.append(b);
  }
  return [barre, creer('p', 'legende', T.ilFaut), liste];
}

/** Choisir des pièces à donner. Renvoie les pièces, ou null. */
function choisirPieces(f: HTMLElement, c: ContexteProjets, p: Projet, maximum: number): Promise<number[] | null> {
  return new Promise((ok) => {
    const donne: number[] = [];
    const s = creer('section', 'exercice');
    const tas = creer('div', 'rangee-argent comptoir');
    const bourse = creer('div', 'rangee-argent bourse');
    const remarque = creer('div', 'remarque');
    const actions = creer('div', 'exercice-actions');
    const oui = bouton('bouton-principal', T.verser);
    const non = bouton('bouton-secondaire', T.plusTard);
    actions.append(oui, non);
    s.append(creer('p', 'exercice-titre', p.nom), texteALire(T.pieces), creer('p', 'legende', 'Pour le chantier'), tas, creer('p', 'legende', 'Mon porte-monnaie'), bourse, remarque, actions);
    f.replaceChildren(s);
    const dessiner = (): void => {
      tas.replaceChildren();
      donne.forEach((v, i) => {
        const b = piece(v);
        b.addEventListener('click', () => {
          donne.splice(i, 1);
          dessiner();
        });
        tas.append(b);
      });
      bourse.replaceChildren();
      for (const v of pieces(retirer(c.etat().porteMonnaie, donne) ?? {})) {
        const b = piece(v);
        b.addEventListener('click', () => {
          bruitage.touche();
          donne.push(v);
          remarque.replaceChildren();
          dessiner();
        });
        bourse.append(b);
      }
      oui.disabled = donne.length === 0;
    };
    dessiner();
    oui.addEventListener('click', () => {
      if (somme(donne) > maximum) {
        bruitage.erreur();
        remarque.replaceChildren(texteALire(remplir(T.tropDEuros, { reste: euros(maximum) }), 'texte-a-lire'));
        return;
      }
      ok([...donne]);
    });
    non.addEventListener('click', () => ok(null));
  });
}

async function auChantier(c: ContexteProjets): Promise<void> {
  const jour = aujourdhui();
  const f = ouvrir(c);
  const p = projetDe(c.etat().projets.enCours);
  if (!p) {
    await carte(f, T.panneau, T.bientot, ['D’accord']);
    fermer(c, f);
    return;
  }
  if (c.etat().projets.termine) {
    await carte(f, p.nom, T.cetteNuit, ['D’accord']);
    fermer(c, f);
    return;
  }
  // La première fois, la présentation du projet.
  let premiere = !c.etat().lus.includes(`projet-${p.id}`);
  if (premiere) c.changer({ ...c.etat(), lus: [...c.etat().lus, `projet-${p.id}`] });
  for (;;) {
    const e = c.etat();
    const choix = await carte(f, p.nom, premiere ? p.presentation : T.ouEnEst, [T.apporter, T.verser, T.plusTard], etatDuChantier(p, e));
    premiere = false;
    if (choix === 2) break;
    if (choix === 0) {
      const r = apporter(p, e.projets, e.panier);
      if (!Object.keys(r.pris).length) {
        await carte(f, p.nom, T.rien, ['D’accord']);
        continue;
      }
      let panier = e.panier;
      for (const [id, n] of Object.entries(r.pris)) panier = enlever(panier, id, n) ?? panier;
      c.changer({ ...e, panier, projets: r.etat });
      bruitage.reussite();
      const pris = Object.entries(r.pris).map(([produit, nombre]) => ({ produit, nombre }));
      await carte(f, p.nom, `${T.merci} Tu as apporté ${enMots(pris, nomDe)}.`, ['D’accord !']);
    } else {
      const manque = reste(p, e.projets).euros;
      if (!manque || !total(e.porteMonnaie)) continue;
      const donne = await choisirPieces(f, c, p, manque);
      const v = donne && verser(p, c.etat().projets, somme(donne));
      const pm = donne && retirer(c.etat().porteMonnaie, donne);
      if (v && pm) {
        c.changer({ ...c.etat(), porteMonnaie: pm, projets: v });
        bruitage.reussite();
      }
    }
    if (complet(p, c.etat().projets)) {
      c.changer({ ...c.etat(), projets: terminer(c.etat().projets, jour) });
      bruitage.finDeManche();
      confettis(80);
      await carte(f, p.nom, T.complet, ['Super !']);
      break;
    }
  }
  fermer(c, f);
}

async function parlerAuHabitant(c: ContexteProjets, p: Projet): Promise<void> {
  const f = ouvrir(c);
  const cle = `projet-${p.id}-ouvert`;
  const premiere = !c.etat().lus.includes(cle);
  if (premiere) c.changer({ ...c.etat(), lus: [...c.etat().lus, cle] });
  if (premiere) confettis();
  await carte(f, p.habitant.nom, premiere ? p.ouverture : p.bonjour, ['D’accord !']);
  fermer(c, f);
}

export function installerProjets(c: ContexteProjets): void {
  // Le chantier fini hier a été construit cette nuit.
  const avant = c.etat().projets;
  const apres = ouvrirLieu(avant, aujourdhui());
  if (apres !== avant) {
    c.changer({ ...c.etat(), projets: apres });
    const ouvert = projetDe(apres.construits[apres.construits.length - 1] ?? null);
    if (ouvert) setTimeout(() => c.annoncer(remplir(T.ouvert, { nom: ouvert.nom })), 1500);
  }
  const e = c.etat();
  for (const id of e.projets.construits) {
    const p = projetDe(id);
    const lieu = c.lieux[id];
    if (!p || !lieu) continue;
    c.montrerLieu(id);
    c.points.push({ verbe: 'Parler', nom: p.habitant.nom, x: lieu.x + 2.4, z: lieu.z + 3.6, action: () => void parlerAuHabitant(c, p) });
  }
  const enCours = e.projets.enCours;
  c.montrerChantier(enCours);
  const lieu = enCours ? c.lieux[enCours] : undefined;
  if (lieu) c.points.push({ verbe: T.regarder, nom: T.panneau, x: lieu.x, z: lieu.z + 2.4, action: () => void auChantier(c) });
}
