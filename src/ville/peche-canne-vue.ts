// La pêche à la canne à l'écran, en 2D : l'enfant touche l'eau pour lancer, le bouchon tremble
// (ferrer trop tôt fait fuir le poisson), puis plonge : une jauge apparaît, il faut toucher
// « Ferrer » quand le curseur est dans la zone verte. Ensuite, l'exercice : le poids total de sa
// pêche (au clavier, avec le brouillon), et s'il dépasse 100 g, les poissons à relâcher.

import riviere from '../../content/ville/riviere.json';
import { bruitage } from '../son/bruitages.ts';
import { bouton as touche } from '../stands/stand.ts';
import { confettis } from '../ui/confettis.ts';
import { brouillonDisponible } from './brouillon.ts';
import { bouton, creer, icone, majuscule, remplir, texteALire } from './interface.ts';
import { curseur, LANCERS, PORTEE_MAX, poissonQuiMord, total, verifierRelache, zoneVerte, type Poisson } from './peche-canne.ts';

const T = riviere.canne;

/** Le curseur va plus vite pour les gros poissons (période d'un aller, en secondes). */
const PERIODE: Record<string, number> = { ablette: 1.3, gardon: 1.1, perche: 0.9 };
/** Le temps pour ferrer, une fois que le bouchon a plongé. */
const DELAI_FERRER = 3.2;

const attendre = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms));

/** Un poisson à l'écran : son image (plus grande s'il est lourd), son nom et son poids. */
function imagePoisson(p: Poisson): HTMLElement {
  const i = icone('poisson');
  i.classList.add(`espece-${p.espece}`);
  i.style.width = `${44 + Math.round(p.poids * 1.2)}px`;
  return i;
}

