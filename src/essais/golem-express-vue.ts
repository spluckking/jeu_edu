// Le Golem Express à l'écran (2D, vu de dessus) : un doigt guide le train (le golem pose les rails
// devant la locomotive), l'autre main touche « Attraper » quand passe la bonne caisse. Les rails
// brillent de pierre rouge tant que le train reste sur le chemin de cailloux.

import T from '../../content/fete/golem-express.json';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { bouton, creer, remplir, texteALire } from '../ville/interface.ts';
import {
  ajuster,
  cheminY,
  DUREE_ECHAUFFEMENT,
  DUREE_MANCHE,
  estLaCible,
  mesuresVides,
  prochainObjet,
  reglageCaisses,
  reglagePilotage,
  resultat,
  reussiteCaisses,
  reussitePilotage,
  tireCible,
  WAGONS_MAX,
  type Cible,
  type Matiere,
  type Mesures,
  type Niveaux,
  type Objet,
  type Resultat,
} from './golem-express.ts';

const L = 1000;
const H = 600;
const LOCO_X = 260;
const CLE = 'golem-express';

// --- La sauvegarde (sur la tablette seulement) -------------------------------------------------

interface Sauvegarde {
  niveaux: Niveaux;
  wagons: number;
  manches: number;
  difficiles: number;
  echauffement: string;
  resultats: Resultat[];
}

const neuve = (): Sauvegarde => ({ niveaux: { pilotage: 1, caisses: 1 }, wagons: 0, manches: 3, difficiles: 0, echauffement: '', resultats: [] });

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

// --- Les dessins -------------------------------------------------------------------------------

const COULEURS: Record<Matiere, [string, string]> = {
  fer: ['#ddd5ca', '#a8917a'],
  or: ['#f6c945', '#c48d1d'],
  cuivre: ['#d9824e', '#7fbfa0'],
  emeraude: ['#35c47a', '#1b7f4b'],
  diamant: ['#79e6e2', '#2fa9b8'],
  charbon: ['#4a4a4a', '#1c1c1c'],
  pierreRouge: ['#e0443a', '#ff8a7a'],
};

/** Une caisse : un bloc (carré, à facettes) ou une pépite (caillou), ou la TNT. */
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
    c.fillStyle = '#4a3833';
    c.fillRect(-1.5, -34, 3, 10);
  } else if (o.forme === 'bloc') {
    const [a, b] = COULEURS[o.matiere];
    c.fillStyle = b;
    c.fillRect(-24, -24, 48, 48);
    c.fillStyle = a;
    c.fillRect(-20, -20, 40, 40);
    // Des éclats en petits carrés : chaque matière a les siens.
    c.fillStyle = b;
    for (const [px, py] of [[-12, -12], [6, -8], [-6, 6], [10, 10], [-14, 12]]) c.fillRect(px!, py!, 7, 7);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(-20, -20, 40, 5);
  } else {
    const [a, b] = COULEURS[o.matiere];
    c.fillStyle = b;
    c.beginPath();
    c.moveTo(-18, 4);
    c.lineTo(-10, -14);
    c.lineTo(8, -16);
    c.lineTo(19, -2);
    c.lineTo(12, 15);
    c.lineTo(-8, 16);
    c.closePath();
    c.fill();
    c.fillStyle = a;
    c.beginPath();
    c.moveTo(-12, 2);
    c.lineTo(-7, -9);
    c.lineTo(6, -10);
    c.lineTo(12, -1);
    c.lineTo(8, 9);
    c.lineTo(-5, 10);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(-4, -6, 5, 5);
  }
  c.restore();
}

