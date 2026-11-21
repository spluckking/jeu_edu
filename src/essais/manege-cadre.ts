// Le cadre commun des manèges en 2D : la consigne, une partie chronométrée dans une toile
// (1000 × 600 points, mise à l'échelle de l'écran), puis le bilan. On ne perd jamais : on compte
// seulement ce qu'on a attrapé.

import T from '../../content/fete/essais.json';
import { bruitage } from '../son/bruitages.ts';
import { confettis } from '../ui/confettis.ts';
import { bouton, creer, remplir, texteALire } from '../ville/interface.ts';

export const L = 1000;
export const H = 600;

/** Le doigt (ou le stylet) : appuyé ou non, où, et s'il vient de toucher. */
export interface Entree {
  appui: boolean;
  x: number;
  y: number;
  /** Vrai une seule image, quand le doigt se pose. */
  tape: boolean;
}

export interface Jeu {
  maj(dt: number, e: Entree, t: number): void;
  dessiner(c: CanvasRenderingContext2D, t: number): void;
  score(): number;
}

export interface Manege {
  id: string;
  titre: string;
  consigne: string;
  bilan: string;
  /** Durée d'une partie, en secondes. */
  duree: number;
  creer(hasard: () => number): Jeu;
}

/** Une partie dans la toile ; se résout avec le score. */
function partie(f: HTMLElement, m: Manege): Promise<number> {
  return new Promise((fini) => {
    const toile = creer('canvas', 'manege-toile');
    const cadre = creer('section', 'manege');
    cadre.append(toile);
    f.replaceChildren(cadre);
    const c = toile.getContext('2d')!;
    const ajuster = (): void => {
      const r = toile.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      toile.width = Math.round(r.width * dpr);
      toile.height = Math.round(r.height * dpr);
    };
    ajuster();
    const e: Entree = { appui: false, x: 0, y: 0, tape: false };
    const placer = (ev: PointerEvent): void => {
      const r = toile.getBoundingClientRect();
      e.x = ((ev.clientX - r.left) / r.width) * L;
      e.y = ((ev.clientY - r.top) / r.height) * H;
    };
    toile.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      toile.setPointerCapture(ev.pointerId);
      placer(ev);
      e.appui = true;
      e.tape = true;
    });
    toile.addEventListener('pointermove', placer);
    const lacher = (): void => {
      e.appui = false;
    };
    toile.addEventListener('pointerup', lacher);
    toile.addEventListener('pointercancel', lacher);

    const jeu = m.creer(Math.random);
    let avant = performance.now();
    let t = 0;
    const image = (maintenant: number): void => {
      const dt = Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      t += dt;
      jeu.maj(dt, e, t);
      e.tape = false;
      if (toile.width !== Math.round(toile.getBoundingClientRect().width * Math.min(2, window.devicePixelRatio || 1))) ajuster();
      c.setTransform(toile.width / L, 0, 0, toile.height / H, 0, 0);
      jeu.dessiner(c, t);
      // Le temps qui reste (une barre en haut) et le score.
      c.fillStyle = 'rgba(255,248,238,0.85)';
      c.beginPath();
      c.roundRect(20, 18, 300, 22, 11);
      c.fill();
      c.fillStyle = '#8acb52';
      c.beginPath();
      c.roundRect(20, 18, 300 * Math.max(0, 1 - t / m.duree), 22, 11);
      c.fill();
      c.fillStyle = 'rgba(255,248,238,0.92)';
      c.beginPath();
      c.roundRect(L - 130, 12, 110, 48, 24);
      c.fill();
      c.fillStyle = '#4a3833';
      c.font = '700 30px Andika, system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(jeu.score()), L - 75, 37);
      if (t >= m.duree) fini(jeu.score());
      else requestAnimationFrame(image);
    };
    requestAnimationFrame(image);
  });
}

/** Le manège : la consigne, la partie, le bilan ; « Encore » ou « Sortir ». */
export async function jouerManege(f: HTMLElement, m: Manege): Promise<void> {
  const carte = (contenu: HTMLElement[], boutons: string[]): Promise<number> =>
    new Promise((ok) => {
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
      s.append(creer('p', 'exercice-titre', m.titre), ...contenu, actions);
      f.replaceChildren(s);
    });
  if ((await carte([texteALire(m.consigne)], [T.commun.sortir, T.commun.cestParti])) === 0) return;
  for (;;) {
    const score = await partie(f, m);
    bruitage.finDeManche();
    if (score > 0) confettis();
    if ((await carte([texteALire(remplir(m.bilan, { n: score }))], [T.commun.sortir, T.commun.encore])) === 0) return;
  }
}

// --- Petits outils de dessin -------------------------------------------------------------------

export function ciel(c: CanvasRenderingContext2D, haut: string, bas: string): void {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, haut);
  g.addColorStop(1, bas);
  c.fillStyle = g;
  c.fillRect(0, 0, L, H);
}

export function nuage(c: CanvasRenderingContext2D, x: number, y: number, k = 1): void {
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.arc(x, y, 26 * k, 0, 7);
  c.arc(x + 30 * k, y - 12 * k, 32 * k, 0, 7);
  c.arc(x + 64 * k, y, 24 * k, 0, 7);
  c.fill();
}

export function etoile(c: CanvasRenderingContext2D, x: number, y: number, r: number, couleur: string): void {
  c.fillStyle = couleur;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 2 * Math.PI - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  c.closePath();
  c.fill();
}

/** Des étincelles quand on attrape quelque chose. */
export class Etincelles {
  private l: Array<{ x: number; y: number; vx: number; vy: number; vie: number; couleur: string }> = [];
  jaillir(x: number, y: number, couleur: string): void {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 2 * Math.PI;
      this.l.push({ x, y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, vie: 0.5, couleur });
    }
  }
  maj(dt: number): void {
    for (const p of this.l) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vie -= dt;
    }
    this.l = this.l.filter((p) => p.vie > 0);
  }
  dessiner(c: CanvasRenderingContext2D): void {
    for (const p of this.l) {
      c.globalAlpha = Math.max(0, p.vie * 2);
      c.fillStyle = p.couleur;
      c.beginPath();
      c.arc(p.x, p.y, 6, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
  }
}
