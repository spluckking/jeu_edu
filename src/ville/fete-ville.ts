// La fête foraine dans la ville : les cinq stands de révision et les trois manèges du jeu
// d'avant, au même endroit (à l'est, après le pont). Les stands gardent exactement leur
// déroulé (cartes de manche, mémoire des révisions, journal pour le rêve) et écrivent dans la
// sauvegarde du jeu d'avant : rien de ce que l'enfant a appris n'est perdu, et le rêve continue
// de lire le même journal. Pas d'euros à la fête : chaque forain a son travail du jour ; fini, il
// part aider à construire l'attraction et propose le mode « pour le plaisir ». Quand les cinq ont
// fini, les manèges ouvrent. L'attraction se termine par le grand défi de son forain, à partir du
// vendredi midi (voir attraction.ts).

import { chargerContenus, lireContenu, type Contenu, type Element, type TypeContenu } from '../contenus/contenus.ts';
import { jouerDetente, type SuiviDetente } from '../detente/jeux.ts';
import { compter, objectif, type IdManege } from '../detente/objectifs.ts';
import { ajusterNiveau } from '../exercices/generateur.ts';
import { METIERS, PROPOSITIONS } from '../histoire/lecture.ts';
import { jourDe, type Jour } from '../memoire/jours.ts';
import { avancer, elementEnCours, enregistrer, estRattrapage, etatNeuf, mancheFinie, melanger, nouvelleManche, revisionsDuJour, type ElementSuivi, type Manche, type Revisions } from '../memoire/moteur.ts';
import { DEFIS_PAR_SEANCE, HEURES_PAR_SEANCE, journeeNeuve, PECHES_PAR_SEANCE, type Journee } from '../recompenses/recompenses.ts';
import { ordonner } from '../reve/preparation.ts';
import type { Sauvegarde } from '../sauvegarde/format.ts';
import { ecrireSauvegarde, lireSauvegarde } from '../sauvegarde/stockage.ts';
import type { Fete, IdStand } from '../scene/fete.ts';
import { bruitage, reglerVolumes } from '../son/bruitages.ts';
import { musique } from '../son/musique.ts';
import { dire, direEnregistre, reglerVoix, reglerVolumeVoix } from '../son/voix.ts';
import { chamboule } from '../stands/chamboule.ts';
import { confiserie } from '../stands/confiserie.ts';
import { creerDefis } from '../stands/defis.ts';
import { creerHorloge } from '../stands/horloge.ts';
import { creerPeche } from '../stands/peche.ts';
import type { JeuDeStand } from '../stands/stand.ts';
import { confettis } from '../ui/confettis.ts';
import fete from '../../content/ville/fete.json';
import { demanderUnPrenom } from '../ui/prenom.ts';
import { aAvanceCetteNuit, aDejaManque, chantierOuvert, compterJournee, epreuveOuverte, passerEpreuve, problemesDeLEpreuve, type EtatAttraction } from './attraction.ts';
import type { PointInteret } from './dictee-ville.ts';
import { carte, creer } from './interface.ts';
import { fichierForain } from './voix-forains.ts';
import { avecPrenom } from './prenom-ecrit.ts';

export interface ContexteFete {
  points: PointInteret[];
  occupe(oui: boolean): void;
  /** Où sont les stands et les manèges dans la ville. */
  stands: Record<IdStand, { x: number; z: number }>;
  maneges: Record<IdManege, { x: number; z: number }>;
  /** Où se tient le forain de l'attraction. */
  forainAttraction: { x: number; z: number };
  /** L'état de l'attraction, gardé avec la ville. */
  etat(): EtatAttraction;
  changer(e: EtatAttraction): void;
  /** Quelque chose a changé à la fête : forains à replacer, chantier à redessiner (festif : elle
   *  vient d'être terminée). */
  majFete(festif?: boolean): void;
  /** La prochaine attraction de la liste, après celle-ci (ou null). */
  suivante(id: string): string | null;
}

