// L'introduction : la cinématique qui raconte l'arrivée de la fête, les prénoms des forains,
// puis les questions de lecture, en boucle jusqu'à réussite. Le texte n'est jamais lu à voix haute.

import type { SuiviLecture } from '../sauvegarde/format.ts';
import type { IdStand } from '../scene/fete.ts';
import { bruitage } from '../son/bruitages.ts';
import {
  choixAffiches,
  METIERS,
  mots,
  nettoyerPrenom,
  PROPOSITIONS,
  remplir,
  texteEntier,
  tirerQuestions,
  type Histoire,
  type Noms,
  type Vue,
} from './lecture.ts';

/** Temps de lecture minimal avant ▶ : environ 2,5 mots par seconde, au moins 3 s. */
const MOTS_PAR_SECONDE = 2.5;
const LECTURE_MIN = 3;
/** Relecture du texte entier : « J'ai lu ! » s'active après ce temps. */
const RELECTURE = 10;
const QUESTIONS_PAR_TOUR = 2;

export interface MiseEnScene {
  /** La caméra rejoint ce plan en douceur. */
  allerVers(vue: Vue, duree: number): void;
  saluer(id: IdStand): void;
  /** Le personnage de l'enfant marche jusqu'à ce stand. */
  marcher(id: IdStand): void;
}

export interface OptionsIntroduction {
  histoire: Histoire;
  /** Modifiés sur place quand l'enfant nomme un forain. */
  noms: Noms;
  suivi: SuiviLecture;
  sauver(): void;
  scene: MiseEnScene;
  /** Essais : multiplie les temps d'attente (1 en jeu). */
  facteur: number;
}

function creer<K extends keyof HTMLElementTagNameMap>(
  balise: K,
  classe: string,
  texte?: string,
): HTMLElementTagNameMap[K] {
  const noeud = document.createElement(balise);
  noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  if (noeud instanceof HTMLButtonElement) noeud.type = 'button';
  return noeud;
}

const attendre = (secondes: number): Promise<void> => new Promise((r) => window.setTimeout(r, secondes * 1000));

/** Un bouton qui ne devient actif qu'après un temps ; il se remplit pour montrer l'attente. */
function boutonApres(texte: string, secondes: number): HTMLButtonElement {
  const bouton = creer('button', 'bouton-principal bouton-attente');
  bouton.append(creer('span', '', texte));
  bouton.disabled = true;
  bouton.style.setProperty('--attente', `${secondes}s`);
  window.setTimeout(() => (bouton.disabled = false), secondes * 1000);
  return bouton;
}

const clic = (bouton: HTMLButtonElement): Promise<void> =>
  new Promise((r) =>
    bouton.addEventListener(
      'click',
      () => {
        bruitage.touche();
        r();
      },
      { once: true },
    ),
  );

