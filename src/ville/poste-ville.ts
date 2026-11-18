// La poste dans la ville (tranche 1C). La postière demande, une fois par jour, de trier le
// courrier : chaque lettre dans le casier de la première lettre du nom, puis quelques lettres
// dans l'ordre de l'alphabet. Ensuite, l'enfant porte des lettres aux habitants en lisant
// l'adresse écrite sur l'enveloppe ; l'habitant la reçoit quand on vient lui parler.

import poste from '../../content/ville/poste.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { ajouter } from './argent.ts';
import { enlever, mettre } from './commerce.ts';
import { quandOnParle } from './demandes-ville.ts';
import type { PointInteret } from './dictee-ville.ts';
import type { EtatVille } from './etat.ts';
import { bouton, carte, creer, icone, piece, remplir, texteALire } from './interface.ts';
import { casiers, courrierDuJour, dansLOrdre, initiale, peutTrier } from './poste.ts';

export interface ContextePoste {
  points: PointInteret[];
  etat(): EtatVille;
  changer(e: EtatVille): void;
  occupe(oui: boolean): void;
  apresUnChangement(): void;
  postiere: { x: number; z: number };
}

const T = poste.textes;

function ouvrir(c: ContextePoste): HTMLElement {
  c.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  return f;
}
function fermer(c: ContextePoste, f: HTMLElement): void {
  f.remove();
  c.occupe(false);
  c.apresUnChangement();
}

/** Une enveloppe avec un nom (ou une adresse) écrit dessus. */
function enveloppe(texte: string): HTMLButtonElement {
  const b = bouton('enveloppe', '');
  b.append(icone('lettre'), creer('span', 'enveloppe-nom', texte));
  return b;
}

/** Trier : chaque lettre dans le casier de sa première lettre. */
function trier(f: HTMLElement, courrier: string[], lettres: string[]): Promise<void> {
  return new Promise((ok) => {
    const s = creer('section', 'exercice');
    const tas = creer('div', 'rangee-enveloppes');
    const rangee = creer('div', 'rangee-casiers');
    const remarque = creer('div', 'remarque');
    s.append(creer('p', 'exercice-titre', T.nom), texteALire(T.consigneTri), tas, rangee, remarque);
    f.replaceChildren(s);
    let choisie: { nom: string; b: HTMLButtonElement } | null = null;
    let restantes = courrier.length;
    for (const nom of courrier) {
      const b = enveloppe(nom);
      b.addEventListener('click', () => {
        bruitage.touche();
        choisie?.b.classList.remove('choisie');
        choisie = { nom, b };
        b.classList.add('choisie');
      });
      tas.append(b);
    }
    for (const l of lettres) {
      const casier = bouton('casier', '');
      const compte = creer('span', 'casier-compte', '');
      casier.append(creer('span', 'casier-lettre', l), compte);
      casier.addEventListener('click', () => {
        if (!choisie) return;
        if (initiale(choisie.nom) !== l) {
          bruitage.erreur();
          remarque.replaceChildren(texteALire(remplir(T.casierFaux, { famille: choisie.nom.split(' ').slice(-1)[0] ?? choisie.nom, initiale: initiale(choisie.nom) }), 'texte-a-lire'));
          return;
        }
        bruitage.reussite();
        remarque.replaceChildren();
        choisie.b.remove();
        choisie = null;
        compte.textContent = '✉';
        casier.classList.add('rempli');
        restantes--;
        if (restantes === 0) setTimeout(ok, 500);
      });
      rangee.append(casier);
    }
  });
}

