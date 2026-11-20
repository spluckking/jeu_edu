// La dictée dans la ville (tranche 1A) : le tableau des mots sur la place (révision du jour,
// ou concours d'écriture la veille de la dictée), deux lieux de piège où habitent des mots,
// le mur des mots sus pour toujours, et un panneau parent provisoire (liste, jour de la
// dictée, import de Dictée-Blocs). Voir docs/VILLE.md.

import * as THREE from 'three';
import { aujourdhui } from '../dictee/leitner.ts';
import { changerListe, estJourDeConcours, importerDicteeBlocs, jamaisVu, motsRestants, noter, noterConcours, phraseDe, revisionDuJour, type EtatDictee, type Reponse } from '../dictee/etat.ts';
import { changerEcriture, toutesLesEcritures } from './ecritures.ts';
import { detecter, LIEUX as PIEGES, type IdLieu } from '../dictee/pieges.ts';
import { LIEUX } from './monde.ts';
import type { Atelier, Peinture, Vec3 } from '../scene/atelier.ts';
import { bruitage } from '../son/bruitages.ts';
import { dire } from '../son/voix.ts';
import { confettis } from '../ui/confettis.ts';
import { exercer } from './exercice.ts';

export interface PointInteret {
  /** Le verbe du bouton : « Parler », « Lire »… */
  verbe: string;
  nom: string;
  x: number;
  z: number;
  action(): void;
  /** Le bouton n'apparaît que si c'est vrai (par défaut : toujours). */
  visible?(): boolean;
  /** À quelle distance le bouton apparaît (par défaut : 3,4 m). */
  rayon?: number;
  /** Une quête à part (demande, lettre) : un second bouton « Quête » apparaît à côté. */
  quete?: { visible(): boolean; action(): void };
}

export interface Contexte {
  atelier: Atelier;
  ville: THREE.Group;
  obstacles: Array<{ x: number; z: number; r: number }>;
  points: PointInteret[];
  dictee(): EtatDictee;
  changer(e: EtatDictee): void;
  /** Coupe ou rend les commandes de promenade pendant un exercice. */
  occupe(oui: boolean): void;
}

const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  return e;
};
const bouton = (classe: string, texte: string): HTMLButtonElement => {
  const b = creer('button', classe, texte);
  b.type = 'button';
  return b;
};

// --- Le décor : tableau, tour, pont, mur -------------------------------------------------------

const hex = (c: string): number => Number.parseInt(c.slice(1), 16);

function decor(c: Contexte, x: number, z: number, cap: number, dessiner: (f: (t: Vec3, p: Vec3, peinture: Peinture, opt?: object) => void) => void): void {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = cap;
  dessiner((t, p, peinture, opt = {}) => c.atelier.forme(g, t, p, peinture, opt));
  c.ville.add(g);
  c.atelier.fusionner(g);
}