export async function jouerIntroduction(o: OptionsIntroduction): Promise<void> {
  const racine = creer('div', 'cinema');
  const barreHaut = creer('div', 'cinema-barre haut');
  const barreBas = creer('div', 'cinema-barre bas');
  const sousTitre = creer('div', 'sous-titre');
  const phrase = creer('p', 'sous-titre-texte');
  const suite = creer('button', 'bouton-rond sous-titre-suite');
  suite.setAttribute('aria-label', 'Suite');
  suite.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>';
  sousTitre.append(phrase, suite);
  const carte = creer('div', 'lecture-carte');
  carte.hidden = true;
  racine.append(barreHaut, barreBas, sousTitre, carte);
  document.body.append(racine);

  const montrerCarte = (...enfants: HTMLElement[]): void => {
    sousTitre.hidden = true;
    carte.replaceChildren(...enfants);
    carte.hidden = false;
    carte.style.animation = 'none';
    void carte.offsetWidth;
    carte.style.animation = '';
  };

  try {
    await raconter();
    o.suivi.lectures++;
    o.sauver();
    for (;;) {
      if (await questionner()) break;
      await relire();
      o.suivi.lectures++;
      o.sauver();
    }
    await bravo();
  } finally {
    racine.remove();
  }

  // --- La cinématique, plan par plan -----------------------------------------------
  async function raconter(): Promise<void> {
    for (const [rang, plan] of o.histoire.plans.entries()) {
      o.scene.allerVers(plan.vue, rang === 0 ? 0 : 2.4);
      if (plan.salue) {
        const id = plan.salue;
        window.setTimeout(() => o.scene.saluer(id), 900 * o.facteur);
      }
      if (plan.marche) o.scene.marcher(plan.marche);
      const texte = remplir(plan.texte, o.noms);
      carte.hidden = true;
      sousTitre.hidden = false;
      phrase.textContent = texte;
      sousTitre.style.animation = 'none';
      void sousTitre.offsetWidth;
      sousTitre.style.animation = '';
      suite.hidden = true;
      await attendre(Math.max(LECTURE_MIN, mots(texte) / MOTS_PAR_SECONDE) * o.facteur);
      suite.hidden = false;
      await clic(suite);
      if (plan.nommer) await nommer(plan.nommer);
    }
  }

  // --- Donner un prénom à un forain --------------------------------------------------
  function nommer(id: IdStand): Promise<void> {
    return new Promise((fini) => {
      const choisir = (prenom: string): void => {
        o.noms[id] = prenom;
        o.sauver();
        bruitage.ouverture();
        fini();
      };
      const proposer = (): void => {
        const titre = creer('p', 'lecture-titre', `Comment s'appelle ${METIERS[id]} ?`);
        const liste = creer('div', 'lecture-choix');
        for (const prenom of PROPOSITIONS[id]) {
          const b = creer('button', 'choix', prenom);
          b.addEventListener('click', () => choisir(prenom));
          liste.append(b);
        }
        const autre = creer('button', 'bouton-secondaire', 'Un autre prénom');
        autre.addEventListener('click', () => {
          bruitage.touche();
          taper();
        });
        montrerCarte(titre, liste, autre);
      };
      const taper = (): void => {
        const titre = creer('p', 'lecture-titre', `Écris le prénom de ${METIERS[id]}.`);
        const champ = creer('input', 'champ-prenom');
        champ.maxLength = 14;
        champ.autocomplete = 'off';
        champ.spellcheck = false;
        champ.setAttribute('aria-label', 'Prénom');
        const valider = creer('button', 'bouton-principal', 'C’est son prénom');
        valider.disabled = true;
        champ.addEventListener('input', () => {
          // Seules les lettres restent dans le champ.
          const filtre = champ.value.replace(/[^\p{L}' -]/gu, '');
          if (filtre !== champ.value) champ.value = filtre;
          valider.disabled = nettoyerPrenom(champ.value).length < 2;
        });
        champ.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !valider.disabled) valider.click();
        });
        valider.addEventListener('click', () => choisir(nettoyerPrenom(champ.value)));
        const retour = creer('button', 'bouton-secondaire', 'Retour');
        retour.addEventListener('click', proposer);
        const boutons = creer('div', 'lecture-boutons');
        boutons.append(retour, valider);
        montrerCarte(titre, champ, boutons);
        champ.focus();
      };
      proposer();
    });
  }

  // --- Deux questions ; vrai si les deux sont justes ------------------------------------
  async function questionner(): Promise<boolean> {
    const tirage = tirerQuestions(o.histoire.questions.length, o.suivi.posees, Math.random, QUESTIONS_PAR_TOUR);
    o.suivi.posees = tirage.posees;
    o.sauver();
    let justes = 0;
    for (const [rang, numero] of tirage.tirees.entries()) {
      const q = o.histoire.questions[numero];
      if (!q) continue;
      const { choix, bonne } = choixAffiches(q, o.noms, Math.random);
      const compte = creer('p', 'lecture-compte', `Question ${rang + 1} sur ${tirage.tirees.length}`);
      const titre = creer('p', 'lecture-titre', remplir(q.question, o.noms));
      const liste = creer('div', 'lecture-choix');
      const choisi = await new Promise<number>((r) => {
        choix.forEach((texte, i) => {
          const b = creer('button', 'choix', texte);
          b.addEventListener('click', () => {
            bruitage.touche();
            b.classList.add('choisi');
            liste.querySelectorAll('button').forEach((x) => (x.disabled = true));
            r(i);
          });
          liste.append(b);
        });
        montrerCarte(compte, titre, liste);
      });
      await attendre(0.6);
      if (choisi === bonne) justes++;
    }
    o.suivi.questions += tirage.tirees.length;
    o.suivi.justes += justes;
    o.sauver();
    if (justes === tirage.tirees.length) return true;

    // Une erreur : on ne dit pas laquelle ni la réponse, on invite à relire.
    bruitage.erreur();
    const titre = creer('p', 'lecture-titre', 'Relis bien le texte, la réponse s’y cache !');
    const relireBouton = creer('button', 'bouton-principal', 'Relire l’histoire');
    montrerCarte(titre, relireBouton);
    await clic(relireBouton);
    return false;
  }

  // --- Le texte entier, façon parchemin --------------------------------------------------
  async function relire(): Promise<void> {
    o.scene.allerVers('survol', 2);
    const titre = creer('p', 'lecture-titre', o.histoire.titre);
    const parchemin = creer('div', 'parchemin');
    for (const texte of texteEntier(o.histoire, o.noms)) parchemin.append(creer('p', '', texte));
    const fini = boutonApres('J’ai lu !', RELECTURE * o.facteur);
    montrerCarte(titre, parchemin, fini);
    carte.classList.add('large');
    await clic(fini);
    carte.classList.remove('large');
  }

  async function bravo(): Promise<void> {
    bruitage.finDeManche();
    confettis(racine);
    o.suivi.reussie = true;
    o.sauver();
    const titre = creer('p', 'lecture-titre grand', 'Bravo !');
    const texte = creer('p', 'lecture-texte', 'Tu as bien lu l’histoire.');
    const entrer = creer('button', 'bouton-principal', 'Entrer dans la fête');
    montrerCarte(titre, texte, entrer);
    await clic(entrer);
  }
}

/** Une pluie de confettis en CSS, qui s'efface toute seule. */
function confettis(parent: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const couleurs = ['#ff5a6e', '#ffd447', '#4cc4ff', '#6fcf4a', '#b48cf2'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = couleurs[i % couleurs.length] ?? '#ff5a6e';
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    c.style.setProperty('--derive', `${(Math.random() - 0.5) * 30}vw`);
    parent.append(c);
    window.setTimeout(() => c.remove(), 5000);
  }
}
