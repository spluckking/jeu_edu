// Le Golem Express à l'écran : la scène 3D (golem-express-3d.ts), le capteur d'inclinaison, les
// cartes (consigne, bilan) et les résultats pour le parent. On pilote en penchant la tablette (ou
// au doigt, dans la moitié gauche) ; on attrape en touchant n'importe où dans la moitié droite.

import T from '../../content/fete/golem-express.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { bouton, creer, remplir, texteALire } from '../ville/interface.ts';
import { COULEURS, creerScene, PORTEE_VUE } from './golem-express-3d.ts';
import {
  affiner,
  ajuster,
  avecRappel,
  CHOIX_MINUTES,
  cout,
  DEMI_WAGONNET,
  DUREE_ECHAUFFEMENT,
  DUREE_MANCHE,
  DUREES_MANCHE,
  estLaCible,
  lieuOuvertPar,
  lieuxOuverts,
  manchesDuJour,
  mesuresVides,
  MINUTES_PAR_JOUR,
  penche,
  piegesPossibles,
  prochaineEpreuve,
  prochainObjet,
  reglageCaisses,
  reglagePilotage,
  resultat,
  reussiteCaisses,
  reussitEpreuve,
  reussitePilotage,
  tireCible,
  VITESSE_COTE,
  vitesseDeCote,
  WAGONS_MAX,
  type Cible,
  type Epreuve,
  type IdLieu,
  type Mesures,
  type Niveaux,
  type Objet,
  type Resultat,
} from './golem-express.ts';

const CLE = 'golem-express';

// --- La sauvegarde (sur la tablette seulement) -------------------------------------------------

type Orientation = 'paysage' | 'portrait';
type Pilotage = 'inclinaison' | 'doigt';

interface Sauvegarde {
  niveaux: Niveaux;
  wagons: number;
  /** Le temps de jeu par jour choisi par le parent (minutes), et la durée d'une manche (s). */
  minutes: number;
  duree: number;
  difficiles: number;
  echauffement: string;
  resultats: Resultat[];
  /** Le jour en cours et ses manches jouées. */
  jour: string;
  manchesJour: number;
  pilotage: Pilotage;
  /** Le sens de l'inclinaison, appris au réglage, pour chaque orientation de l'écran. */
  sens: Partial<Record<Orientation, 1 | -1>>;
}

const neuve = (): Sauvegarde => ({
  niveaux: { pilotage: 1, caisses: 1 },
  wagons: 0,
  minutes: MINUTES_PAR_JOUR,
  duree: DUREE_MANCHE,
  difficiles: 0,
  echauffement: '',
  resultats: [],
  jour: '',
  manchesJour: 0,
  pilotage: 'inclinaison',
  sens: {},
});

export function lire(): Sauvegarde {
  try {
    const s = localStorage.getItem(CLE);
    return s ? { ...neuve(), ...(JSON.parse(s) as Partial<Sauvegarde>) } : neuve();
  } catch {
    return neuve();
  }
}
function ecrire(s: Sauvegarde): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(s));
  } catch {
    // Pas de stockage (navigation privée) : le jeu marche quand même, sans mémoire.
  }
}

// --- Le capteur d'inclinaison ------------------------------------------------------------------

const orientation = (): Orientation => (window.innerWidth >= window.innerHeight ? 'paysage' : 'portrait');
const angleEcran = (): number => screen.orientation?.angle ?? 0;

/** La pesanteur mesurée par la tablette, lissée ; null tant que rien n'est arrivé. */
const capteur = (() => {
  let g: { x: number; y: number; z: number } | null = null;
  let ecoute = false;
  const recevoir = (e: DeviceMotionEvent): void => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    g = g ? { x: g.x + (a.x - g.x) * 0.3, y: g.y + (a.y - g.y) * 0.3, z: g.z + (a.z - g.z) * 0.3 } : { x: a.x, y: a.y, z: a.z };
  };
  return {
    /** Se résout à vrai si la tablette donne son inclinaison (dans la seconde et demie). */
    demarrer(): Promise<boolean> {
      if (!ecoute) {
        window.addEventListener('devicemotion', recevoir);
        ecoute = true;
      }
      const debut = performance.now();
      return new Promise((ok) => {
        const voir = (): void => {
          if (g) ok(true);
          else if (performance.now() - debut > 1500) ok(false);
          else window.setTimeout(voir, 100);
        };
        voir();
      });
    },
    angle(): number | null {
      return g ? penche(g, angleEcran()) : null;
    },
  };
})();