function construireDecor(c: Contexte): void {
  // Le tableau des mots, sur la place : un grand panneau de bois sur deux pieds.
  decor(c, LIEUX.tableau.x, LIEUX.tableau.z, LIEUX.tableau.cap, (f) => {
    for (const x of [-1.1, 1.1]) f([0.22, 2.4, 0.22], [x, 1.2, 0], 'poteau', { forme: 'tube' });
    f([2.8, 1.7, 0.18], [0, 1.85, 0], 'bois');
    f([2.5, 1.4, 0.06], [0, 1.85, 0.11], 0xfff6e2);
    for (let i = 0; i < 4; i++) f([1.6 - (i % 2) * 0.4, 0.09, 0.03], [-0.1, 2.3 - i * 0.28, 0.15], 0x6b5a4e);
    f([0.26, 0.26, 0.26], [1.15, 2.6, 0.12], 'rouge', { forme: 'boule' });
  });
  c.obstacles.push({ x: LIEUX.tableau.x, z: LIEUX.tableau.z, r: 1.3 });
  // La tour des lettres doubles : une tour ronde, toit pointu rouge.
  decor(c, LIEUX.tour.x, LIEUX.tour.z, LIEUX.tour.cap, (f) => {
    f([3, 4.5, 3], [0, 2.25, 0], 0xe9dcc6, { forme: 'tube' });
    f([3.4, 0.4, 3.4], [0, 4.6, 0], 0xd8c9b0, { forme: 'tube' });
    f([3.6, 2.6, 3.6], [0, 6.1, 0], hex(PIEGES.double.couleur), { forme: 'cone' });
    f([1, 1.6, 0.2], [0, 0.8, 1.5], 'bois');
    for (const a of [0.7, -0.7]) f([0.5, 0.7, 0.2], [Math.sin(a) * 1.5, 3, Math.cos(a) * 1.5], 0x7cc4e8);
  });
  c.obstacles.push({ x: LIEUX.tour.x, z: LIEUX.tour.z, r: 2 });
  // Le pont du m, c'est le pont sur la rivière, sur la route de la fête (monde.ts).
  // Le mur des mots : un muret de pierres claires avec des plaques.
  decor(c, LIEUX.murDesMots.x, LIEUX.murDesMots.z, LIEUX.murDesMots.cap, (f) => {
    f([4.6, 1.8, 0.6], [0, 0.9, 0], 0xd8cfc0);
    f([4.8, 0.2, 0.8], [0, 1.9, 0], 0xc9bda8);
    for (let i = 0; i < 6; i++) f([0.6, 0.35, 0.05], [-1.7 + i * 0.68, 1.15 + (i % 2) * 0.4, 0.32], 0xffd96a);
  });
  c.obstacles.push({ x: LIEUX.murDesMots.x, z: LIEUX.murDesMots.z, r: 2.3 });
}

// --- Les séances ---------------------------------------------------------------------------

let fond: HTMLElement | null = null;
function ouvrirFond(c: Contexte): HTMLElement {
  c.occupe(true);
  fond = creer('div', 'exercice-fond');
  document.body.append(fond);
  return fond;
}
function fermerFond(c: Contexte): void {
  fond?.remove();
  fond = null;
  c.occupe(false);
}

/** Un message simple, avec un bouton. */
function message(f: HTMLElement, titre: string, texte: string, libelle: string): Promise<void> {
  return new Promise((ok) => {
    const carte = creer('section', 'exercice');
    const b = bouton('bouton-principal', libelle);
    carte.append(creer('p', 'exercice-titre', titre), creer('p', 'exercice-texte', texte), b);
    f.replaceChildren(carte);
    b.addEventListener('click', () => {
      bruitage.touche();
      ok();
    });
  });
}

/** Une série de mots : chaque mot raté revient plus loin (au plus deux fois). */
async function serie(c: Contexte, f: HTMLElement, mots: string[], quitter: () => boolean): Promise<void> {
  const file = [...mots];
  const reprises = new Map<string, number>();
  let rang = 0;
  while (file.length && !quitter()) {
    const w = file.shift() as string;
    rang++;
    const e = c.dictee();
    const r = await exercer(f, { mot: w, phrase: phraseDe(e, w), fiche: jamaisVu(e, w), aide: true, rang: `${rang} / ${rang + file.length}` });
    const jour = aujourdhui();
    const res = noter(c.dictee(), w, r, jour);
    c.changer(res.etat);
    if (res.retire) {
      bruitage.finDeManche();
      await message(f, 'Su pour toujours !', `« ${w} » est gravé sur le mur des mots.`, 'Super !');
    }
    if (!r.juste) {
      const n = reprises.get(w) ?? 0;
      if (n < 2) {
        reprises.set(w, n + 1);
        file.splice(Math.min(3, file.length), 0, w);
      }
    }
  }
}

