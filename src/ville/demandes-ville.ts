// Les demandes des habitants dans la ville (tranche 1B) et la séance du jour : d'abord les mots
// du tableau, puis deux demandes ; à la fin, un moment de fête et le choix d'un meuble pour
// devant la maison. L'enfant lit les demandes lui-même (un mot touché se fait entendre) et
// prouve qu'il a compris en donnant exactement ce qu'il faut.

import demandes from '../../content/ville/demandes.json';
import epicerie from '../../content/ville/epicerie.json';
import meubles from '../../content/ville/meubles.json';
import { revisionDuJour } from '../dictee/etat.ts';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { ajouter } from './argent.ts';
import { enlever, mettre, type Panier } from './commerce.ts';
import { accepter, demandesDuJour, enMots, etapeSuivante, lotsProposes, seanceFinie, terminer, verifierDon, type EtatDemandes, type Ligne } from './demandes.ts';
import { aider } from './projets.ts';
import { bouton, carte, creer, icone, majuscule, piece, remplir, texteALire } from './interface.ts';
import type { EtatVille } from './etat.ts';

export interface ContexteDemandes {
  etat(): EtatVille;
  changer(e: EtatVille): void;
  occupe(oui: boolean): void;
  /** Le nom affiché de chaque habitant. */
  noms: Record<string, string>;
  /** Pose un meuble gagné devant la maison. */
  poserMeuble(id: string): void;
  /** Le porte-monnaie et le panier ont changé. */
  apresUnChangement(): void;
}

type Demande = (typeof demandes.demandes)[number];
const T = demandes.textes;

/** Le nom et le pluriel d'un produit ou d'un objet. */
export function nomDe(id: string): { nom: string; pluriel: string; article: string } {
  return [...epicerie.produits, ...demandes.objets].find((p) => p.id === id) ?? { nom: id, pluriel: id, article: id };
}

const motsFaits = (e: EtatVille, jour: string): boolean => revisionDuJour(e.dictee, jour).quotidien.fini;

/** Les habitantes : elles disent « Désolée ». */
const FEMININS = new Set(['epiciere', 'postiere']);

/** Où en est une demande : à qui donner, quoi, ce qu'on reçoit. Un aller-retour a deux étapes ;
 *  au retour, on rapporte ce que le destinataire a confié. */
interface Etape {
  destinataire: string;
  besoin: Ligne[];
  merci: string;
  recompense: number[];
  rappel: string;
  /** Ce que le destinataire confie à rapporter (aller d'un aller-retour). */
  confie: Ligne[];
}
function etapeDe(d: Demande, etat: EtatDemandes): Etape {
  const retour = 'retour' in d ? d.retour : undefined;
  if (!retour || (etat.etapes[d.id] ?? 0) === 0) {
    return { destinataire: d.destinataire, besoin: d.besoin, merci: d.merci, recompense: d.recompense, rappel: d.rappel, confie: retour?.fournit ?? [] };
  }
  // Au retour, pas de rappel écrit : on rapporte ce qu'on a reçu.
  return { destinataire: retour.destinataire, besoin: retour.fournit, merci: retour.merci, recompense: retour.recompense, rappel: '', confie: [] };
}

/** Ce que dit l'habitant quand le don n'est pas juste. */
function remarques(v: { manque: Ligne[]; trop: Ligne[]; inutiles: string[] }, besoin: readonly Ligne[], habitant: string): string {
  const phrases: string[] = [];
  if (v.manque.length) phrases.push(remplir(T.manque, { liste: enMots(v.manque, nomDe) }));
  // En trop : on redit la bonne quantité (« il me faut seulement 2 carottes »).
  if (v.trop.length) phrases.push(remplir(T.tropQuantite, { liste: enMots(besoin.filter((b) => v.trop.some((t) => t.produit === b.produit)), nomDe) }));
  for (const p of v.inutiles) phrases.push(remplir(FEMININS.has(habitant) ? T.pasBesoinF : T.pasBesoin, { produit: nomDe(p).nom }));
  return phrases.join(' ');
}

let ctx: ContexteDemandes | null = null;
let pastille: HTMLElement | null = null;

/** La séance du jour, en haut de l'écran : les mots, puis les demandes. */
export function majSeance(): void {
  if (!ctx) return;
  const jour = aujourdhui();
  const e = ctx.etat();
  if (!pastille) {
    pastille = creer('div', 'hud-seance');
    (document.querySelector('.hud-ville') ?? document.body).append(pastille);
  }
  const d = demandesDuJour(e.demandes, demandes.demandes.map((x) => x.id), jour, demandes.parJour);
  const mots = motsFaits(e, jour);
  const faites = d.ids.filter((id) => d.faites.includes(id)).length;
  pastille.replaceChildren(
    creer('span', 'seance-titre', T.seance),
    creer('span', `seance-etape${mots ? ' faite' : ''}`, `${T.seanceMots} ${mots ? '✓' : ''}`),
    creer('span', `seance-etape${faites === d.ids.length ? ' faite' : ''}`, `${T.seanceDemandes} ${faites}/${d.ids.length}`),
  );
}