const aujourdhui = (): Jour => jourDe(new Date());

// --- La sauvegarde du jeu d'avant, partagée ------------------------------------------------------
let sauvegarde: Sauvegarde;
let ecriture: Promise<void> = Promise.resolve();
/** Pendant le remplacement par une copie de secours, plus rien n'écrit l'ancienne sauvegarde. */
let remplacement = false;
function sauver(): void {
  if (remplacement) return;
  const copie = structuredClone(sauvegarde);
  ecriture = ecriture.then(() => ecrireSauvegarde(copie)).catch((e: unknown) => console.error(e));
}

let contenus: Contenu[] = [];
const elements = new Map<string, Element>();

function nom(id: IdStand): string {
  return sauvegarde.forains[id] ?? PROPOSITIONS[id]?.[0] ?? METIERS[id];
}

function suivis(type: TypeContenu): ElementSuivi[] {
  const arrivees = new Map<string, Jour[]>();
  for (const c of contenus) {
    if (c.type !== type) continue;
    const jour = sauvegarde.arrivees[c.id];
    if (!jour) continue;
    for (const e of c.elements) arrivees.set(e.id, [...(arrivees.get(e.id) ?? []), jour]);
  }
  return [...arrivees].map(([id, jours]) => ({ id, arrivees: jours }));
}
const revisions = (jeu: JeuDeStand): Revisions => revisionsDuJour(aujourdhui(), suivis(jeu.type), sauvegarde.etats);
const journee = (): Journee => (sauvegarde.journees[aujourdhui()] ??= journeeNeuve());
function restants(j: JeuDeStand): number | null {
  if (j.type === 'defi') return Math.max(0, DEFIS_PAR_SEANCE - journee().defis);
  if (j.type === 'heure') return Math.max(0, HEURES_PAR_SEANCE - (journee().heures ?? 0));
  if (j.type === 'homophone') return Math.max(0, PECHES_PAR_SEANCE - (journee().peches ?? 0));
  return null;
}

// Les stands réagissent dans la scène de la fête d'avant ; ici, un simple bruitage suffit.
const feteMuette = new Proxy({}, { get: () => () => undefined }) as unknown as Fete;

let jeux: Record<IdStand, JeuDeStand>;

// --- Le panneau du stand (les mêmes éléments que dans le jeu d'avant, mêmes styles) -------------
type TypeManche = 'semaine' | 'memoire' | 'libre' | 'defis' | 'epreuve';
const NOMS: Record<TypeManche, string> = { semaine: 'Cette semaine', memoire: 'Mémoire', libre: 'Pour le plaisir', defis: 'Défis du jour', epreuve: 'Le grand défi' };

const PANNEAU = `
<section class="stand stand-ville" hidden aria-live="polite">
  <header class="stand-tete">
    <button class="bouton-retour" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>La fête</button>
    <p class="manche-nom"></p>
  </header>
  <ol class="progres" aria-label="Progression de la manche"></ol>
  <div class="carte-manche" hidden>
    <p class="carte-titre"></p>
    <p class="carte-texte"></p>
    <button class="bouton-principal carte-bouton" type="button"></button>
    <button class="bouton-secondaire carte-retour" type="button" hidden>Retour à la fête</button>
  </div>
  <div class="exercice" hidden>
    <div class="question-ligne">
      <p class="question"></p>
      <button class="bouton-rond ecouter" type="button" aria-label="Écouter la question"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg></button>
      <button class="bouton-rond ecouter bouton-indice" type="button" aria-label="Un indice" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" /></svg></button>
    </div>
    <p class="indice" hidden></p>
    <p class="correction" hidden></p>
    <div class="clavier"></div>
    <button class="bouton-principal continuer" type="button" hidden>Continuer</button>
  </div>
</section>`;

let ui: Record<string, HTMLElement> & { stand: HTMLElement };
let ctx: ContexteFete;
let jeu: JeuDeStand = chamboule;
let manche: Manche | null = null;
let typeManche: TypeManche = 'libre';
let saisie = '';
let niveauIndice = 0;
let debutQuestion = 0;
let attente = false;
let ouvert = false;