/** Garde l'écran dans son sens pendant la course (pencher la tablette ne doit pas le tourner). */
function bloquerEcran(oui: boolean): void {
  const o = screen.orientation as unknown as { type: string; lock?(x: string): Promise<void> };
  try {
    void o.lock?.(oui ? o.type : 'landscape')?.catch(() => undefined);
  } catch {
    // Pas de verrouillage possible (hors plein écran) : tant pis.
  }
}

// --- Les dessins des cartes (2D) ----------------------------------------------------------------

/** Un minerai (bloc carré à éclats, ou pépite en caillou), ou la TNT. */
export function dessinerObjet(c: CanvasRenderingContext2D, o: Objet, x: number, y: number, k = 1): void {
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  if (o.sorte === 'tnt') {
    c.fillStyle = '#d63a2f';
    c.fillRect(-24, -24, 48, 48);
    c.fillStyle = '#fff8ee';
    c.fillRect(-24, -9, 48, 18);
    c.fillStyle = '#4a3833';
    c.font = '700 15px Andika, system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('TNT', 0, 1);
    c.fillRect(-1.5, -34, 3, 10);
  } else if (o.forme === 'bloc') {
    const [a, b] = COULEURS[o.matiere];
    c.fillStyle = b;
    c.fillRect(-24, -24, 48, 48);
    c.fillStyle = a;
    c.fillRect(-20, -20, 40, 40);
    c.fillStyle = b;
    for (const [px, py] of [
      [-12, -12],
      [6, -8],
      [-6, 6],
      [10, 10],
      [-14, 12],
    ] as const)
      c.fillRect(px, py, 7, 7);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(-20, -20, 40, 5);
  } else {
    const [a, b] = COULEURS[o.matiere];
    const caillou = (p: ReadonlyArray<readonly [number, number]>, couleur: string): void => {
      c.fillStyle = couleur;
      c.beginPath();
      for (const [px, py] of p) c.lineTo(px, py);
      c.closePath();
      c.fill();
    };
    caillou(
      [
        [-18, 4],
        [-10, -14],
        [8, -16],
        [19, -2],
        [12, 15],
        [-8, 16],
      ],
      b,
    );
    caillou(
      [
        [-12, 2],
        [-7, -9],
        [6, -10],
        [12, -1],
        [8, 9],
        [-5, 10],
      ],
      a,
    );
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(-4, -6, 5, 5);
  }
  c.restore();
}

function imageObjet(o: Objet, taille = 120, classe = 'golem-objet'): HTMLCanvasElement {
  const t = creer('canvas', classe);
  t.width = taille;
  t.height = taille;
  dessinerObjet(t.getContext('2d')!, o, taille / 2, taille / 2, taille / 60);
  return t;
}

function nomCible(c: Cible): string {
  // « les pépites d’or », « les blocs d’émeraude » : de devant une voyelle s'élide.
  return remplir(T.formes[c.forme][1]!, { matiere: T.matieres[c.matiere] }).replace(/ de ([aeiouyéèêh])/iu, ' d’$1');
}

// --- Une manche --------------------------------------------------------------------------------

type Mode = 'double' | 'pilotage' | 'caisses';
type Controle = { sorte: 'inclinaison'; sens: 1 | -1 } | { sorte: 'doigt' };

interface Posee {
  id: number;
  distance: number;
  fini: boolean;
}
interface EpreuvePosee extends Posee {
  epreuve: Epreuve;
}
/** Les minerais volent : leur vitesse, en part de celle du wagonnet. */
const VOL = 2;
/** Combien de temps (s) on voit arriver un minerai avant de pouvoir l'attraper. */
const AVANT_PORTEE = 1;

interface ObjetPose extends Posee {
  cible: boolean;
  entree: number;
}

interface OptionsManche {
  mode: Mode;
  niveaux: Niveaux;
  cible: Cible;
  duree: number;
  wagons: number;
  entete: string;
  lieu: IdLieu;
  controle: Controle;
}