/** Les lancers ; se résout avec les poissons attrapés. */
export function lancers(f: HTMLElement, hasard: () => number = Math.random): Promise<Poisson[]> {
  return new Promise((fini) => {
    const s = creer('section', 'exercice canne');
    const compte = creer('p', 'canne-compte');
    const message = creer('div', 'canne-message');
    const eau = creer('div', 'eau-peche eau-canne');
    const bouchon = creer('div', 'bouchon');
    bouchon.hidden = true;
    const jauge = creer('div', 'jauge');
    const verte = creer('div', 'jauge-verte');
    const fleche = creer('div', 'jauge-curseur');
    jauge.append(verte, fleche);
    jauge.hidden = true;
    const ferrer = bouton('bouton-principal canne-ferrer', T.ferrer);
    ferrer.hidden = true;
    const panier = creer('div', 'canne-panier');
    eau.append(bouchon);
    s.append(creer('p', 'exercice-titre', riviere.ponton), compte, message, eau, jauge, ferrer, panier);
    f.replaceChildren(s);

    const poissons: Poisson[] = [];
    let n = 0;
    let phase: 'lancer' | 'attente' | 'morsure' | 'fini' = 'lancer';
    let minuteur = 0;
    let anim = 0;
    let mordu: { espece: { id: string; nom: string; zone: number }; poids: number } | null = null;
    let zone = { debut: 0, fin: 0 };
    let debut = 0;

    const dire = (texte: string): void => message.replaceChildren(texteALire(texte));

    const preparer = (): void => {
      n++;
      compte.textContent = remplir(T.lancerN, { n, total: LANCERS });
      phase = 'lancer';
      bouchon.hidden = true;
      bouchon.className = 'bouchon';
      jauge.hidden = true;
      ferrer.hidden = true;
      dire(T.lancer);
    };

    // Le lancer se termine : un message, puis le lancer suivant (ou la fin).
    const finir = async (texte: string, attrape?: Poisson): Promise<void> => {
      phase = 'fini';
      clearTimeout(minuteur);
      cancelAnimationFrame(anim);
      ferrer.hidden = true;
      jauge.hidden = true;
      bouchon.hidden = true;
      if (attrape) {
        poissons.push(attrape);
        panier.append(imagePoisson(attrape));
        bruitage.reussite();
      } else bruitage.erreur();
      dire(texte);
      await attendre(1800);
      if (n >= LANCERS) fini(poissons);
      else preparer();
    };

    // Le bouchon plonge : la jauge apparaît, le curseur va et vient.
    const morsure = (): void => {
      if (phase !== 'attente') return;
      phase = 'morsure';
      mordu = poissonQuiMord(hasard);
      zone = zoneVerte(mordu.espece.zone, hasard);
      verte.style.left = `${zone.debut * 100}%`;
      verte.style.width = `${(zone.fin - zone.debut) * 100}%`;
      bouchon.className = 'bouchon plonge';
      jauge.hidden = false;
      dire(T.vite);
      bruitage.touche();
      debut = performance.now();
      const periode = PERIODE[mordu.espece.id] ?? 1.1;
      const bouger = (): void => {
        const t = (performance.now() - debut) / 1000;
        if (t > DELAI_FERRER) {
          void finir(T.echappe);
          return;
        }
        fleche.style.left = `${curseur(t, periode) * 100}%`;
        fleche.dataset.position = String(curseur(t, periode));
        anim = requestAnimationFrame(bouger);
      };
      bouger();
    };

    eau.addEventListener('click', (ev) => {
      if (phase !== 'lancer') return;
      const r = eau.getBoundingClientRect();
      const x = Math.min(0.9, Math.max(0.1, (ev.clientX - r.left) / r.width));
      const y = Math.min(0.8, Math.max(0.2, (ev.clientY - r.top) / r.height));
      bouchon.style.left = `${x * 100}%`;
      bouchon.style.top = `${y * 100}%`;
      bouchon.hidden = false;
      bouchon.className = 'bouchon';
      phase = 'attente';
      ferrer.hidden = false;
      dire(T.attends);
      bruitage.touche();
      // Le bouchon tremble une ou deux fois (fausses touches), puis plonge.
      const tremblements = 1 + Math.floor(hasard() * 2);
      let k = 0;
      const trembler = (): void => {
        if (phase !== 'attente') return;
        if (k++ < tremblements) {
          bouchon.className = 'bouchon';
          void bouchon.offsetWidth;
          bouchon.className = 'bouchon tremble';
          minuteur = window.setTimeout(trembler, 900 + hasard() * 900);
        } else morsure();
      };
      minuteur = window.setTimeout(trembler, 800 + hasard() * 1000);
    });

    ferrer.addEventListener('click', () => {
      if (phase === 'attente') void finir(T.tropTot);
      else if (phase === 'morsure' && mordu) {
        const t = (performance.now() - debut) / 1000;
        const x = curseur(t, PERIODE[mordu.espece.id] ?? 1.1);
        if (x >= zone.debut && x <= zone.fin) {
          void finir(remplir(T.attrape, { nom: majuscule(mordu.espece.nom), poids: mordu.poids }), { espece: mordu.espece.id, nom: mordu.espece.nom, poids: mordu.poids });
        } else void finir(T.rate);
      }
    });

    preparer();
  });
}

/** La pêche posée sur la table : chaque poisson avec son poids. Touchables pour les relâcher. */
function table(poissons: readonly Poisson[], relaches?: Set<number>, changer?: () => void): HTMLElement {
  const t = creer('div', 'canne-table');
  poissons.forEach((p, i) => {
    const b = bouton('canne-poisson', '');
    b.append(imagePoisson(p), creer('span', 'canne-poids', `${p.poids} g`));
    b.setAttribute('aria-label', `${p.nom}, ${p.poids} grammes`);
    if (relaches && changer) {
      b.addEventListener('click', () => {
        bruitage.touche();
        if (relaches.has(i)) relaches.delete(i);
        else relaches.add(i);
        b.classList.toggle('relache', relaches.has(i));
        changer();
      });
    } else b.disabled = true;
    t.append(b);
  });
  return t;
}