/** La locomotive, son golem de pierre aux yeux lumineux, et ses wagons. */
function dessinerTrain(c: CanvasRenderingContext2D, positions: Array<{ x: number; y: number; a: number }>, t: number): void {
  for (let i = positions.length - 1; i >= 1; i--) {
    const p = positions[i]!;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.a);
    c.fillStyle = ['#6aa8ef', '#8acb52', '#ffc94a', '#c58ce8'][i % 4]!;
    c.fillRect(-26, -20, 52, 40);
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(-26, 12, 52, 8);
    c.restore();
  }
  const p = positions[0]!;
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.a);
  c.fillStyle = '#4a3833';
  c.fillRect(-38, -24, 70, 48);
  c.fillStyle = '#f27a8e';
  c.fillRect(-34, -20, 40, 40);
  c.fillStyle = '#7a6458';
  c.beginPath();
  c.arc(18, 0, 13, 0, 7);
  c.fill();
  // La fumée.
  c.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 3; i++) {
    const f = (t * 1.5 + i / 3) % 1;
    c.beginPath();
    c.arc(18 - f * 60, -f * 25, 6 + f * 10, 0, 7);
    c.fill();
  }
  // Le golem, à l'avant : un bloc de pierre moussue.
  c.fillStyle = '#9a9a8e';
  c.fillRect(30, -18, 30, 36);
  c.fillStyle = '#6fa35a';
  c.fillRect(30, -18, 30, 8);
  c.fillStyle = '#ffd34d';
  c.fillRect(50, -10, 6, 6);
  c.fillRect(50, 4, 6, 6);
  c.restore();
}

// --- Une manche --------------------------------------------------------------------------------

type Mode = 'double' | 'pilotage' | 'caisses';

interface EnCours {
  objet: Objet;
  wx: number;
  cible: boolean;
  entree: number;
  fini: '' | 'pris' | 'erreur' | 'passe';
  quand: number;
}