/** Une manche ; se résout avec les mesures, ou null si l'enfant l'a arrêtée. */
function courir(f: HTMLElement, o: OptionsManche): Promise<Mesures | null> {
  return new Promise((fini) => {
    const { mode } = o;
    const cadre = creer('section', 'golem3d');
    const toile = creer('canvas', 'golem-toile');
    const haut = creer('div', 'golem-haut');
    const barre = creer('div', 'golem-barre');
    const reste = creer('div', 'golem-reste');
    barre.append(reste);
    haut.append(creer('span', 'golem-entete', o.entete), barre);
    const pause = bouton('golem-pause', T.pause);
    cadre.append(toile, haut, pause);
    if (mode !== 'pilotage') {
      if (avecRappel(o.niveaux.caisses)) {
        const rappel = creer('div', 'golem-rappel');
        rappel.append(imageObjet({ sorte: 'minerai', ...o.cible }, 80, 'golem-rappel-image'));
        cadre.append(rappel);
      }
      cadre.append(creer('div', 'golem-zone-droite', T.toucheIci));
    }
    if (mode !== 'caisses' && o.controle.sorte === 'doigt') cadre.append(creer('div', 'golem-zone-gauche'));
    f.replaceChildren(cadre);
    const scene = creerScene(toile, o.lieu, o.wagons);
    bloquerEcran(true);

    const pil = reglagePilotage(mode === 'caisses' ? 3 : o.niveaux.pilotage);
    const cai = reglageCaisses(o.niveaux.caisses);
    const m = mesuresVides();
    let t = 0;
    let d = 0;
    let x = 0;
    let virage = 0;
    let contreMur = false;
    // Le réglage fin (pilotage : vitesse ; minerais : temps pour attraper), et ses fenêtres de 10 s.
    let fp = 1;
    let fc = 1;
    const fenP = { ok: 0, n: 0 };
    const fenC = { ok: 0, n: 0 };
    let prochainReglage = 10;
    let prochaineEpreuveA = 35;
    let xPorte = 0;
    let prochainObjetDans = 2.2;
    const epreuves: EpreuvePosee[] = [];
    let objets: ObjetPose[] = [];
    const neutre = capteur.angle() ?? 0;
    let doigtX: number | null = null;
    let clavierDir = 0;
    let enPause = false;
    let arrete = false;
    let forcage: number | null = null;

    const vitesse = (): number => pil.vitesse * fp;
    const fenetre = (): number => cai.fenetre / fc;
    // Les minerais sont lancés vers le golem : ils volent à leur propre vitesse, en plus de celle du
    // wagonnet, et arrivent bien plus vite qu'un objet posé sur la route.
    const vol = (): number => vitesse() * VOL;
    const approche = (): number => vitesse() + vol();
    const aPortee = (p: ObjetPose): boolean => !p.fini && p.distance - d > 0 && p.distance - d <= approche() * fenetre();

    const toucher = (): void => {
      if (mode === 'pilotage' || enPause) return;
      const p = objets.filter(aPortee).sort((a, b) => a.distance - b.distance)[0];
      if (!p) {
        m.dansLeVide++;
        return;
      }
      p.fini = true;
      scene.attraper(p.id, p.cible);
      fenC.n++;
      if (p.cible) {
        m.cibles++;
        m.attrapees++;
        m.reactions.push(Math.round((t - p.entree) * 1000));
        fenC.ok++;
        bruitage.reussite();
      } else {
        m.pieges++;
        m.piegesAttrapes++;
        bruitage.erreur();
      }
    };

    // Les gestes : la moitié droite attrape ; la moitié gauche pilote (au doigt).
    const moitieDroite = (e: PointerEvent): boolean => {
      const r = cadre.getBoundingClientRect();
      return e.clientX > r.left + r.width / 2;
    };
    const versX = (e: PointerEvent): number => {
      const r = cadre.getBoundingClientRect();
      return Math.max(-1, Math.min(1, ((e.clientX - r.left) / (r.width / 2)) * 2 - 1));
    };
    let doigtPilote: number | null = null;
    cadre.addEventListener('pointerdown', (e) => {
      if (e.target === pause || enPause) return;
      e.preventDefault();
      if (moitieDroite(e)) toucher();
      else if (o.controle.sorte === 'doigt' && mode !== 'caisses') {
        doigtPilote = e.pointerId;
        doigtX = versX(e);
      }
    });
    cadre.addEventListener('pointermove', (e) => {
      if (e.pointerId === doigtPilote) doigtX = versX(e);
    });
    const lacher = (e: PointerEvent): void => {
      if (e.pointerId === doigtPilote) doigtPilote = null;
    };
    cadre.addEventListener('pointerup', lacher);
    cadre.addEventListener('pointercancel', lacher);
    const clavier = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (e.type === 'keydown' && !e.repeat) toucher();
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const s = e.code === 'ArrowLeft' ? -1 : 1;
        if (e.type === 'keydown') clavierDir = s;
        else if (clavierDir === s) clavierDir = 0;
      }
    };
    window.addEventListener('keydown', clavier);
    window.addEventListener('keyup', clavier);

    // La pause : le bouton en haut à gauche, ou quand on quitte l'application.
    const carton = creer('div', 'golem-pause-fond');
    carton.hidden = true;
    const carteP = creer('div', 'exercice golem-pause-carte');
    const reprendre = bouton('bouton-principal', T.reprendre);
    const arreter = bouton('bouton-secondaire', T.arreter);
    const actionsP = creer('div', 'exercice-actions');
    actionsP.append(arreter, reprendre);
    carteP.append(creer('p', 'exercice-titre', T.pause), actionsP);
    carton.append(carteP);
    cadre.append(carton);
    const mettrePause = (oui: boolean): void => {
      enPause = oui;
      carton.hidden = !oui;
    };
    pause.addEventListener('click', () => {
      bruitage.touche();
      mettrePause(true);
    });
    reprendre.addEventListener('click', () => {
      bruitage.touche();
      mettrePause(false);
    });
    arreter.addEventListener('click', () => {
      bruitage.touche();
      arrete = true;
    });
    const cache = (): void => {
      if (document.hidden) mettrePause(true);
    };
    document.addEventListener('visibilitychange', cache);

    // Pour les essais sur ordinateur : l'état du jeu, lisible et pilotable par un robot de test.
    if (new URLSearchParams(location.search).has('essai')) {
      (window as unknown as Record<string, unknown>).golem = {
        etat: () => ({ t, d, x, fp, fc, mesures: { ...m }, prochaine: epreuves.find((p) => !p.fini)?.epreuve ?? null, aPortee: objets.filter(aPortee).map((p) => p.cible) }),
        toucher,
        piloter: (v: number | null) => (forcage = v),
        finir: () => (t = o.duree),
      };
    }

    const terminer = (resultatManche: Mesures | null): void => {
      window.removeEventListener('keydown', clavier);
      window.removeEventListener('keyup', clavier);
      document.removeEventListener('visibilitychange', cache);
      bloquerEcran(false);
      scene.liberer();
      fini(resultatManche);
    };

    let avant = performance.now();
    const image = (maintenant: number): void => {
      const dt = Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      if (arrete) return terminer(null);
      if (enPause) {
        requestAnimationFrame(image);
        return;
      }
      t += dt;
      d += vitesse() * dt;

      // Le pilotage.
      let vx = 0;
      if (mode === 'caisses') vx = Math.max(-VITESSE_COTE, Math.min(VITESSE_COTE, -x * 3));
      else if (forcage !== null) vx = forcage;
      else if (clavierDir) vx = clavierDir * VITESSE_COTE;
      else if (o.controle.sorte === 'inclinaison') {
        const a = capteur.angle();
        vx = a === null ? 0 : vitesseDeCote(o.controle.sens * (a - neutre));
      } else if (doigtX !== null) vx = Math.max(-VITESSE_COTE, Math.min(VITESSE_COTE, (doigtX - x) * 6));
      x += vx * dt;
      const limite = 1 - DEMI_WAGONNET;
      if (Math.abs(x) > limite) {
        x = Math.sign(x) * limite;
        if (!contreMur && mode !== 'caisses') {
          m.murs++;
          scene.secouer();
        }
        contreMur = true;
      } else contreMur = false;
      virage += (vx / VITESSE_COTE - virage) * Math.min(1, dt * 6);

      // Les portes et les rochers.
      if (mode !== 'caisses') {
        while (prochaineEpreuveA <= d + PORTEE_VUE) {
          const e = prochaineEpreuve(o.niveaux.pilotage, xPorte, Math.random);
          epreuves.push({ id: scene.poserEpreuve(e, prochaineEpreuveA), distance: prochaineEpreuveA, fini: false, epreuve: e });
          if (e.sorte === 'porte') xPorte = e.x;
          prochaineEpreuveA += pil.espacement * (0.85 + 0.3 * Math.random());
        }
        for (const p of epreuves) {
          if (p.fini || p.distance > d) continue;
          p.fini = true;
          const ok = reussitEpreuve(p.epreuve, x);
          m.epreuves++;
          fenP.n++;
          if (ok) {
            m.reussies++;
            fenP.ok++;
            if (p.epreuve.sorte === 'porte') bruitage.ticket();
          }
          scene.marquerEpreuve(p.id, ok);
        }
      }

      // Les minerais.
      if (mode !== 'pilotage') {
        prochainObjetDans -= dt;
        if (prochainObjetDans <= 0) {
          prochainObjetDans = cai.intervalle * (0.8 + Math.random() * 0.4);
          const ob = prochainObjet(o.cible, cai.ressemblance, Math.random);
          const distance = d + approche() * (fenetre() + AVANT_PORTEE);
          objets.push({ id: scene.poserObjet(ob, distance, Math.random() < 0.5 ? 1 : -1), distance, fini: false, cible: estLaCible(ob, o.cible), entree: 0 });
        }
        for (const p of objets) {
          p.distance -= vol() * dt;
          scene.deplacerObjet(p.id, p.distance);
          if (p.fini) continue;
          const portee = aPortee(p);
          if (portee && !p.entree) p.entree = t;
          scene.aPortee(p.id, portee);
          if (p.distance <= d) {
            p.fini = true;
            fenC.n++;
            if (p.cible) m.cibles++;
            else {
              m.pieges++;
              fenC.ok++;
            }
          }
        }
        objets = objets.filter((p) => !p.fini || p.distance > d - 15);
      }

      // Le réglage fin, toutes les dix secondes.
      if (t >= prochainReglage) {
        prochainReglage += 10;
        if (mode !== 'caisses') fp = affiner(fp, fenP.ok, fenP.n);
        if (mode !== 'pilotage') fc = affiner(fc, fenC.ok, fenC.n);
        fenP.ok = fenP.n = fenC.ok = fenC.n = 0;
      }

      reste.style.width = `${Math.max(0, 100 * (1 - t / o.duree))}%`;
      scene.image(dt, d, x, virage);
      if (t >= o.duree) terminer(m);
      else requestAnimationFrame(image);
    };
    requestAnimationFrame(image);
  });
}