const q = <T extends HTMLElement>(sel: string): T => ui.stand.querySelector(sel) as T;

function prochaineManche(j: JeuDeStand = jeu): TypeManche {
  const reste = restants(j);
  if (reste !== null) return reste > 0 ? 'defis' : 'libre';
  const r = revisions(j);
  if (r.semaine.length) return 'semaine';
  if (r.memoire.length) return 'memoire';
  return 'libre';
}
const elementsDuStand = (): string[] => [...elements.values()].filter((e) => e.type === jeu.type).map((e) => e.id);

/** Ce forain a-t-il fini son travail du jour ? */
export const standFini = (id: IdStand): boolean => Boolean(jeux) && prochaineManche(jeux[id]) === 'libre';
/** Les cinq forains ont-ils fini ? (les manèges ouvrent, le chantier avance) */
export const toutFini = (): boolean => Boolean(jeux) && (Object.keys(jeux) as IdStand[]).every(standFini);

/** Un forain parle, avec sa voix (enregistrée à l'avance). */
const parlerForain = (forain: string, texte: string): void => direEnregistre(fichierForain(forain, texte), texte);
function saluer(id: IdStand): void {
  const phrases = fete.salutations[id];
  const p = phrases[Math.floor(Math.random() * phrases.length)];
  if (p) parlerForain(id, p);
}

/** Si les cinq forains ont fini, la journée compte pour le chantier (une fois par jour). */
function verifierLaJournee(): void {
  if (!toutFini()) return;
  const avant = ctx.etat();
  const apres = compterJournee(avant, aujourdhui());
  if (apres !== avant) ctx.changer(apres);
}

/** La carte d'un forain qui a fini sa journée (merci : il vient juste de finir). */
function carteFini(merci: boolean): void {
  typeManche = 'libre';
  q('.exercice').hidden = true;
  q('.carte-manche').hidden = false;
  q('.progres').replaceChildren();
  q('.manche-nom').textContent = '';
  q('.carte-titre').textContent = merci ? 'Bravo !' : `${jeu.titre} de ${nom(jeu.id)}`;
  const texte = merci ? fete.apresUneManche : fete.finiAujourdhui;
  q('.carte-texte').textContent = avecPrenom(texte);
  parlerForain(jeu.id, texte);
  q('.carte-bouton').textContent = 'Jouer';
  // Juste après le merci, le forain part aider : on rejouera une autre fois.
  q('.carte-bouton').hidden = merci;
  q('.carte-retour').textContent = 'Retour à la fête';
  (q('.carte-bouton') as HTMLButtonElement).disabled = elementsDuStand().length === 0;
  q('.carte-retour').hidden = false;
}

function montrerCarte(type: TypeManche, apresUneManche: boolean): void {
  q('.carte-bouton').hidden = false;
  typeManche = type;
  q('.exercice').hidden = true;
  q('.carte-manche').hidden = false;
  q('.progres').replaceChildren();
  q('.manche-nom').textContent = '';
  const r = revisions(jeu);
  const nombre = type === 'defis' ? (restants(jeu) ?? 0) : Math.min(type === 'semaine' ? r.semaine.length : type === 'memoire' ? r.memoire.length : 8, 8);
  q('.carte-titre').textContent = apresUneManche ? 'Bravo !' : `${jeu.titre} de ${nom(jeu.id)}`;
  const texte =
    type === 'libre'
      ? 'Tout est révisé ici pour aujourd’hui. Tu peux jouer pour le plaisir.'
      : type === 'defis'
        ? `${nom(jeu.id)} te lance ${jeu.unite(nombre)}.`
        : type === 'semaine'
          ? `Manche « Cette semaine » : ${jeu.unite(nombre)}.`
          : `Manche « Mémoire » : ${jeu.unite(nombre)} pour ne pas oublier.`;
  q('.carte-texte').textContent = avecPrenom(texte);
  q('.carte-bouton').textContent = type === 'libre' ? 'Jouer' : 'C’est parti !';
  (q('.carte-bouton') as HTMLButtonElement).disabled = elementsDuStand().length === 0;
  // Le forain propose sa manche : on peut revenir plus tard.
  q('.carte-retour').textContent = apresUneManche ? 'Retour à la fête' : 'Plus tard';
  q('.carte-retour').hidden = false;
}