/** Une manche ; se résout avec les mesures. */
function courir(f: HTMLElement, mode: Mode, n: Niveaux, cible: Cible, duree: number, wagons: number, entete: string): Promise<Mesures> {
  return new Promise((fini) => {
    const cadre = creer('section', 'manege golem');
    const toile = creer('canvas', 'manege-toile');
    const attraper = bouton('golem-attraper', T.attraper);
    attraper.hidden = mode === 'pilotage';
    cadre.append(toile, attraper);
    f.replaceChildren(cadre);
    const c = toile.getContext('2d')!;
    const ajuster = (): void => {
      const r = toile.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      toile.width = Math.round(r.width * dpr);
      toile.height = Math.round(r.height * dpr);
    };
    ajuster();

    const pil = reglagePilotage(mode === 'caisses' ? 3 : n.pilotage);
    const cai = reglageCaisses(n.caisses);
    const m = mesuresVides();
    let wx = 0;
    let t = 0;
    let locoY = cheminY(0, pil.virages);
    let visee = locoY;
    let prochaine = 1.2;
    let objets: EnCours[] = [];
    const traces: Array<{ wx: number; y: number; sur: boolean }> = [];
    const fenetre = cai.fenetre * pil.vitesse;
    const debutFenetre = LOCO_X + 70;

    const dansFenetre = (o: EnCours): boolean => {
      const sx = o.wx - wx + LOCO_X;
      return !o.fini && sx <= debutFenetre + fenetre && sx >= debutFenetre - 30;
    };
    const toucher = (): void => {
      if (mode === 'pilotage') return;
      const o = objets.filter(dansFenetre).sort((a, b) => a.wx - b.wx)[0];
      if (!o) {
        m.dansLeVide++;
        return;
      }
      o.quand = t;
      if (o.cible) {
        o.fini = 'pris';
        m.cibles++;
        m.attrapees++;
        m.reactions.push(Math.round((t - o.entree) * 1000));
        bruitage.reussite();
      } else {
        o.fini = 'erreur';
        m.pieges++;
        m.piegesAttrapes++;
        bruitage.erreur();
      }
    };
    attraper.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      toucher();
    });
    const clavier = (e: KeyboardEvent): void => {
      if (e.code === 'Space') {
        e.preventDefault();
        toucher();
      }
    };
    window.addEventListener('keydown', clavier);
    const viser = (e: PointerEvent): void => {
      if (mode === 'caisses' || (e.pointerType === 'mouse' && e.buttons === 0)) return;
      const r = toile.getBoundingClientRect();
      visee = ((e.clientY - r.top) / r.height) * H;
    };
    toile.addEventListener('pointerdown', (e) => {
      toile.setPointerCapture(e.pointerId);
      viser(e);
    });
    toile.addEventListener('pointermove', viser);

    // Pour les essais sur ordinateur : l'état du jeu, lisible par un robot de test.
    if (new URLSearchParams(location.search).has('essai')) {
      (window as unknown as Record<string, unknown>).golem = {
        etat: () => ({ locoY, chemin: cheminY(wx, pil.virages), largeur: pil.largeur, aPortee: objets.filter(dansFenetre).map((o) => o.cible) }),
        viser: (y: number) => (visee = y),
        toucher,
      };
    }

    let avant = performance.now();
    const image = (maintenant: number): void => {
      const dt = Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      t += dt;
      wx += pil.vitesse * dt;
      const centre = cheminY(wx, pil.virages);
      if (mode === 'caisses') visee = centre;
      locoY += (visee - locoY) * Math.min(1, dt * 7);
      const sur = Math.abs(locoY - centre) < pil.largeur / 2;
      if (mode !== 'caisses') {
        m.temps += dt;
        if (sur) m.surChemin += dt;
      }
      traces.push({ wx, y: locoY, sur });
      while (traces.length && traces[0]!.wx < wx - LOCO_X - 40) traces.shift();

      // Les caisses arrivent sur le chemin, à droite.
      if (mode !== 'pilotage') {
        prochaine -= dt;
        if (prochaine <= 0) {
          prochaine = cai.intervalle * (0.8 + Math.random() * 0.4);
          const o = prochainObjet(cible, cai.ressemblance, Math.random);
          objets.push({ objet: o, wx: wx - LOCO_X + L + 40, cible: estLaCible(o, cible), entree: 0, fini: '', quand: 0 });
        }
        for (const o of objets) {
          const sx = o.wx - wx + LOCO_X;
          if (!o.fini && !o.entree && sx <= debutFenetre + fenetre) o.entree = t;
          if (!o.fini && sx < debutFenetre - 30) {
            o.fini = 'passe';
            o.quand = t;
            if (o.cible) m.cibles++;
            else m.pieges++;
          }
        }
        objets = objets.filter((o) => o.wx - wx + LOCO_X > -60 && !(o.fini && o.fini !== 'passe' && t - o.quand > 0.6));
      }

      // --- Le dessin ---
      if (toile.width !== Math.round(toile.getBoundingClientRect().width * Math.min(2, window.devicePixelRatio || 1))) ajuster();
      c.setTransform(toile.width / L, 0, 0, toile.height / H, 0, 0);
      // L'herbe, en carreaux.
      const dec = wx % 50;
      for (let x = -50; x < L + 50; x += 50) {
        for (let y = 0; y < H; y += 50) {
          c.fillStyle = ((Math.floor((x + wx - dec) / 50) + y / 50) & 1) === 0 ? '#9fd36b' : '#93c962';
          c.fillRect(x - dec, y, 50, 50);
        }
      }
      // Le chemin de cailloux.
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = '#cfc4b2';
      c.lineWidth = pil.largeur;
      c.beginPath();
      for (let sx = -20; sx <= L + 20; sx += 10) c.lineTo(sx, cheminY(wx - LOCO_X + sx, pil.virages));
      c.stroke();
      c.fillStyle = '#b6a993';
      for (let sx = -(wx % 37); sx <= L; sx += 37) {
        const cy = cheminY(wx - LOCO_X + sx, pil.virages);
        c.fillRect(sx, cy - pil.largeur * 0.3, 6, 6);
        c.fillRect(sx + 15, cy + pil.largeur * 0.2, 6, 6);
      }
      // Les rails posés : rouges et lumineux sur le chemin, gris à côté.
      for (let i = 1; i < traces.length; i++) {
        const a = traces[i - 1]!;
        const b = traces[i]!;
        const ax = a.wx - wx + LOCO_X;
        const bx = b.wx - wx + LOCO_X;
        c.strokeStyle = b.sur ? '#e0443a' : '#8f8f8f';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(ax, a.y - 12);
        c.lineTo(bx, b.y - 12);
        c.moveTo(ax, a.y + 12);
        c.lineTo(bx, b.y + 12);
        c.stroke();
      }
      // La portée du bras du golem.
      if (mode !== 'pilotage') {
        c.fillStyle = 'rgba(255,248,238,0.18)';
        c.fillRect(debutFenetre - 30, locoY - 70, fenetre + 30, 140);
      }
      // Les caisses.
      for (const o of objets) {
        const sx = o.wx - wx + LOCO_X;
        const sy = cheminY(o.wx, pil.virages);
        if (o.fini === 'pris') {
          const k = Math.max(0, 1 - (t - o.quand) / 0.6);
          dessinerObjet(c, o.objet, sx + (LOCO_X - sx) * (1 - k), sy + (locoY - sy) * (1 - k), k);
          continue;
        }
        if (o.fini === 'erreur') {
          // Un petit nuage : pas d'explosion, juste « pschitt ».
          const k = (t - o.quand) / 0.6;
          c.fillStyle = `rgba(160,160,160,${0.7 * (1 - k)})`;
          c.beginPath();
          c.arc(sx, sy, 20 + 30 * k, 0, 7);
          c.fill();
          continue;
        }
        c.globalAlpha = o.fini === 'passe' ? 0.4 : 1;
        dessinerObjet(c, o.objet, sx, sy - 6);
        c.globalAlpha = 1;
      }
      // Le train : la locomotive et ses wagons, le long des rails posés.
      const positions = [{ x: LOCO_X, y: locoY, a: Math.atan2(visee - locoY, 90) * 0.6 }];
      for (let k = 1; k <= Math.min(WAGONS_MAX, wagons); k++) {
        const cible = wx - 64 * k;
        const tr = traces.find((p) => p.wx >= cible) ?? traces[0];
        if (tr) positions.push({ x: tr.wx - wx + LOCO_X, y: tr.y, a: 0 });
      }
      dessinerTrain(c, positions, t);
      // En haut : la manche, le temps, et ce qu'il faut attraper.
      c.fillStyle = 'rgba(255,248,238,0.9)';
      c.beginPath();
      c.roundRect(16, 14, 330, 54, 18);
      c.fill();
      c.fillStyle = '#4a3833';
      c.font = '700 22px Andika, system-ui, sans-serif';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(entete, 32, 33);
      c.fillStyle = '#e3dccd';
      c.fillRect(32, 50, 296, 8);
      c.fillStyle = '#8acb52';
      c.fillRect(32, 50, 296 * Math.max(0, 1 - t / duree), 8);
      if (mode !== 'pilotage') {
        c.fillStyle = 'rgba(255,248,238,0.9)';
        c.beginPath();
        c.roundRect(L - 120, 14, 104, 74, 18);
        c.fill();
        dessinerObjet(c, { sorte: 'minerai', ...cible }, L - 68, 51);
      }
      if (t >= duree) {
        window.removeEventListener('keydown', clavier);
        fini(m);
      } else requestAnimationFrame(image);
    };
    requestAnimationFrame(image);
  });
}