/** Combien pèsent-ils en tout ? Au clavier ; après deux essais, l'addition est montrée. */
function demanderTotal(f: HTMLElement, poissons: readonly Poisson[]): Promise<void> {
  return new Promise((ok) => {
    const juste = total(poissons);
    const s = creer('section', 'exercice canne');
    const reponse = creer('span', 'case', '?');
    const ligne = creer('p', 'question canne-question');
    ligne.append(reponse, creer('span', 'canne-unite', T.grammes));
    const retour = creer('div', 'canne-message');
    const clavier = creer('div', 'clavier chiffres canne-clavier');
    let saisie = '';
    let essais = 0;
    let fini = false;
    const montrer = (): void => {
      reponse.textContent = saisie || '?';
      const v = clavier.querySelector<HTMLButtonElement>('.valider');
      if (v) v.disabled = saisie === '';
    };
    const toucher = (t: string): void => {
      if (fini) return;
      bruitage.touche();
      if (t === 'effacer') saisie = saisie.slice(0, -1);
      else if (t === 'valider') {
        if (Number(saisie) === juste) {
          fini = true;
          reponse.className = 'case juste';
          bruitage.reussite();
          retour.replaceChildren(texteALire(remplir(T.justeTotal, { total: juste })));
          setTimeout(ok, 2200);
          return;
        }
        essais++;
        bruitage.erreur();
        retour.replaceChildren(
          texteALire(essais >= 2 ? remplir(T.aide, { addition: poissons.map((p) => p.poids).join(' + '), total: juste }) : T.pasJuste),
        );
        saisie = '';
      } else if (saisie.length < 3) saisie = (saisie + t).replace(/^0+(?=\d)/, '');
      montrer();
    };
    clavier.replaceChildren(...['7', '8', '9', '4', '5', '6', '1', '2', '3', 'effacer', '0', 'valider'].map((t) => touche(t, toucher)));
    s.append(creer('p', 'exercice-titre', T.tesPoissons), table(poissons), texteALire(T.combien), ligne, retour, clavier);
    f.replaceChildren(s);
    montrer();
  });
}

/** Trop lourd : il touche les poissons qu'il relâche, jusqu'à ne garder que 100 g au plus. */
function choisirRelache(f: HTMLElement, poissons: readonly Poisson[]): Promise<number[]> {
  return new Promise((ok) => {
    const relaches = new Set<number>();
    const s = creer('section', 'exercice canne');
    const retour = creer('div', 'canne-message');
    const valider = bouton('bouton-principal', T.relacher);
    valider.disabled = true;
    const changer = (): void => {
      valider.disabled = relaches.size === 0;
      retour.replaceChildren();
    };
    valider.addEventListener('click', () => {
      const r = verifierRelache(poissons, relaches);
      if (r.tropLourd) {
        bruitage.erreur();
        retour.replaceChildren(texteALire(remplir(T.encoreTrop, { garde: r.garde })));
        return;
      }
      bruitage.reussite();
      ok(poissons.map((_, i) => i).filter((i) => !relaches.has(i)));
    });
    s.append(creer('p', 'exercice-titre', T.tesPoissons), texteALire(T.tropLourd), table(poissons, relaches, changer), retour, valider);
    f.replaceChildren(s);
  });
}

/** La fin de la pêche ; se résout avec le nombre de poissons gardés. */
export async function finDePeche(f: HTMLElement, poissons: readonly Poisson[]): Promise<number> {
  if (!poissons.length) return 0;
  brouillonDisponible(true);
  await demanderTotal(f, poissons);
  let gardes = poissons.length;
  let message = remplir(T.toutRentre, { total: total(poissons) });
  if (total(poissons) > PORTEE_MAX) {
    const gardesI = await choisirRelache(f, poissons);
    gardes = gardesI.length;
    message = remplir(T.garde, { garde: total(gardesI.map((i) => poissons[i]!)) });
  }
  brouillonDisponible(false);
  confettis();
  bruitage.finDeManche();
  const s = creer('section', 'exercice canne');
  const ok = bouton('bouton-principal', 'Super !');
  s.append(creer('p', 'exercice-titre', riviere.ponton), texteALire(message), ok);
  f.replaceChildren(s);
  await new Promise<void>((fini) => ok.addEventListener('click', () => fini()));
  return gardes;
}