async function revisionOuConcours(c: Contexte): Promise<void> {
  const jour = aujourdhui();
  const f = ouvrirFond(c);
  let e = revisionDuJour(c.dictee(), jour);
  c.changer(e);
  if (!e.mots.length && !e.quotidien.mots.length) {
    await message(f, 'Pas encore de mots', 'Les mots de la semaine arrivent bientôt sur le tableau.', 'D’accord');
    fermerFond(c);
    return;
  }
  // La veille de la dictée : le concours d'écriture, une fois, sans aide.
  if (estJourDeConcours(e, jour) && !e.concours.some((x) => x.date === jour)) {
    await message(f, 'Le concours d’écriture !', 'Demain, c’est la dictée. Écris tous les mots de la semaine, sans aide. À la fin, on reprend ensemble ceux qui manquent.', 'C’est parti !');
    const ecrits: Array<{ w: string; r: Reponse }> = [];
    let rang = 0;
    for (const m of e.mots) {
      rang++;
      ecrits.push({ w: m.w, r: await exercer(f, { mot: m.w, phrase: m.phrase, fiche: false, aide: false, rang: `${rang} / ${e.mots.length}` }) });
    }
    // À la fin du concours, il compare chaque écriture au mot juste.
    const jugements = await comparerTout(f, ecrits.map((x) => ({ w: x.w, ecriture: x.r.ecriture ?? '' })));
    const resultats = ecrits.map((x, i) => ({ w: x.w, juste: jugements[i] ?? false }));
    for (const [i, x] of ecrits.entries()) c.changer(noter(c.dictee(), x.w, { ...x.r, juste: jugements[i] ?? false }, jour).etat);
    c.changer(noterConcours(c.dictee(), jour, resultats));
    const justes = resultats.filter((x) => x.juste).length;
    bruitage.finDeManche();
    confettis(60);
    await message(f, 'Bravo pour le concours !', `${justes} mot${justes > 1 ? 's' : ''} sur ${resultats.length} du premier coup.${justes < resultats.length ? ' On reprend les autres ensemble.' : ' Tout est juste !'}`, 'Continuer');
    e = c.dictee();
  }
  // Ce que le rêve a trouvé faux alors qu'il l'avait jugé juste : il revoit son écriture d'hier.
  if (e.aRevoir.length) {
    for (const x of e.aRevoir) await revoirHier(f, x.w, x.ecriture);
    c.changer({ ...c.dictee(), aRevoir: [] });
    e = c.dictee();
  }
  await serie(c, f, motsRestants(e), () => false);
  e = c.dictee();
  if (e.quotidien.fini) {
    bruitage.finDeManche();
    confettis(70);
    await message(f, 'Les mots du jour sont faits !', 'Tous les mots sont justes aujourd’hui. Ils reviendront au bon moment pour bien rester en mémoire.', 'Super !');
  }
  fermerFond(c);
}

/** Il compare chaque écriture du concours au mot juste ; rend ses réponses, dans l'ordre. */
async function comparerTout(f: HTMLElement, ecrits: Array<{ w: string; ecriture: string }>): Promise<boolean[]> {
  const images = new Map((await toutesLesEcritures()).map((x) => [x.id, x.image]));
  return new Promise((ok) => {
    const carte = creer('section', 'exercice');
    const liste = creer('div', 'comparaisons');
    const choix: Array<boolean | null> = ecrits.map(() => null);
    const valider = bouton('bouton-principal', 'J’ai tout comparé');
    valider.disabled = true;
    ecrits.forEach((x, i) => {
      const rangee = creer('div', 'comparaison');
      const img = creer('img', 'comparaison-image');
      const b = images.get(x.ecriture);
      if (b) img.src = URL.createObjectURL(b);
      const mot = creer('span', 'comparaison-mot', x.w);
      const pareil = bouton('choix-petit', 'Pareil');
      const faux = bouton('choix-petit', 'Trompé');
      const choisir = (oui: boolean): void => {
        bruitage.touche();
        choix[i] = oui;
        pareil.classList.toggle('choisi', oui);
        faux.classList.toggle('choisi', !oui);
        valider.disabled = choix.some((v) => v === null);
      };
      pareil.addEventListener('click', () => choisir(true));
      faux.addEventListener('click', () => choisir(false));
      rangee.append(img, mot, faux, pareil);
      liste.append(rangee);
    });
    valider.addEventListener('click', () => {
      bruitage.touche();
      ecrits.forEach((x, i) => {
        if (x.ecriture) void changerEcriture(x.ecriture, { enfant: choix[i] ?? false });
      });
      ok(choix.map((v) => v ?? false));
    });
    carte.append(creer('p', 'exercice-titre', 'Compare avec les mots justes'), creer('p', 'exercice-texte', 'Pour chaque mot : as-tu écrit exactement pareil ?'), liste, valider);
    f.replaceChildren(carte);
  });
}