function lancerManche(): void {
  const r = revisions(jeu);
  const ids =
    typeManche === 'epreuve'
      ? Array.from({ length: problemesDeLEpreuve(ctx.etat()) }, (_, i) => `defi-${i}`)
      : typeManche === 'semaine'
        ? r.semaine
        : typeManche === 'memoire'
          ? r.memoire
          : typeManche === 'defis'
            ? elementsDuStand().slice(0, restants(jeu) ?? 0)
            : elementsDuStand();
  reussisEpreuve = 0;
  totalEpreuve = ids.length;
  musique.demarrer(typeManche === 'epreuve' ? 'chantier' : jeu.id);
  const focus = sauvegarde.preparation?.focus ?? [];
  const choisis = focus.length && typeManche !== 'epreuve' ? ordonner(melanger(ids, Math.random), focus).slice(0, 8) : ids;
  manche = nouvelleManche(choisis, Math.random);
  q('.carte-manche').hidden = true;
  q('.exercice').hidden = false;
  q('.manche-nom').textContent = NOMS[typeManche];
  q('.progres').replaceChildren(...Array.from({ length: manche.total }, () => document.createElement('li')));
  poserQuestion();
}

const elementCourant = (): Element | undefined => {
  const id = manche ? elementEnCours(manche) : undefined;
  return id ? elements.get(id) : undefined;
};

function afficher(etat: 'saisie' | 'juste' | 'faux'): void {
  const e = elementCourant();
  if (!e) return;
  q('.question').replaceChildren(...jeu.afficher(e, saisie, etat));
  const v = q('.clavier').querySelector<HTMLButtonElement>('.valider');
  if (v) v.disabled = saisie.trim() === '';
}

function majProgres(): void {
  if (!manche) return;
  const faits = manche.faits.length;
  const enCours = !mancheFinie(manche);
  q('.progres').querySelectorAll('li').forEach((li, i) => (li.className = i < faits ? 'fait' : i === faits && enCours ? 'courant' : ''));
}

function poserQuestion(): void {
  const e = elementCourant();
  if (!manche || !e) return;
  jeu.preparer(e);
  saisie = '';
  niveauIndice = 0;
  attente = false;
  q('.question-ligne').className = 'question-ligne';
  q('.correction').hidden = true;
  q('.indice').hidden = true;
  q('.bouton-indice').hidden = jeu.indice(e, 1) === null;
  q('.continuer').hidden = true;
  q('.clavier').hidden = false;
  afficher('saisie');
  majProgres();
  debutQuestion = performance.now();
  jeu.ecouter(e);
}

function toucher(touche: string): void {
  if (attente || !manche) return;
  bruitage.touche();
  if (touche === 'effacer') saisie = saisie.slice(0, -1);
  else if (touche === 'valider') return valider();
  else saisie = jeu.saisir(saisie, touche);
  afficher('saisie');
}

