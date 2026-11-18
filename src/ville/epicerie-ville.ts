// L'épicerie de la ville (tranche 1B) : acheter en payant soi-même avec ses pièces, dire combien
// l'épicière doit rendre, revendre ses pommes (un nombre limité par jour), cueillir au pommier.
// Le porte-monnaie et le panier sont toujours visibles en haut de l'écran. Les textes sont dans
// content/ville/epicerie.json ; l'enfant les lit lui-même et touche un mot pour l'entendre.

import epicerie from '../../content/ville/epicerie.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { ajouter, decomposer, euros, juger, pieces, PIECES_RONDES, retirer, somme, total } from './argent.ts';
import { acheter, cueillir, pommierDuJour, vendre } from './commerce.ts';
import type { PointInteret } from './dictee-ville.ts';
import { nomDe, parlerA } from './demandes-ville.ts';
import type { EtatVille } from './etat.ts';
import { bouton, carte, creer, icone, majuscule, piece, remplir, texteALire } from './interface.ts';

export interface ContexteEpicerie {
  points: PointInteret[];
  etat(): EtatVille;
  changer(e: EtatVille): void;
  occupe(oui: boolean): void;
  /** Où sont l'épicière et le pommier. */
  epiciere: { x: number; z: number };
  pommier: { x: number; z: number };
  /** Montre ce nombre de pommes sur l'arbre. */
  pommesSurLArbre(n: number): void;
}

type Produit = (typeof epicerie.produits)[number];
const T = epicerie.textes;

// --- Le porte-monnaie et le panier, en haut de l'écran --------------------------------------------

let hud: { argent: HTMLButtonElement; panier: HTMLButtonElement } | null = null;

/** Le porte-monnaie ou le panier ont changé ailleurs (demande, lot…). */
export function rafraichirHud(): void {
  if (ctxHud) majHud(ctxHud);
}
let ctxHud: ContexteEpicerie | null = null;

function majHud(c: ContexteEpicerie): void {
  if (!hud) return;
  const e = c.etat();
  hud.argent.textContent = euros(total(e.porteMonnaie));
  const n = Object.values(e.panier).reduce((a, b) => a + b, 0);
  hud.panier.textContent = String(n);
}

function installerHud(c: ContexteEpicerie): void {
  const barre = creer('div', 'hud-ville');
  const argent = bouton('hud-argent', '');
  argent.setAttribute('aria-label', T.porteMonnaie);
  const panier = bouton('hud-panier', '');
  panier.setAttribute('aria-label', T.panier);
  barre.append(argent, panier);
  document.body.append(barre);
  hud = { argent, panier };
  argent.addEventListener('click', () => void voirPorteMonnaie(c));
  panier.addEventListener('click', () => void voirPanier(c));
  majHud(c);
}

function ouvrir(c: ContexteEpicerie): HTMLElement {
  c.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  return f;
}
function fermer(c: ContexteEpicerie, f: HTMLElement): void {
  f.remove();
  c.occupe(false);
  majHud(c);
}

async function voirPorteMonnaie(c: ContexteEpicerie): Promise<void> {
  const f = ouvrir(c);
  const e = c.etat();
  const rangee = creer('div', 'rangee-argent');
  for (const v of pieces(e.porteMonnaie)) rangee.append(piece(v));
  await carte(f, T.porteMonnaie, euros(total(e.porteMonnaie)), ['D’accord !'], [rangee]);
  fermer(c, f);
}

async function voirPanier(c: ContexteEpicerie): Promise<void> {
  const f = ouvrir(c);
  const e = c.etat();
  const liste = creer('div', 'grille-produits');
  for (const [id, n] of Object.entries(e.panier)) {
    const case_ = creer('div', 'produit');
    case_.append(icone(id), creer('span', 'produit-nom', `${n} ${n > 1 ? nomDe(id).pluriel : nomDe(id).nom}`));
    liste.append(case_);
  }
  await carte(f, T.panier, liste.childElementCount ? '' : T.panierVide, ['D’accord !'], [liste]);
  fermer(c, f);
}

// --- L'épicerie -------------------------------------------------------------------------------