// --- Les cartes ----------------------------------------------------------------------------------

function carte(f: HTMLElement, titre: string, contenu: HTMLElement[], boutons: string[]): Promise<number> {
  return new Promise((ok) => {
    const s = creer('section', 'exercice golem-carte');
    const actions = creer('div', 'exercice-actions');
    boutons.forEach((libelle, i) => {
      const b = bouton(i === boutons.length - 1 ? 'bouton-principal' : 'bouton-secondaire', libelle);
      b.addEventListener('click', () => {
        bruitage.touche();
        ok(i);
      });
      actions.append(b);
    });
    s.append(creer('p', 'exercice-titre', titre), ...contenu, actions);
    f.replaceChildren(s);
  });
}

/** L'écran de consigne : la cible, tout ce qu'il faut laisser passer, puis « OK ». */
function consigne(f: HTMLElement, titre: string, cible: Cible, niveauCaisses: number, avant: HTMLElement[] = []): Promise<number> {
  const pieges = creer('div', 'golem-pieges');
  for (const p of piegesPossibles(cible, reglageCaisses(niveauCaisses).ressemblance).slice(0, 8)) pieges.append(imageObjet(p, 64, 'golem-piege'));
  const contenu = [...avant, texteALire(remplir(T.consigne, { cible: nomCible(cible) })), imageObjet({ sorte: 'minerai', ...cible }), texteALire(T.laisse), pieges];
  if (!avecRappel(niveauCaisses)) contenu.push(texteALire(T.retiens));
  contenu.push(texteALire(T.pret));
  return carte(f, titre, contenu, [T.sortir, T.ok]);
}