function valider(): void {
  const e = elementCourant();
  if (!manche || !e || saisie.trim() === '') return;
  attente = true;
  const reponse = saisie.trim();
  const reussi = jeu.verifier(e, reponse);
  const aide = niveauIndice > 0;
  const duree = Math.round(performance.now() - debutQuestion);
  // Le grand défi ne touche ni aux niveaux, ni à la mémoire, ni au journal du jeu d'avant.
  if (typeManche === 'epreuve') return validerEpreuve(reussi);
  if (jeu.type === 'defi') {
    sauvegarde.niveauDefis = ajusterNiveau(sauvegarde.niveauDefis, reussi);
    if (reussi && typeManche === 'defis') journee().defis += 1;
  } else if (jeu.type === 'heure') {
    sauvegarde.niveauHorloge = ajusterNiveau(sauvegarde.niveauHorloge, reussi);
    if (reussi && typeManche === 'defis') journee().heures = (journee().heures ?? 0) + 1;
  } else if (jeu.type === 'homophone') {
    sauvegarde.niveauPeche = ajusterNiveau(sauvegarde.niveauPeche, reussi);
    if (reussi && typeManche === 'defis') journee().peches = (journee().peches ?? 0) + 1;
  } else if (typeManche !== 'libre') {
    sauvegarde.etats[e.id] = enregistrer(sauvegarde.etats[e.id] ?? etatNeuf(), {
      jour: aujourdhui(),
      reussi,
      aide,
      reponse,
      duree,
      prioritaire: typeManche === 'semaine',
      rattrapage: estRattrapage(manche, e.id),
    });
  }
  sauvegarde.journal.push({ instant: new Date().toISOString(), stand: jeu.id, manche: typeManche, element: jeu.idExercice?.() ?? e.id, reponse, reussi, aide, duree });
  sauver();
  q('.indice').hidden = true;
  q('.bouton-indice').hidden = true;
  if (reussi) {
    q('.question-ligne').className = 'question-ligne juste';
    afficher('juste');
    jeu.reussite(feteMuette);
    bruitage.reussite(jeu.id);
    const r = q('.question').getBoundingClientRect();
    confettis(22, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    manche = avancer(manche, true);
    majProgres();
    window.setTimeout(suite, 1500);
    return;
  }
  bruitage.erreur();
  q('.question-ligne').className = 'question-ligne a-revoir';
  afficher('faux');
  q('.correction').replaceChildren(...jeu.correction(e, reponse));
  q('.correction').hidden = false;
  q('.clavier').hidden = true;
  q('.continuer').hidden = false;
  dire(jeu.voixCorrection(e), jeu.type === 'mots');
  manche = avancer(manche, false);
}

function suite(): void {
  if (!manche) return;
  if (!mancheFinie(manche)) return poserQuestion();
  if (typeManche === 'epreuve') return finirEpreuve();
  if (typeManche === 'defis' && (restants(jeu) ?? 0) > 0) return lancerManche();
  musique.arreter();
  bruitage.finDeManche();
  confettis(48);
  const prochaine = prochaineManche();
  if (prochaine !== 'libre') return montrerCarte(prochaine, true);
  if (typeManche === 'libre') return carteFini(false);
  // Le travail du jour est fini : merci, et le forain part aider au chantier.
  carteFini(true);
  verifierLaJournee();
  ctx.majFete();
}

// --- Le grand défi de l'attraction -------------------------------------------------------------
let epreuve: JeuDeStand;
let reussisEpreuve = 0;
let totalEpreuve = 0;

function validerEpreuve(reussi: boolean): void {
  if (!manche) return;
  q('.indice').hidden = true;
  q('.bouton-indice').hidden = true;
  if (reussi) {
    reussisEpreuve++;
    q('.question-ligne').className = 'question-ligne juste';
    afficher('juste');
    bruitage.reussite('chantier');
    const r = q('.question').getBoundingClientRect();
    confettis(22, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    manche = avancer(manche, true);
    majProgres();
    window.setTimeout(suite, 1500);
    return;
  }
  const e = elementCourant();
  bruitage.erreur();
  q('.question-ligne').className = 'question-ligne a-revoir';
  afficher('faux');
  if (e) {
    q('.correction').replaceChildren(...jeu.correction(e, saisie.trim()));
    dire(jeu.voixCorrection(e));
  }
  q('.correction').hidden = false;
  q('.clavier').hidden = true;
  q('.continuer').hidden = false;
  // Pas de deuxième essai dans le grand défi : on passe au problème suivant.
  manche = avancer(manche, true);
}

function finirEpreuve(): void {
  musique.arreter();
  const e = ctx.etat();
  const id = e.enCours;
  fermerStand();
  if (!id) return;
  const apres = passerEpreuve(e, aujourdhui(), reussisEpreuve, totalEpreuve, ctx.suivante(id));
  ctx.changer(apres);
  const reussi = apres.construites.length > e.construites.length;
  if (reussi) {
    bruitage.finDeManche();
    confettis(80);
    ctx.majFete(true);
    void direAttraction(fete.attraction.reussite, ['D’accord'], e);
    return;
  }
  // Manqué : on peut réessayer tout de suite, avec un seul problème.
  void direAttraction(fete.attraction.rate, ['Je réessaie', 'Plus tard']).then((choix) => {
    if (choix === 0) ouvrirEpreuve();
  });
}

/** Les trois prénoms proposés pour le forain d'une attraction. */
export const PRENOMS_ATTRACTION: Record<string, readonly string[]> = { 'grande-roue': ['Gustave', 'Firmin', 'Émile'] };

/** Comment on appelle le forain de l'attraction : son prénom, s'il en a un. */
export function nomDuForainDeLAttraction(e: EtatAttraction = ctx.etat()): string {
  const id = e.enCours ?? e.construites[e.construites.length - 1] ?? '';
  return e.prenoms[id] ?? fete.attraction.nom;
}

/** Le forain de l'attraction dit une phrase, dans une carte ; rend le bouton choisi. */
async function direAttraction(texte: string, boutons = ['D’accord'], etat?: EtatAttraction): Promise<number> {
  ctx.occupe(true);
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  parlerForain('roue', texte);
  const choix = await carte(f, nomDuForainDeLAttraction(etat), texte, boutons);
  f.remove();
  ctx.occupe(false);
  return choix;
}

let pointDuForain: PointInteret | null = null;

/** On parle au forain de l'attraction. */
async function parlerAuForainDeLAttraction(): Promise<void> {
  const e = ctx.etat();
  const jour = aujourdhui();
  if (!e.enCours || !chantierOuvert(e, jour)) {
    await direAttraction(fete.attraction.ouverte);
    return;
  }
  // La première rencontre : il se présente, et l'enfant lui donne un prénom.
  const id = e.enCours;
  if (!e.prenoms[id]) {
    parlerForain('roue', fete.attraction.avant);
    ctx.occupe(true);
    const prenom = await demanderUnPrenom(PRENOMS_ATTRACTION[id] ?? PRENOMS_ATTRACTION['grande-roue'] ?? [], 'le forain de la grande roue', fete.attraction.avant);
    ctx.occupe(false);
    ctx.changer({ ...ctx.etat(), prenoms: { ...ctx.etat().prenoms, [id]: prenom } });
    if (pointDuForain) pointDuForain.nom = prenom;
    return;
  }
  if (epreuveOuverte(e, new Date())) {
    const deNouveau = aDejaManque(e);
    const choix = await direAttraction(deNouveau ? fete.attraction.dejaEssaye : fete.attraction.defi, ['C’est parti !', 'Plus tard']);
    if (choix === 0) ouvrirEpreuve();
    return;
  }
  if (e.compteLe === jour) {
    await direAttraction(fete.attraction.journeeFinie);
    return;
  }
  if (aAvanceCetteNuit(e, jour)) {
    ctx.changer({ ...e, vuLe: jour });
    await direAttraction(fete.attraction.lendemain);
    return;
  }
  await direAttraction(fete.attraction.avant);
}

function ouvrirEpreuve(): void {
  jeu = epreuve;
  ouvert = true;
  ctx.occupe(true);
  bruitage.ouverture();
  ui.stand.classList.remove('large');
  ui.stand.hidden = false;
  jeu.construireClavier(q('.clavier'), toucher);
  typeManche = 'epreuve';
  lancerManche();
}

export function ouvrirStand(id: IdStand): void {
  jeu = jeux[id];
  ouvert = true;
  ctx.occupe(true);
  bruitage.ouverture();
  ui.stand.classList.toggle('large', jeu.large);
  ui.stand.hidden = false;
  jeu.construireClavier(q('.clavier'), toucher);
  const prochaine = prochaineManche();
  if (prochaine === 'libre') return carteFini(false);
  saluer(id);
  montrerCarte(prochaine, false);
}

function fermerStand(): void {
  musique.arreter();
  ouvert = false;
  manche = null;
  ui.stand.hidden = true;
  ctx.occupe(false);
}

// --- Les manèges -------------------------------------------------------------------------------
const NOMS_MANEGES: Record<IdManege, string> = { autos: 'Les autos tamponneuses', trampoline: 'Le trampoline', glaces: 'Le palais des glaces' };

function suiviDetente(id: IdManege): SuiviDetente {
  return {
    objectif: () => ({ ...objectif(sauvegarde.maneges, id), cadeau: null }),
    avancer() {
      sauvegarde.maneges = compter(sauvegarde.maneges, id).suivi;
      sauver();
      return null;
    },
  };
}

async function monterSurLeManege(id: IdManege): Promise<void> {
  ctx.occupe(true);
  if (!toutFini()) {
    const f = creer('div', 'exercice-fond');
    document.body.append(f);
    await carte(f, NOMS_MANEGES[id], fete.manegesFermes, ['D’accord']);
    f.remove();
  } else {
    musique.demarrer(id);
    await jouerDetente(id, suiviDetente(id));
    musique.arreter();
  }
  ctx.occupe(false);
}

// --- Installation --------------------------------------------------------------------------------
export async function installerFete(c: ContexteFete): Promise<void> {
  ctx = c;
  sauvegarde = await lireSauvegarde();
  const listes = sauvegarde.listesRapides.flatMap((l) => {
    const lu = lireContenu({ id: l.id, titre: l.titre, type: 'mots', elements: l.mots.map((mot) => ({ mot })) }, l.titre);
    return Array.isArray(lu) ? [] : [lu];
  });
  contenus = [...chargerContenus(), ...listes];
  for (const contenu of contenus) for (const e of contenu.elements) elements.set(e.id, e);
  for (const contenu of contenus) sauvegarde.arrivees[contenu.id] ??= aujourdhui();
  for (let i = 0; i < DEFIS_PAR_SEANCE; i++) elements.set(`defi-${i}`, { type: 'defi', id: `defi-${i}` });
  for (let i = 0; i < HEURES_PAR_SEANCE; i++) elements.set(`heure-${i}`, { type: 'heure', id: `heure-${i}` });
  for (let i = 0; i < PECHES_PAR_SEANCE; i++) elements.set(`peche-${i}`, { type: 'homophone', id: `peche-${i}` });
  jeux = {
    chamboule,
    confiserie,
    chantier: creerDefis({
      niveau: () => sauvegarde.niveauDefis.niveau,
      gens: () => [
        { nom: nom('chamboule'), feminin: false, objets: 'ballons' },
        { nom: nom('confiserie'), feminin: true, objets: 'bonbons' },
        { nom: nom('chantier'), feminin: false, objets: 'boulons' },
      ],
    }),
    horloge: creerHorloge({ niveau: () => sauvegarde.niveauHorloge.niveau }),
    peche: creerPeche({ niveau: () => sauvegarde.niveauPeche.niveau, noms: () => sauvegarde.forains }),
  };
  // Le grand défi : des problèmes du même générateur que les défis, au niveau de l'enfant.
  epreuve = {
    ...creerDefis({
      niveau: () => sauvegarde.niveauDefis.niveau,
      problemes: true,
      gens: () => [
        { nom: nom('chamboule'), feminin: false, objets: 'ballons' },
        { nom: nom('confiserie'), feminin: true, objets: 'bonbons' },
        { nom: nom('chantier'), feminin: false, objets: 'boulons' },
      ],
    }),
    titre: 'Le grand défi',
  };
  sauver();

  document.body.insertAdjacentHTML('beforeend', PANNEAU);
  ui = { stand: document.querySelector('.stand-ville') as HTMLElement };
  q('.bouton-retour').addEventListener('click', () => {
    bruitage.touche();
    fermerStand();
  });
  q('.carte-retour').addEventListener('click', fermerStand);
  q('.carte-bouton').addEventListener('click', () => {
    bruitage.touche();
    lancerManche();
  });
  q('.continuer').addEventListener('click', () => {
    bruitage.touche();
    suite();
  });
  q('.ecouter').addEventListener('click', () => {
    const e = elementCourant();
    if (e) jeu.ecouter(e);
  });
  q('.bouton-indice').addEventListener('click', () => {
    const e = elementCourant();
    if (!e || attente) return;
    const t = jeu.indice(e, niveauIndice + 1);
    if (t === null) return;
    bruitage.son('indice');
    niveauIndice++;
    q('.indice').textContent = t;
    q('.indice').hidden = false;
  });
  addEventListener('keydown', (e) => {
    if (!ouvert || q('.exercice').hidden) return;
    if (e.key === 'Backspace') toucher('effacer');
    else if (e.key === 'Enter') {
      if (!q('.continuer').hidden) q('.continuer').click();
      else toucher('valider');
    } else {
      const t = jeu.touchePhysique(e.key);
      if (t !== null) {
        e.preventDefault();
        toucher(t);
      }
    }
  });

  for (const id of Object.keys(c.stands) as IdStand[]) {
    const p = c.stands[id];
    // Le forain du chamboule-tout a son propre bouton « Parler » (accueil, demandes, lettres).
    if (id === 'chamboule') continue;
    c.points.push({ verbe: 'Jouer', nom: `${jeux[id].titre} de ${nom(id)}`, x: p.x, z: p.z, action: () => ouvrirStand(id) });
  }
  for (const id of Object.keys(c.maneges) as IdManege[]) {
    const p = c.maneges[id];
    c.points.push({ verbe: 'Monter', nom: NOMS_MANEGES[id], x: p.x, z: p.z, action: () => void monterSurLeManege(id) });
  }
  pointDuForain = { verbe: 'Parler', nom: nomDuForainDeLAttraction(), x: c.forainAttraction.x, z: c.forainAttraction.z, action: () => void parlerAuForainDeLAttraction() };
  c.points.push(pointDuForain);
  // Les forains ont peut-être déjà fini aujourd'hui, lors d'une visite précédente.
  verifierLaJournee();
  c.majFete();
}

/** Essais seulement : le grand défi tout de suite, sans attendre le vendredi. */
export const essaiGrandDefi = (): void => ouvrirEpreuve();

// --- Pour l'espace parent, ouvert depuis la ville : la sauvegarde du jeu d'avant (la même que
// celle des stands, jamais une copie), ses réglages, et l'échange avec le dépôt privé du rêve.
export const sauvegardeDuJeu = (): Sauvegarde => sauvegarde;
export const sauverLeJeu = (): void => sauver();
export const standsDuJeu = (): Array<{ id: string; titre: string }> => (jeux ? Object.values(jeux).map((j) => ({ id: j.id, titre: j.titre })) : []);
/** Les volumes et la voix choisis par le parent. */
export function appliquerReglagesDuJeu(): void {
  reglerVolumes(sauvegarde.reglages.volumeBruitages, sauvegarde.reglages.volumeMusique);
  reglerVoix(sauvegarde.reglages.vitesseVoix);
  reglerVolumeVoix(sauvegarde.reglages.volumeVoix ?? 1);
}
/** Remplace toute la sauvegarde (copie de secours du parent), puis relance. */
export async function remplacerSauvegarde(nouvelle: Sauvegarde): Promise<void> {
  remplacement = true;
  await ecriture;
  await ecrireSauvegarde(nouvelle);
  location.reload();
}