function ouvrir(c: ContexteDemandes): HTMLElement {
  c.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  return f;
}
function fermer(c: ContexteDemandes, f: HTMLElement): void {
  f.remove();
  c.occupe(false);
  c.apresUnChangement();
  majSeance();
}

/** Choisir dans son panier ce qu'on donne. Renvoie ce qui est donné, ou null pour « Plus tard ». */
function choisirDansLePanier(f: HTMLElement, titre: string, rappel: string, panier: Panier): Promise<Panier | null> {
  return new Promise((ok) => {
    const donne: Panier = {};
    const s = creer('section', 'exercice');
    const reste = creer('div', 'grille-produits');
    const plateau = creer('div', 'grille-produits plateau');
    const remarque = creer('div', 'remarque');
    const actions = creer('div', 'exercice-actions');
    const donner = bouton('bouton-principal', T.donner);
    const tard = bouton('bouton-secondaire', T.plusTard);
    actions.append(donner, tard);
    s.append(creer('p', 'exercice-titre', titre), texteALire(rappel), creer('p', 'legende', T.choisir), reste, creer('p', 'legende', 'Je donne'), plateau, remarque, actions);
    f.replaceChildren(s);
    const case_ = (id: string, n: number, clic: () => void): HTMLButtonElement => {
      const b = bouton('produit', '');
      b.append(icone(id), creer('span', 'produit-nom', `${n} ${n > 1 ? nomDe(id).pluriel : nomDe(id).nom}`));
      b.addEventListener('click', () => {
        bruitage.touche();
        remarque.replaceChildren();
        clic();
        dessiner();
      });
      return b;
    };
    const dessiner = (): void => {
      reste.replaceChildren();
      for (const [id, n] of Object.entries(panier)) {
        const libres = n - (donne[id] ?? 0);
        if (libres > 0) reste.append(case_(id, libres, () => (donne[id] = (donne[id] ?? 0) + 1)));
      }
      plateau.replaceChildren();
      for (const [id, n] of Object.entries(donne)) {
        if (n > 0) plateau.append(case_(id, n, () => (donne[id] = n - 1)));
      }
      donner.disabled = !Object.values(donne).some((n) => n > 0);
    };
    dessiner();
    donner.addEventListener('click', () => ok(Object.fromEntries(Object.entries(donne).filter(([, n]) => n > 0))));
    tard.addEventListener('click', () => ok(null));
  });
}

/** Donner à l'habitant ce qu'une demande réclame, jusqu'à ce que ce soit juste (ou « Plus tard »). */
async function livrer(c: ContexteDemandes, f: HTMLElement, d: Demande): Promise<void> {
  const etape = etapeDe(d, c.etat().demandes);
  const nom = c.noms[etape.destinataire] ?? '';
  let rappel = etape.rappel;
  for (;;) {
    const donne = await choisirDansLePanier(f, nom, rappel, c.etat().panier);
    if (!donne) return;
    const v = verifierDon(etape.besoin, donne);
    if (v.juste) break;
    bruitage.erreur();
    rappel = remarques(v, etape.besoin, etape.destinataire);
  }
  let e = c.etat();
  let panier = e.panier;
  for (const b of etape.besoin) panier = enlever(panier, b.produit, b.nombre) ?? panier;
  // L'aller d'un aller-retour : le destinataire confie quelque chose à rapporter.
  if (etape.confie.length) {
    for (const x of etape.confie) panier = mettre(panier, x.produit, x.nombre);
    c.changer({ ...e, panier, demandes: etapeSuivante(e.demandes, d.id) });
    c.apresUnChangement();
    bruitage.reussite();
    const rangee = creer('div', 'rangee-icones');
    for (const x of etape.confie) rangee.append(icone(x.produit));
    await carte(f, nom, etape.merci, ['D’accord !'], [rangee]);
    await carte(f, nom, remplir(T.fourni, { Liste: majuscule(enMots(etape.confie, nomDe)) }), ['D’accord !'], [rangee.cloneNode(true) as HTMLElement]);
    return;
  }
  // Une demande faite compte aussi comme un coup de main pour le grand projet.
  e = { ...e, panier, porteMonnaie: ajouter(e.porteMonnaie, etape.recompense), demandes: terminer(e.demandes, d.id), projets: aider(e.projets) };
  c.changer(e);
  c.apresUnChangement();
  majSeance();
  bruitage.reussite();
  confettis();
  const rangee = creer('div', 'rangee-argent');
  for (const v of etape.recompense) rangee.append(piece(v));
  await carte(f, nom, etape.merci, ['Merci !'], [rangee]);
  if (seanceFinie(motsFaits(c.etat(), aujourdhui()), c.etat().demandes)) await finDeSeance(c, f);
}