/** Le réglage de l'inclinaison : la tablette droite, puis penchée à gauche ; rend le sens, ou
 *  null si l'enfant préfère le doigt. */
function reglerInclinaison(f: HTMLElement): Promise<1 | -1 | null> {
  return new Promise((ok) => {
    const s = creer('section', 'exercice golem-carte');
    const texte = texteALire(T.reglageTenir);
    const jauge = creer('div', 'golem-jauge');
    const point = creer('div', 'golem-jauge-point');
    jauge.append(point);
    const actions = creer('div', 'exercice-actions');
    const doigt = bouton('bouton-secondaire', T.parent.doigt);
    const suivant = bouton('bouton-principal', T.ok);
    actions.append(doigt, suivant);
    s.append(creer('p', 'exercice-titre', T.reglageTitre), texte, jauge, actions);
    f.replaceChildren(s);
    let neutre: number | null = null;
    let fini = false;
    const suivre = (): void => {
      if (fini) return;
      const a = capteur.angle() ?? 0;
      const ecart = neutre === null ? 0 : a - neutre;
      // Le point part toujours vers la gauche, comme la tablette : on ne connaît pas encore le sens
      // du capteur, et un point qui partirait de l'autre côté ferait pencher l'enfant à l'envers.
      point.style.left = `${50 - Math.min(45, Math.abs(ecart) * 2.5)}%`;
      if (neutre !== null && Math.abs(ecart) > 12) {
        fini = true;
        texte.replaceWith(texteALire(T.reglageBravo));
        bruitage.reussite();
        window.setTimeout(() => ok(ecart < 0 ? 1 : -1), 1200);
        return;
      }
      requestAnimationFrame(suivre);
    };
    suivant.addEventListener('click', () => {
      bruitage.touche();
      neutre = capteur.angle() ?? 0;
      suivant.hidden = true;
      const t2 = texteALire(T.reglageGauche);
      texte.replaceWith(t2);
    });
    doigt.addEventListener('click', () => {
      fini = true;
      ok(null);
    });
    requestAnimationFrame(suivre);
  });
}