/** Payer : l'enfant pose ses pièces sur le comptoir. Renvoie les pièces données, ou null s'il renonce. */
function poserLesPieces(f: HTMLElement, c: ContexteEpicerie, p: Produit): Promise<number[] | null> {
  return new Promise((ok) => {
    const donne: number[] = [];
    const s = creer('section', 'exercice');
    const etiquette = creer('div', 'etiquette');
    etiquette.append(icone(p.id), creer('span', 'etiquette-nom', majuscule(p.nom)), creer('span', 'etiquette-prix', euros(p.prix)));
    const consigne = texteALire(T.payer);
    const comptoir = creer('div', 'rangee-argent comptoir');
    const bourse = creer('div', 'rangee-argent bourse');
    const remarque = creer('p', 'exercice-texte remarque');
    const actions = creer('div', 'exercice-actions');
    const payer = bouton('bouton-principal', 'Payer');
    const renoncer = bouton('bouton-secondaire', 'Retour');
    actions.append(payer, renoncer);
    s.append(creer('p', 'exercice-titre', T.nom), etiquette, consigne, creer('p', 'legende', 'Le comptoir'), comptoir, creer('p', 'legende', 'Mon porte-monnaie'), bourse, remarque, actions);
    f.replaceChildren(s);
    const dessiner = (): void => {
      comptoir.replaceChildren();
      donne.forEach((v, i) => {
        const b = piece(v);
        b.addEventListener('click', () => {
          bruitage.touche();
          donne.splice(i, 1);
          dessiner();
        });
        comptoir.append(b);
      });
      bourse.replaceChildren();
      for (const v of pieces(retirer(c.etat().porteMonnaie, donne) ?? {})) {
        const b = piece(v);
        b.addEventListener('click', () => {
          bruitage.touche();
          donne.push(v);
          remarque.textContent = '';
          dessiner();
        });
        bourse.append(b);
      }
      payer.disabled = donne.length === 0;
    };
    dessiner();
    payer.addEventListener('click', () => {
      const j = juger(donne, p.prix);
      if (j.etat === 'pas-assez') {
        bruitage.erreur();
        remarque.replaceChildren(texteALire(T.pasAssez, 'texte-a-lire'));
        return;
      }
      if (j.etat === 'trop') {
        bruitage.erreur();
        remarque.replaceChildren(texteALire(remplir(T.trop, { piece: euros(j.inutile) }), 'texte-a-lire'));
        return;
      }
      ok([...donne]);
    });
    renoncer.addEventListener('click', () => ok(null));
  });
}

/** Rendre la monnaie : l'enfant prend dans la caisse ce que l'épicière doit lui rendre. */
function rendreLaMonnaie(f: HTMLElement, p: Produit, donne: number[]): Promise<number[]> {
  const rendu = somme(donne) - p.prix;
  return new Promise((ok) => {
    const pris: number[] = [];
    let essais = 0;
    const s = creer('section', 'exercice');
    const valeurs = { Produit: majuscule(p.article), prix: euros(p.prix), donne: euros(somme(donne)), rendu: euros(rendu) };
    const caisse = creer('div', 'rangee-argent caisse');
    const main = creer('div', 'rangee-argent comptoir');
    const remarque = creer('p', 'exercice-texte remarque');
    const actions = creer('div', 'exercice-actions');
    const valider = bouton('bouton-principal', 'C’est ça !');
    actions.append(valider);
    s.append(creer('p', 'exercice-titre', T.nom), texteALire(remplir(T.rendre, valeurs)), creer('p', 'legende', 'La caisse'), caisse, creer('p', 'legende', 'Ma monnaie'), main, remarque, actions);
    f.replaceChildren(s);
    for (const v of PIECES_RONDES.filter((x) => x < somme(donne))) {
      const b = piece(v);
      b.addEventListener('click', () => {
        bruitage.touche();
        pris.push(v);
        dessiner();
      });
      caisse.append(b);
    }
    const dessiner = (): void => {
      main.replaceChildren();
      pris.forEach((v, i) => {
        const b = piece(v);
        b.addEventListener('click', () => {
          pris.splice(i, 1);
          dessiner();
        });
        main.append(b);
      });
      valider.disabled = pris.length === 0;
    };
    dessiner();
    let aide = false;
    valider.addEventListener('click', () => {
      if (aide) {
        ok(decomposer(rendu));
        return;
      }
      if (somme(pris) === rendu) {
        bruitage.reussite();
        ok([...pris]);
        return;
      }
      essais++;
      bruitage.erreur();
      if (essais < 2) {
        remarque.replaceChildren(texteALire(remplir(T.rendreFaux, valeurs), 'texte-a-lire'));
        return;
      }
      // Deuxième erreur : l'épicière compte avec lui, et rend la bonne monnaie.
      aide = true;
      pris.splice(0, pris.length, ...decomposer(rendu));
      dessiner();
      caisse.hidden = true;
      remarque.replaceChildren(texteALire(remplir(T.rendreAide, valeurs), 'texte-a-lire'));
      valider.textContent = 'Merci !';
    });
  });
}

async function acheterUnProduit(c: ContexteEpicerie, f: HTMLElement, p: Produit): Promise<void> {
  const e = c.etat();
  if (total(e.porteMonnaie) < p.prix) {
    await carte(f, T.nom, T.pasAssezDuTout, ['D’accord']);
    return;
  }
  const donne = await poserLesPieces(f, c, p);
  if (!donne) return;
  const j = juger(donne, p.prix);
  let rendu: number[] = [];
  if (j.etat === 'juste') await carte(f, T.nom, T.juste, ['Merci !']);
  else rendu = await rendreLaMonnaie(f, p, donne);
  const r = acheter(c.etat().panier, c.etat().porteMonnaie, p.id, donne, rendu);
  if (!r) return;
  c.changer({ ...c.etat(), ...r });
  majHud(c);
  confettis();
  await carte(f, T.nom, T.merci, ['D’accord !'], [icone(p.id)]);
}