/** Le moment de fête, puis le choix d'un meuble (jamais tiré au sort). */
async function finDeSeance(c: ContexteDemandes, f: HTMLElement): Promise<void> {
  const jour = aujourdhui();
  const e = c.etat();
  if (e.lotChoisi === jour) return;
  bruitage.finDeManche();
  confettis(90);
  const choix = lotsProposes(meubles.meubles.map((m) => m.id), e.meubles);
  if (!choix.length) {
    c.changer({ ...e, lotChoisi: jour });
    await carte(f, T.seance, T.toutGagne, ['Super !']);
    return;
  }
  const id = await new Promise<string>((ok) => {
    const s = creer('section', 'exercice');
    const grille = creer('div', 'grille-produits');
    for (const m of meubles.meubles.filter((x) => choix.includes(x.id))) {
      const b = bouton('produit lot', '');
      b.append(icone(m.id, ''), creer('span', 'produit-nom', majuscule(m.nom)));
      b.addEventListener('click', () => {
        bruitage.touche();
        ok(m.id);
      });
      grille.append(b);
    }
    s.append(creer('p', 'exercice-titre', T.seance), texteALire(T.finSeance), grille);
    f.replaceChildren(s);
  });
  c.changer({ ...c.etat(), lotChoisi: jour, meubles: [...c.etat().meubles, id] });
  c.poserMeuble(id);
  const m = meubles.meubles.find((x) => x.id === id);
  await carte(f, T.seance, remplir(T.cadeauPose, { meuble: m?.nom ?? '' }), ['Super !'], [icone(id, '')]);
}

/**
 * Parler à un habitant : livrer ce qu'il attend, ou recevoir sa demande du jour. Renvoie vrai si
 * la conversation a eu lieu ici ; sinon l'habitant fait comme d'habitude (dialogue, boutique).
 * boutique : l'habitant a sa propre boutique, qu'on ouvre après la demande.
 */
/** Ce qui se passe d'abord quand on parle à un habitant (recevoir une lettre…). */
const avantDeParler: Array<(habitant: string, nom: string) => Promise<void>> = [];
export function quandOnParle(f: (habitant: string, nom: string) => Promise<void>): void {
  avantDeParler.push(f);
}

export async function parlerA(habitant: string, boutique = false): Promise<boolean> {
  const c = ctx;
  if (!c) return false;
  for (const f of avantDeParler) await f(habitant, c.noms[habitant] ?? '');
  const jour = aujourdhui();
  let e = c.etat();
  const dj = demandesDuJour(e.demandes, demandes.demandes.map((x) => x.id), jour, demandes.parJour);
  if (dj !== e.demandes) c.changer((e = { ...e, demandes: dj }));
  const duJour = demandes.demandes.filter((d) => dj.ids.includes(d.id) && !dj.faites.includes(d.id));
  const aLivrer = duJour.find((d) => etapeDe(d, dj).destinataire === habitant && dj.acceptees.includes(d.id));
  const aDonner = duJour.find((d) => d.donneur === habitant && !dj.acceptees.includes(d.id));
  const enCours = duJour.find((d) => d.donneur === habitant && etapeDe(d, dj).destinataire !== habitant && dj.acceptees.includes(d.id));
  const nom = c.noms[habitant] ?? '';
  if (aLivrer) {
    const f = ouvrir(c);
    await livrer(c, f, aLivrer);
    fermer(c, f);
    return !boutique;
  }
  if (aDonner) {
    const f = ouvrir(c);
    if (!motsFaits(e, jour)) {
      await carte(f, nom, T.avantLesMots, ['D’accord !']);
    } else if ((await carte(f, nom, aDonner.texte, [T.accepter, T.plusTard])) === 0) {
      let panier = e.panier;
      for (const x of aDonner.fournit) panier = mettre(panier, x.produit, x.nombre);
      c.changer({ ...c.etat(), panier, demandes: accepter(c.etat().demandes, aDonner.id) });
      if (aDonner.fournit.length) {
        const rangee = creer('div', 'rangee-icones');
        for (const x of aDonner.fournit) rangee.append(icone(x.produit));
        await carte(f, nom, remplir(T.fourni, { Liste: majuscule(enMots(aDonner.fournit, nomDe)) }), ['D’accord !'], [rangee]);
      }
    }
    fermer(c, f);
    return !boutique;
  }
  if (enCours) {
    const f = ouvrir(c);
    await carte(f, nom, enCours.rappel, ['D’accord !']);
    fermer(c, f);
    return !boutique;
  }
  return false;
}

/** À appeler après l'épicerie : la séance du jour se range à côté du porte-monnaie. */
export function installerDemandes(c: ContexteDemandes): void {
  ctx = c;
}