// --- Le déroulé d'une partie -------------------------------------------------------------------

/** Une partie : le réglage (la première fois), l'échauffement (une fois par jour), puis les
 *  manches du jour. */
export async function jouerGolem(f: HTMLElement): Promise<void> {
  let s = lire();
  const jour = aujourdhui();
  if (s.jour !== jour) {
    s.jour = jour;
    s.manchesJour = 0;
    ecrire(s);
  }
  const total = manchesDuJour(s.minutes, s.duree);
  if (s.manchesJour >= total) {
    await carte(f, T.titre, [texteALire(T.finDuJour)], [T.sortir]);
    return;
  }

  // La présentation, et le lieu (dès qu'il y en a plusieurs).
  const ouverts = lieuxOuverts(s.wagons);
  const presentation = [texteALire(T.presentation), texteALire(T.difficile)];
  let lieu: IdLieu = ouverts[ouverts.length - 1]!;
  if (ouverts.length > 1) {
    presentation.push(texteALire(T.choisirLieu));
    const i = await carte(f, T.titre, presentation, [T.sortir, ...ouverts.map((l) => T.lieux[l])]);
    if (i === 0) return;
    lieu = ouverts[i - 1]!;
  } else if ((await carte(f, T.titre, presentation, [T.sortir, T.cestParti])) === 0) return;

  // Le pilotage : l'inclinaison si la tablette la donne (réglée une fois par orientation).
  let controle: Controle = { sorte: 'doigt' };
  if (s.pilotage === 'inclinaison') {
    if (await capteur.demarrer()) {
      let sens = s.sens[orientation()];
      if (!sens) {
        const r = await reglerInclinaison(f);
        if (r) {
          sens = r;
          s = lire();
          s.sens = { ...s.sens, [orientation()]: r };
          ecrire(s);
        }
      }
      if (sens) controle = { sorte: 'inclinaison', sens };
    } else await carte(f, T.titre, [texteALire(T.pasDeCapteur)], [T.ok]);
  }

  // L'échauffement, une fois par jour : chaque tâche seule (pour mesurer le coût de la double tâche).
  if (s.echauffement !== jour) {
    const cible = tireCible(Math.random);
    await carte(f, T.echauffement, [texteALire(controle.sorte === 'inclinaison' ? T.echauffePilotage : T.echauffePilotageDoigt)], [T.cestParti]);
    const mp = await courir(f, { mode: 'pilotage', niveaux: s.niveaux, cible, duree: DUREE_ECHAUFFEMENT, wagons: s.wagons, entete: T.echauffement, lieu, controle });
    if (!mp) return;
    s = lire();
    s.resultats.push(resultat(jour, 'pilotage', s.niveaux, mp));
    ecrire(s);
    if ((await consigne(f, T.echauffement, cible, s.niveaux.caisses, [texteALire(T.echauffeCaisses)])) === 0) return;
    const mc = await courir(f, { mode: 'caisses', niveaux: s.niveaux, cible, duree: DUREE_ECHAUFFEMENT, wagons: s.wagons, entete: T.echauffement, lieu, controle });
    if (!mc) return;
    s = lire();
    s.resultats.push(resultat(jour, 'caisses', s.niveaux, mc));
    s.echauffement = jour;
    ecrire(s);
  }

  // Les manches du jour.
  while (s.manchesJour < total) {
    const n = s.manchesJour + 1;
    const cible = tireCible(Math.random);
    const entete = remplir(T.mancheN, { n, total });
    if ((await consigne(f, entete, cible, s.niveaux.caisses)) === 0) return;
    const m = await courir(f, { mode: 'double', niveaux: s.niveaux, cible, duree: s.duree, wagons: s.wagons, entete, lieu, controle });
    if (!m) return;
    s = lire();
    const a = ajuster(s.niveaux, m, s.difficiles);
    s.resultats.push(resultat(jour, 'double', s.niveaux, m, s.duree));
    s.niveaux = a.niveaux;
    s.difficiles = a.difficiles;
    s.manchesJour++;
    const avant = s.wagons;
    if (a.etoile) s.wagons = Math.min(WAGONS_MAX, s.wagons + 1);
    const nouveau = lieuOuvertPar(avant, s.wagons);
    ecrire(s);
    const textes = [remplir(T.bilanManche, { pilotage: Math.round(100 * reussitePilotage(m)), caisses: Math.round(100 * reussiteCaisses(m)) })];
    textes.push(a.etoile ? T.etoile : T.presque);
    if (nouveau) textes.push(remplir(T.nouveauLieu, { lieu: T.lieux[nouveau].toLowerCase() }));
    if (a.monte.pilotage) textes.push(T.plusVite);
    if (a.monte.caisses) textes.push(T.plusMalin);
    if (a.descend) textes.push(T.plusDoux);
    if (a.etoile) {
      bruitage.finDeManche();
      confettis();
    }
    const derniere = s.manchesJour >= total;
    if ((await carte(f, entete, textes.map((x) => texteALire(x)), derniere ? [T.continuer] : [T.sortir, T.continuer])) === 0 && !derniere) return;
  }
  bruitage.finDeManche();
  await carte(f, T.titre, [texteALire(s.wagons === 0 ? T.finZero : s.wagons === 1 ? T.finUn : remplir(T.fin, { wagons: s.wagons })), texteALire(T.finDuJour)], [T.continuer]);
}