// --- Le déroulé d'une partie -------------------------------------------------------------------

function carte(f: HTMLElement, contenu: HTMLElement[], boutons: string[]): Promise<number> {
  return new Promise((ok) => {
    const s = creer('section', 'exercice');
    const actions = creer('div', 'exercice-actions');
    boutons.forEach((libelle, i) => {
      const b = bouton(i === boutons.length - 1 ? 'bouton-principal' : 'bouton-secondaire', libelle);
      b.addEventListener('click', () => {
        bruitage.touche();
        ok(i);
      });
      actions.append(b);
    });
    s.append(creer('p', 'exercice-titre', T.titre), ...contenu, actions);
    f.replaceChildren(s);
  });
}

function nomCible(c: Cible): string {
  return remplir(T.formes[c.forme][1]!, { matiere: T.matieres[c.matiere] });
}

function imageObjet(o: Objet): HTMLCanvasElement {
  const t = creer('canvas', 'golem-objet');
  t.width = 120;
  t.height = 120;
  const c = t.getContext('2d')!;
  dessinerObjet(c, o, 60, 60, 2);
  return t;
}

/** Une partie : l'échauffement (une fois par jour), puis les manches. */
export async function jouerGolem(f: HTMLElement): Promise<void> {
  let s = lire();
  if ((await carte(f, [texteALire(T.presentation)], [T.sortir, T.cestParti])) === 0) return;
  const jour = aujourdhui();
  if (s.echauffement !== jour) {
    const cible = tireCible(Math.random);
    await carte(f, [texteALire(T.echauffePilotage)], [T.cestParti]);
    const mp = await courir(f, 'pilotage', s.niveaux, cible, DUREE_ECHAUFFEMENT, s.wagons, T.echauffement);
    s.resultats.push(resultat(jour, 'pilotage', s.niveaux, mp));
    await carte(f, [texteALire(T.echauffeCaisses), texteALire(remplir(T.regle, { cible: nomCible(cible) })), imageObjet({ sorte: 'minerai', ...cible })], [T.cestParti]);
    const mc = await courir(f, 'caisses', s.niveaux, cible, DUREE_ECHAUFFEMENT, s.wagons, T.echauffement);
    s.resultats.push(resultat(jour, 'caisses', s.niveaux, mc));
    s.echauffement = jour;
    ecrire(s);
  }
  for (let i = 1; i <= s.manches; i++) {
    const cible = tireCible(Math.random);
    const entete = remplir(T.mancheN, { n: i, total: s.manches });
    const regle = [creer('p', 'golem-chef', T.chefDeGare), imageObjet({ sorte: 'minerai', ...cible }), texteALire(remplir(T.regle, { cible: nomCible(cible) })), texteALire(T.jamaisTnt)];
    if ((await carte(f, regle, [T.sortir, T.cestParti])) === 0) return;
    const m = await courir(f, 'double', s.niveaux, cible, DUREE_MANCHE, s.wagons, entete);
    const a = ajuster(s.niveaux, m, s.difficiles);
    s = lire();
    s.resultats.push(resultat(jour, 'double', s.niveaux, m));
    s.niveaux = a.niveaux;
    s.difficiles = a.difficiles;
    if (a.etoile) s.wagons = Math.min(WAGONS_MAX, s.wagons + 1);
    ecrire(s);
    const textes = [remplir(T.bilanManche, { pilotage: Math.round(100 * reussitePilotage(m)), caisses: Math.round(100 * reussiteCaisses(m)) })];
    textes.push(a.etoile ? T.etoile : T.presque);
    if (a.monte.pilotage) textes.push(T.plusVite);
    if (a.monte.caisses) textes.push(T.plusMalin);
    if (a.descend) textes.push(T.plusDoux);
    if (a.etoile) {
      bruitage.finDeManche();
      confettis();
    }
    const derniere = i === s.manches;
    if ((await carte(f, textes.map((x) => texteALire(x)), derniere ? [T.continuer] : [T.sortir, T.continuer])) === 0 && !derniere) return;
  }
  bruitage.finDeManche();
  await carte(f, [texteALire(s.wagons === 0 ? T.finZero : s.wagons === 1 ? T.finUn : remplir(T.fin, { wagons: s.wagons }))], [T.continuer]);
}

