// La fête foraine dans la ville : les cinq stands de révision et les trois manèges du jeu
// d'avant, au même endroit (à l'est, après le pont). Les stands gardent exactement leur
// déroulé (cartes de manche, mémoire des révisions, journal pour le rêve) et écrivent dans la
// sauvegarde du jeu d'avant : rien de ce que l'enfant a appris n'est perdu, et le rêve continue
// de lire le même journal. Une manche de révision rapporte 1 € ; un tour de manège coûte 1 €.

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
import { bruitage } from '../son/bruitages.ts';
import { musique } from '../son/musique.ts';
import { dire } from '../son/voix.ts';
import { chamboule } from '../stands/chamboule.ts';
import { confiserie } from '../stands/confiserie.ts';
import { creerDefis } from '../stands/defis.ts';
import { creerHorloge } from '../stands/horloge.ts';
import { creerPeche } from '../stands/peche.ts';
import type { JeuDeStand } from '../stands/stand.ts';
import { confettis } from '../ui/confettis.ts';
import { euros } from './argent.ts';
import type { PointInteret } from './dictee-ville.ts';
import { carte, creer } from './interface.ts';

export interface ContexteFete {
  points: PointInteret[];
  occupe(oui: boolean): void;
  /** Le porte-monnaie de la ville. */
  argent(): number;
  gagner(centimes: number): void;
  /** Payer : faux s'il n'y a pas assez. */
  payer(centimes: number): boolean;
  /** Où sont les stands et les manèges dans la ville. */
  stands: Record<IdStand, { x: number; z: number }>;
  maneges: Record<IdManege, { x: number; z: number }>;
}

/** Ce qu'une manche de révision rapporte, et ce que coûte un tour de manège (centimes). */
export const GAIN_MANCHE = 100;
export const PRIX_TOUR = 100;

const aujourdhui = (): Jour => jourDe(new Date());

// --- La sauvegarde du jeu d'avant, partagée ------------------------------------------------------
let sauvegarde: Sauvegarde;
let ecriture: Promise<void> = Promise.resolve();
function sauver(): void {
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
function restants(jeu: JeuDeStand): number | null {
  if (jeu.type === 'defi') return Math.max(0, DEFIS_PAR_SEANCE - journee().defis);
  if (jeu.type === 'heure') return Math.max(0, HEURES_PAR_SEANCE - (journee().heures ?? 0));
  if (jeu.type === 'homophone') return Math.max(0, PECHES_PAR_SEANCE - (journee().peches ?? 0));
  return null;
}

// Les stands réagissent dans la scène de la fête d'avant ; ici, un simple bruitage suffit.
const feteMuette = new Proxy({}, { get: () => () => undefined }) as unknown as Fete;

let jeux: Record<IdStand, JeuDeStand>;

// --- Le panneau du stand (les mêmes éléments que dans le jeu d'avant, mêmes styles) -------------
type TypeManche = 'semaine' | 'memoire' | 'libre' | 'defis';
const NOMS: Record<TypeManche, string> = { semaine: 'Cette semaine', memoire: 'Mémoire', libre: 'Pour le plaisir', defis: 'Défis du jour' };

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

function prochaineManche(): TypeManche {
  const reste = restants(jeu);
  if (reste !== null) return reste > 0 ? 'defis' : 'libre';
  const r = revisions(jeu);
  if (r.semaine.length) return 'semaine';
  if (r.memoire.length) return 'memoire';
  return 'libre';
}
const elementsDuStand = (): string[] => [...elements.values()].filter((e) => e.type === jeu.type).map((e) => e.id);

function montrerCarte(type: TypeManche, apresUneManche: boolean, gain = 0): void {
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
  q('.carte-texte').textContent = gain ? `Tu gagnes ${euros(gain)} ! ${texte}` : texte;
  q('.carte-bouton').textContent = type === 'libre' ? 'Jouer' : 'C’est parti !';
  (q('.carte-bouton') as HTMLButtonElement).disabled = elementsDuStand().length === 0;
  q('.carte-retour').hidden = !apresUneManche;
}

function lancerManche(): void {
  const r = revisions(jeu);
  const ids = typeManche === 'semaine' ? r.semaine : typeManche === 'memoire' ? r.memoire : typeManche === 'defis' ? elementsDuStand().slice(0, restants(jeu) ?? 0) : elementsDuStand();
  musique.demarrer(jeu.id);
  const focus = sauvegarde.preparation?.focus ?? [];
  const choisis = focus.length ? ordonner(melanger(ids, Math.random), focus).slice(0, 8) : ids;
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
  if (typeManche === 'defis' && (restants(jeu) ?? 0) > 0) return lancerManche();
  musique.arreter();
  bruitage.finDeManche();
  confettis(48);
  const gain = typeManche === 'libre' ? 0 : GAIN_MANCHE;
  if (gain) ctx.gagner(gain);
  montrerCarte(prochaineManche(), true, gain);
}

export function ouvrirStand(id: IdStand): void {
  jeu = jeux[id];
  ouvert = true;
  ctx.occupe(true);
  bruitage.ouverture();
  ui.stand.classList.toggle('large', jeu.large);
  ui.stand.hidden = false;
  jeu.construireClavier(q('.clavier'), toucher);
  montrerCarte(prochaineManche(), false);
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
  const f = creer('div', 'exercice-fond');
  document.body.append(f);
  const assez = ctx.argent() >= PRIX_TOUR;
  const choix = await carte(
    f,
    NOMS_MANEGES[id],
    assez ? `Un tour coûte ${euros(PRIX_TOUR)}. Tu as ${euros(ctx.argent())}.` : `Un tour coûte ${euros(PRIX_TOUR)}. Gagne des euros aux stands, en aidant les habitants ou en vendant tes récoltes !`,
    assez ? ['Je monte !', 'Plus tard'] : ['D’accord'],
  );
  f.remove();
  if (assez && choix === 0 && ctx.payer(PRIX_TOUR)) {
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
}

/** Les euros de départ : les tickets du jeu d'avant, une seule fois (voir reprise). */
export const ticketsDuJeuDAvant = (): number => sauvegarde?.tickets ?? 0;
export const garderobeDuJeuDAvant = (): Sauvegarde['garderobe'] | null => sauvegarde?.garderobe ?? null;