// --- Pour le parent ------------------------------------------------------------------------------

function choix<V extends string | number>(etiquette: string, valeurs: ReadonlyArray<[V, string]>, actuelle: V, changer: (v: V) => void): HTMLElement {
  const l = creer('label', 'golem-reglage', `${etiquette} : `);
  const sel = creer('select');
  for (const [v, nom] of valeurs) {
    const op = creer('option', '', nom);
    op.value = String(v);
    op.selected = v === actuelle;
    sel.append(op);
  }
  sel.addEventListener('change', () => {
    const v = valeurs.find(([x]) => String(x) === sel.value);
    if (v) changer(v[0]);
  });
  l.append(sel);
  return l;
}

/** Les résultats des manches, et les réglages du parent. */
export function voirResultats(f: HTMLElement): Promise<void> {
  return new Promise((fini) => {
    const s = lire();
    const modifier = (m: (x: Sauvegarde) => void): void => {
      const x = lire();
      m(x);
      ecrire(x);
    };
    const carteR = creer('section', 'exercice golem-resultats');
    const minutes = choix(
      T.parent.minutes,
      CHOIX_MINUTES.map((n) => [n, remplir(T.parent.minutesN, { n })] as [number, string]),
      s.minutes,
      (v) => modifier((x) => (x.minutes = v)),
    );
    const duree = choix(
      T.parent.duree,
      DUREES_MANCHE.map((d) => [d, d === 90 ? T.parent.duree90 : T.parent.duree180] as [number, string]),
      s.duree,
      (v) => modifier((x) => (x.duree = v)),
    );
    const pilotage = choix<Pilotage>(
      T.parent.pilotage,
      [
        ['inclinaison', T.parent.inclinaison],
        ['doigt', T.parent.doigt],
      ],
      s.pilotage,
      (v) => modifier((x) => (x.pilotage = v)),
    );
    // Si le wagonnet part du mauvais côté : on retourne le sens appris, sans refaire le réglage.
    const inverser = bouton('bouton-secondaire', T.parent.inverserSens);
    inverser.disabled = !Object.keys(s.sens).length;
    inverser.addEventListener('click', () => {
      modifier((x) => {
        for (const k of Object.keys(x.sens) as Orientation[]) x.sens[k] = x.sens[k] === 1 ? -1 : 1;
      });
      inverser.disabled = true;
      inverser.textContent = T.parent.sensInverse;
    });
    const refaire = bouton('bouton-secondaire', T.parent.refaireReglage);
    refaire.addEventListener('click', () => {
      modifier((x) => (x.sens = {}));
      refaire.disabled = true;
      refaire.textContent = T.parent.reglageEfface;
    });
    const tableau = creer('table', 'golem-tableau');
    const tete = creer('tr');
    for (const col of T.parent.colonnes) tete.append(creer('th', '', col));
    tableau.append(tete);
    const echauffe = (date: string, sorte: 'pilotage' | 'caisses'): Resultat | undefined => s.resultats.find((x) => x.date === date && x.sorte === sorte);
    const pourcent = (v: number | null): string => (v === null ? '–' : `${v} %`);
    for (const r of [...s.resultats].reverse().slice(0, 40)) {
      const l = creer('tr', r.sorte === 'double' ? '' : 'echauffement');
      const seulC = r.sorte === 'double' ? echauffe(r.date, 'caisses') : undefined;
      const seulP = r.sorte === 'double' ? echauffe(r.date, 'pilotage') : undefined;
      const coutCaisses = seulC?.dprime !== undefined && r.dprime !== undefined ? cout(seulC.dprime, r.dprime) : null;
      const coutPilotage = seulP ? cout(seulP.pilotage, r.pilotage) : null;
      const date = r.sorte === 'double' ? r.date : `${r.date} (${r.sorte === 'pilotage' ? T.parent.seulChemin : T.parent.seulesCaisses})`;
      for (const v of [date, r.niveaux.pilotage, r.niveaux.caisses, r.sorte === 'caisses' ? '–' : `${r.pilotage} %`, r.sorte === 'pilotage' ? '–' : `${r.caisses} %`, r.oubliees, r.erreurs, r.reaction ? `${r.reaction} ms` : '–', r.regularite ? `${r.regularite} ms` : '–', r.dprime === undefined ? '–' : r.dprime.toFixed(2), pourcent(coutPilotage), pourcent(coutCaisses)]) l.append(creer('td', '', String(v)));
      tableau.append(l);
    }
    const effacer = bouton('bouton-secondaire', T.parent.effacer);
    let sur = false;
    effacer.addEventListener('click', () => {
      if (!sur) {
        sur = true;
        effacer.textContent = `${T.parent.effacer} ?`;
        return;
      }
      const x = lire();
      ecrire({ ...neuve(), minutes: x.minutes, duree: x.duree, pilotage: x.pilotage, sens: x.sens });
      fini();
    });
    const fermer = bouton('bouton-principal', T.parent.fermer);
    fermer.addEventListener('click', () => fini());
    const actions = creer('div', 'exercice-actions');
    actions.append(effacer, fermer);
    const fait = s.jour === aujourdhui() ? s.manchesJour : 0;
    carteR.append(
      creer('p', 'exercice-titre', T.parent.titre),
      minutes,
      duree,
      pilotage,
      inverser,
      refaire,
      creer('p', 'golem-aide', remplir(T.parent.aujourdhui, { fait, total: manchesDuJour(s.minutes, s.duree) })),
      s.resultats.length ? tableau : creer('p', '', T.parent.aucun),
      creer('p', 'golem-aide', T.parent.aide),
      creer('p', 'golem-aide', remplir(T.parent.niveaux, { ...s.niveaux, wagons: s.wagons })),
      actions,
    );
    f.replaceChildren(carteR);
  });
}