/** Pour le parent : les résultats des manches, et le nombre de manches par partie. */
export function voirResultats(f: HTMLElement): Promise<void> {
  return new Promise((fini) => {
    const s = lire();
    const carteR = creer('section', 'exercice golem-resultats');
    const reglage = creer('label', 'golem-reglage', `${T.parent.manches} : `);
    const choix = creer('select');
    for (const n of [1, 2, 3, 4, 5, 6, 8, 10]) {
      const o = creer('option', '', String(n));
      o.value = String(n);
      o.selected = n === s.manches;
      choix.append(o);
    }
    choix.addEventListener('change', () => {
      const s2 = lire();
      s2.manches = Number(choix.value);
      ecrire(s2);
    });
    reglage.append(choix);
    const tableau = creer('table', 'golem-tableau');
    const tete = creer('tr');
    for (const col of T.parent.colonnes) tete.append(creer('th', '', col));
    tableau.append(tete);
    for (const r of [...s.resultats].reverse().slice(0, 40)) {
      const l = creer('tr', r.sorte === 'double' ? '' : 'echauffement');
      const date = r.sorte === 'double' ? r.date : `${r.date} (${r.sorte === 'pilotage' ? T.parent.seulChemin : T.parent.seulesCaisses})`;
      for (const v of [date, r.niveaux.pilotage, r.niveaux.caisses, r.sorte === 'caisses' ? '–' : `${r.pilotage} %`, r.sorte === 'pilotage' ? '–' : `${r.caisses} %`, r.oubliees, r.erreurs, r.reaction ? `${r.reaction} ms` : '–', r.regularite ? `${r.regularite} ms` : '–']) l.append(creer('td', '', String(v)));
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
      ecrire({ ...neuve(), manches: lire().manches });
      fini();
    });
    const fermer = bouton('bouton-principal', T.parent.fermer);
    fermer.addEventListener('click', () => fini());
    const actions = creer('div', 'exercice-actions');
    actions.append(effacer, fermer);
    carteR.append(
      creer('p', 'exercice-titre', T.parent.titre),
      reglage,
      s.resultats.length ? tableau : creer('p', '', T.parent.aucun),
      creer('p', 'golem-aide', T.parent.aide),
      creer('p', 'golem-aide', remplir(T.parent.niveaux, { ...s.niveaux, wagons: s.wagons })),
      actions,
    );
    f.replaceChildren(carteR);
  });
}