/** Ranger quelques lettres dans l'ordre de l'alphabet. */
function ranger(f: HTMLElement, noms: string[]): Promise<void> {
  return new Promise((ok) => {
    const ordre = dansLOrdre(noms);
    const s = creer('section', 'exercice');
    const tas = creer('div', 'rangee-enveloppes');
    const file = creer('div', 'rangee-enveloppes file');
    const remarque = creer('div', 'remarque');
    s.append(creer('p', 'exercice-titre', T.nom), texteALire(T.consigneOrdre), tas, creer('p', 'legende', 'De A à Z'), file, remarque);
    f.replaceChildren(s);
    let suivant = 0;
    // Mélangées autrement que dans l'ordre, pour qu'il y ait quelque chose à faire.
    for (const nom of [...noms].reverse()) {
      const b = enveloppe(nom);
      b.addEventListener('click', () => {
        if (nom !== ordre[suivant]) {
          bruitage.erreur();
          remarque.replaceChildren(texteALire(T.ordreFaux, 'texte-a-lire'));
          return;
        }
        bruitage.reussite();
        remarque.replaceChildren();
        suivant++;
        file.append(b);
        b.disabled = true;
        if (suivant === ordre.length) setTimeout(ok, 600);
      });
      tas.append(b);
    }
  });
}

/** Les enveloppes à livrer, avec leur adresse à lire. */
function adresses(habitants: string[]): HTMLElement {
  const rangee = creer('div', 'rangee-enveloppes');
  for (const h of habitants) {
    const l = poste.livraisons.find((x) => x.habitant === h);
    if (l) {
      const b = enveloppe(l.adresse);
      b.disabled = true;
      rangee.append(b);
    }
  }
  return rangee;
}

async function aLaPoste(c: ContextePoste): Promise<void> {
  const jour = aujourdhui();
  const f = ouvrir(c);
  const e = c.etat();
  if (!peutTrier(e.poste, jour)) {
    await carte(f, T.nom, e.poste.aLivrer.length ? T.rappel : T.dejaTrie, ['D’accord'], e.poste.aLivrer.length ? [adresses(e.poste.aLivrer)] : []);
    fermer(c, f);
    return;
  }
  if ((await carte(f, T.nom, T.bonjour, ['D’accord !', 'Plus tard'])) !== 0) {
    fermer(c, f);
    return;
  }
  const courrier = courrierDuJour(poste.noms, jour);
  await trier(f, courrier, casiers(courrier, jour));
  await ranger(f, courrier.slice(0, 4));
  const aLivrer = poste.livraisons.map((l) => l.habitant);
  const apres = c.etat();
  c.changer({
    ...apres,
    porteMonnaie: ajouter(apres.porteMonnaie, poste.paye),
    panier: mettre(apres.panier, 'lettre', aLivrer.length - apres.poste.aLivrer.length),
    poste: { tri: jour, aLivrer },
  });
  bruitage.finDeManche();
  confettis();
  const pieces = creer('div', 'rangee-argent');
  for (const v of poste.paye) pieces.append(piece(v));
  await carte(f, T.nom, T.fini, ['D’accord !'], [pieces, adresses(aLivrer)]);
  fermer(c, f);
}

/** Un habitant reçoit sa lettre quand on vient lui parler. */
async function recevoir(c: ContextePoste, habitant: string, nom: string): Promise<void> {
  const e = c.etat();
  if (!e.poste.aLivrer.includes(habitant)) return;
  const f = ouvrir(c);
  c.changer({
    ...e,
    panier: enlever(e.panier, 'lettre') ?? e.panier,
    porteMonnaie: ajouter(e.porteMonnaie, poste.merci),
    poste: { ...e.poste, aLivrer: e.poste.aLivrer.filter((h) => h !== habitant) },
  });
  bruitage.reussite();
  const rangee = creer('div', 'rangee-argent');
  for (const v of poste.merci) rangee.append(piece(v));
  await carte(f, nom, T.recue, ['Avec plaisir !'], [adresses([habitant]), rangee]);
  fermer(c, f);
}

export function installerPoste(c: ContextePoste): void {
  c.points.push({ verbe: T.trier, nom: T.nom, x: c.postiere.x, z: c.postiere.z, action: () => void aLaPoste(c) });
  quandOnParle((habitant, nom) => recevoir(c, habitant, nom));
}