/** Le retour du lendemain : son écriture d'hier, à côté du mot juste, puis il l'écrit encore. */
async function revoirHier(f: HTMLElement, w: string, ecriture: string): Promise<void> {
  const image = (await toutesLesEcritures()).find((x) => x.id === ecriture)?.image;
  await new Promise<void>((ok) => {
    const carte = creer('section', 'exercice');
    const tienne = creer('div', 'ecriture-comparee');
    if (image) {
      const img = creer('img');
      img.src = URL.createObjectURL(image);
      img.alt = '';
      tienne.append(creer('span', 'ecriture-etiquette', 'Hier'), img);
    }
    const juste = creer('p', 'fiche-mot', w);
    const suite = bouton('bouton-principal', 'Je regarde, puis je l’écris');
    suite.addEventListener('click', () => {
      bruitage.touche();
      ok();
    });
    carte.append(creer('p', 'exercice-titre', 'Regarde bien'), creer('p', 'exercice-texte', 'Hier, tu as écrit ceci. Regarde la bonne orthographe.'), tienne, juste, suite);
    f.replaceChildren(carte);
    dire(w, true);
  });
  await exercer(f, { mot: w, phrase: '', fiche: false, aide: true, rang: '' });
}

/** S'entraîner aux mots qui habitent ce lieu (sans récompense, mais leur mémoire avance). */
async function lieuDePiege(c: Contexte, lieu: IdLieu): Promise<void> {
  const f = ouvrirFond(c);
  const e = c.dictee();
  const ici = [...e.mots.map((m) => m.w), ...Object.keys(e.memoire)].filter((w) => detecter(w).lieu === lieu);
  if (!ici.length) await message(f, PIEGES[lieu].nom, `Aucun mot n’habite ici cette semaine. ${PIEGES[lieu].regle}`, 'D’accord');
  else {
    await message(f, PIEGES[lieu].nom, `${PIEGES[lieu].regle} ${ici.length} mot${ici.length > 1 ? 's habitent' : ' habite'} ici.`, 'Je m’entraîne');
    await serie(c, f, ici.slice(0, 8), () => false);
  }
  fermerFond(c);
}

function murDesMots(c: Contexte): void {
  const f = ouvrirFond(c);
  const e = c.dictee();
  const carte = creer('section', 'exercice');
  const liste = creer('div', 'mur-mots');
  for (const r of e.retires) {
    const b = bouton('mot-grave', r.w);
    b.addEventListener('click', () => dire(r.w, true));
    liste.append(b);
  }
  const fermer = bouton('bouton-principal', 'Retour en ville');
  fermer.addEventListener('click', () => fermerFond(c));
  carte.append(
    creer('p', 'exercice-titre', 'Le mur des mots'),
    creer('p', 'exercice-texte', e.retires.length ? 'Ces mots sont sus pour toujours. Touche-en un pour l’entendre.' : 'Les mots sus pour toujours viendront s’écrire ici.'),
    liste,
    fermer,
  );
  f.replaceChildren(carte);
}