async function vendreSesPommes(c: ContexteEpicerie, f: HTMLElement): Promise<void> {
  const e = c.etat();
  const pomme = epicerie.produits.find((p) => p.id === 'pomme');
  if (!pomme?.rachat) return;
  if (!e.panier.pomme) {
    await carte(f, T.nom, T.vendreRien, ['D’accord']);
    return;
  }
  const v = vendre(e.panier, e.porteMonnaie, e.ventes, 'pomme', pomme.rachat, aujourdhui(), epicerie.achatsParJour);
  if (!v) {
    await carte(f, T.nom, T.vendreFini, ['D’accord']);
    return;
  }
  c.changer({ ...e, panier: v.panier, porteMonnaie: v.porteMonnaie, ventes: v.ventes });
  majHud(c);
  bruitage.reussite();
  const rangee = creer('div', 'rangee-argent');
  for (const x of v.paye) rangee.append(piece(x));
  await carte(f, T.nom, remplir(T.vendreOk, { nombre: `${v.nombre} ${v.nombre > 1 ? pomme.pluriel : pomme.nom}`, prix: euros(pomme.rachat), total: euros(somme(v.paye)) }), ['Merci !'], [rangee]);
}

async function entrer(c: ContexteEpicerie): Promise<void> {
  const f = ouvrir(c);
  const e = c.etat();
  // Première visite : quelques pièces pour commencer.
  if (!e.lus.includes('epiciere-bienvenue')) {
    c.changer({ ...e, lus: [...e.lus, 'epiciere-bienvenue'], porteMonnaie: ajouter(e.porteMonnaie, epicerie.bienvenue) });
    majHud(c);
    const rangee = creer('div', 'rangee-argent');
    for (const v of epicerie.bienvenue) rangee.append(piece(v));
    await carte(f, T.nom, T.bienvenue, ['Merci !'], [rangee]);
  }
  for (;;) {
    const choix = await new Promise<Produit | 'vendre' | null>((ok) => {
      const s = creer('section', 'exercice');
      const grille = creer('div', 'grille-produits');
      for (const p of epicerie.produits) {
        const b = bouton('produit', '');
        b.append(icone(p.id), creer('span', 'produit-nom', majuscule(p.nom)), creer('span', 'produit-prix', euros(p.prix)));
        b.addEventListener('click', () => {
          bruitage.touche();
          ok(p);
        });
        grille.append(b);
      }
      const actions = creer('div', 'exercice-actions');
      const vendreB = bouton('bouton-secondaire', T.vendre);
      const partir = bouton('bouton-secondaire', T.auRevoir);
      vendreB.addEventListener('click', () => ok('vendre'));
      partir.addEventListener('click', () => ok(null));
      actions.append(vendreB, partir);
      s.append(creer('p', 'exercice-titre', T.nom), texteALire(T.accueil), grille, actions);
      f.replaceChildren(s);
    });
    if (choix === null) break;
    if (choix === 'vendre') await vendreSesPommes(c, f);
    else await acheterUnProduit(c, f, choix);
  }
  fermer(c, f);
}

// --- Le pommier --------------------------------------------------------------------------------

let bulle: HTMLElement | null = null;
function annoncer(texte: string): void {
  bulle?.remove();
  bulle = creer('p', 'bulle-ville', texte);
  document.body.append(bulle);
  const b = bulle;
  setTimeout(() => b.remove(), 2600);
}

function cueillirUnePomme(c: ContexteEpicerie): void {
  const e = c.etat();
  const jour = aujourdhui();
  const arbre = cueillir(e.pommier, jour);
  if (!arbre) {
    annoncer(T.pommierVide);
    return;
  }
  bruitage.touche();
  c.changer({ ...e, pommier: arbre, panier: { ...e.panier, pomme: (e.panier.pomme ?? 0) + 1 } });
  c.pommesSurLArbre(arbre.restantes);
  majHud(c);
  annoncer(T.cueilli);
}

export function installerEpicerie(c: ContexteEpicerie): void {
  ctxHud = c;
  installerHud(c);
  c.pommesSurLArbre(pommierDuJour(c.etat().pommier, aujourdhui()).restantes);
  c.points.push(
    {
      verbe: 'Parler',
      nom: T.nom,
      x: c.epiciere.x,
      z: c.epiciere.z,
      // D'abord sa demande du jour, s'il y en a une ; puis la boutique.
      action: () => void parlerA('epiciere', true).then(() => entrer(c)),
    },
    { verbe: T.cueillir, nom: T.pommier, x: c.pommier.x, z: c.pommier.z, action: () => cueillirUnePomme(c) },
  );
}