// --- La liste de la semaine : ouverte depuis l'espace parent -------------------------------------

function panneauParent(c: Contexte): void {
  const f = ouvrirFond(c);
  const e = c.dictee();
  const carte = creer('section', 'exercice parent');
  const zone = creer('textarea', 'parent-liste');
  zone.rows = 10;
  zone.value = e.titre ? [`# ${e.titre}`, ...e.mots.map((m) => (m.phrase ? `${m.w} | ${m.phrase}` : m.w))].join('\n') : '';
  zone.placeholder = '# Dictée n°6 : titre\nun mot | Une phrase avec le mot.';
  const jour = creer('select');
  ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].forEach((n, i) => {
    const o = creer('option', '', n);
    o.value = String(i);
    o.selected = i === e.jourDictee;
    jour.append(o);
  });
  const fichier = creer('input');
  fichier.type = 'file';
  fichier.accept = 'application/json,.json';
  const etat = creer('p', 'exercice-texte');
  const enregistrer = bouton('bouton-principal', 'Enregistrer la liste');
  const fermer = bouton('bouton-secondaire', 'Fermer');
  enregistrer.addEventListener('click', () => {
    const suivant = { ...changerListe(c.dictee(), zone.value, aujourdhui()), jourDictee: Number(jour.value) };
    c.changer(suivant);
    etat.textContent = `Liste enregistrée : ${suivant.mots.length} mots.`;
  });
  fichier.addEventListener('change', () => {
    const fic = fichier.files?.[0];
    if (!fic) return;
    void fic.text().then((t) => {
      let brut: unknown = null;
      try {
        brut = JSON.parse(t);
      } catch {
        brut = null;
      }
      const importe = importerDicteeBlocs(brut, aujourdhui());
      if (!importe) {
        etat.textContent = 'Ce fichier ne vient pas de Dictée-Blocs.';
        return;
      }
      c.changer(importe);
      etat.textContent = `Import réussi : ${importe.mots.length} mots de la semaine, ${Object.keys(importe.memoire).length} en mémoire, ${importe.retires.length} sus pour toujours.`;
      zone.value = [`# ${importe.titre}`, ...importe.mots.map((m) => (m.phrase ? `${m.w} | ${m.phrase}` : m.w))].join('\n');
    });
  });
  fermer.addEventListener('click', () => fermerFond(c));
  const ligneJour = creer('label', 'parent-ligne', 'Jour de la dictée : ');
  ligneJour.append(jour);
  const ligneImport = creer('label', 'parent-ligne', 'Importer Dictée-Blocs : ');
  ligneImport.append(fichier);
  const actions = creer('div', 'exercice-actions');
  actions.append(fermer, enregistrer);
  carte.append(creer('p', 'exercice-titre', 'Les mots de la semaine'), zone, ligneJour, ligneImport, etat, actions);
  f.replaceChildren(carte);
}

/** Ce que l'espace parent peut ouvrir. */
export interface Dictee {
  ouvrirLaListe(): void;
}

export function installerDictee(c: Contexte): Dictee {
  construireDecor(c);
  c.points.push(
    { verbe: 'Lire', nom: 'Le tableau des mots', x: LIEUX.tableau.x, z: LIEUX.tableau.z, action: () => void revisionOuConcours(c) },
    { verbe: 'Entrer', nom: PIEGES.double.nom, x: LIEUX.tour.x, z: LIEUX.tour.z, action: () => void lieuDePiege(c, 'double') },
    { verbe: 'Traverser', nom: PIEGES.mbp.nom, x: LIEUX.pont.x - 4.5, z: LIEUX.pont.z, action: () => void lieuDePiege(c, 'mbp') },
    { verbe: 'Regarder', nom: 'Le mur des mots', x: LIEUX.murDesMots.x, z: LIEUX.murDesMots.z, action: () => murDesMots(c) },
  );
  return { ouvrirLaListe: () => panneauParent(c) };
}
