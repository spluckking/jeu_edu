// Les stands de détente (jeu libre) : autos tamponneuses, trampoline, palais des glaces.
// Pas de chrono, pas de score qui baisse, pas d'échec : on joue tant qu'on veut et on
// revient à la fête quand on veut. Dessinés dans une toile 2D, dans le style de la fête.

import type { IdDetente } from '../scene/fete.ts';
import { bruitage } from '../son/bruitages.ts';

const COULEURS = ['#ff5a6e', '#4cc4ff', '#ffd447', '#6fcf4a', '#b48cf2'];
const TITRES: Record<IdDetente, [string, string]> = {
  autos: ['Les autos tamponneuses', 'Touche la piste pour conduire. Attrape les étoiles !'],
  trampoline: ['Le trampoline', 'Touche l’écran juste quand tu touches la toile pour sauter plus haut.'],
  glaces: ['Le palais des glaces', 'Trouve le chemin jusqu’à l’étoile. Touche une case à côté de toi pour avancer.'],
};

interface Jeu {
  dessiner(c: CanvasRenderingContext2D, l: number, h: number, dt: number): void;
  toucher(x: number, y: number, l: number, h: number): void;
}

function etoile(c: CanvasRenderingContext2D, x: number, y: number, r: number, couleur = '#ffd447'): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = couleur;
  c.fill();
}

// --- Autos tamponneuses ------------------------------------------------------------------
function autos(message: (t: string) => void): Jeu {
  const voitures = COULEURS.slice(0, 4).map((couleur, i) => ({
    x: 0.2 + i * 0.2,
    y: 0.3 + (i % 2) * 0.4,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    couleur,
  }));
  const moi = voitures[0] ?? { x: 0.5, y: 0.5, vx: 0, vy: 0, couleur: '#ff5a6e' };
  let but = { x: moi.x, y: moi.y };
  let piece = { x: 0.7, y: 0.6 };
  let etoiles = 0;
  let bonk = 0;
  return {
    toucher(x, y, l, h) {
      but = { x: x / l, y: y / h };
    },
    dessiner(c, l, h, dt) {
      c.fillStyle = '#4a4f6a';
      c.fillRect(0, 0, l, h);
      c.strokeStyle = '#ffd447';
      c.lineWidth = 8;
      c.strokeRect(6, 6, l - 12, h - 12);
      // Ma voiture va vers le doigt ; les autres roulent et rebondissent.
      moi.vx += (but.x - moi.x) * 2.5 * dt;
      moi.vy += (but.y - moi.y) * 2.5 * dt;
      moi.vx *= 0.94;
      moi.vy *= 0.94;
      for (const v of voitures) {
        v.x += v.vx * dt;
        v.y += v.vy * dt;
        if (v.x < 0.06 || v.x > 0.94) v.vx *= -1;
        if (v.y < 0.08 || v.y > 0.92) v.vy *= -1;
        v.x = Math.min(0.94, Math.max(0.06, v.x));
        v.y = Math.min(0.92, Math.max(0.08, v.y));
      }
      // Un petit choc doux entre deux voitures.
      for (const a of voitures) {
        for (const b of voitures) {
          if (a === b) continue;
          const dx = (b.x - a.x) * l;
          const dy = (b.y - a.y) * h;
          if (Math.hypot(dx, dy) < 60) {
            const n = Math.hypot(dx, dy) || 1;
            a.vx -= (dx / n) * 0.05;
            a.vy -= (dy / n) * 0.05;
            if ((a === moi || b === moi) && bonk <= 0) {
              bruitage.son('tamponneuse', 0.8);
              bonk = 0.5;
            }
          }
        }
      }
      bonk -= dt;
      if (Math.hypot((piece.x - moi.x) * l, (piece.y - moi.y) * h) < 50) {
        etoiles++;
        bruitage.son('etoile');
        piece = { x: 0.1 + Math.random() * 0.8, y: 0.15 + Math.random() * 0.7 };
        message(etoiles % 10 === 0 ? `Bravo, ${etoiles} étoiles !` : `Étoiles : ${etoiles}`);
      }
      etoile(c, piece.x * l, piece.y * h, 22);
      for (const v of voitures) {
        c.save();
        c.translate(v.x * l, v.y * h);
        c.rotate(Math.atan2(v.vy, v.vx));
        c.fillStyle = '#2b2233';
        c.beginPath();
        c.roundRect(-30, -22, 60, 44, 14);
        c.fill();
        c.fillStyle = v.couleur;
        c.beginPath();
        c.roundRect(-24, -17, 48, 34, 10);
        c.fill();
        if (v === moi) {
          c.fillStyle = '#ffd0b0';
          c.beginPath();
          c.arc(-2, 0, 9, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    },
  };
}

// --- Trampoline ----------------------------------------------------------------------------
function trampoline(message: (t: string) => void): Jeu {
  let hauteur = 2;
  let record = 2;
  let t = 0;
  let periode = 1.1;
  let dejaTouche = false;
  return {
    toucher() {
      // Bien tombé : près du bas du saut.
      const phase = (t % periode) / periode;
      const pres = phase < 0.12 || phase > 0.88;
      if (dejaTouche) return;
      dejaTouche = true;
      if (pres) {
        hauteur = Math.min(8, hauteur + 1);
        bruitage.son('boing', 0.8);
        if (hauteur > record) {
          record = hauteur;
          message(hauteur === 8 ? 'Tout là-haut, bravo !' : `Plus haut ! Hauteur ${hauteur}`);
        }
      } else {
        bruitage.son('boing-rate', 0.6);
      }
    },
    dessiner(c, l, h, dt) {
      t += dt;
      periode = 0.8 + hauteur * 0.12;
      const phase = (t % periode) / periode;
      if (phase < dt / periode) dejaTouche = false;
      const ciel = c.createLinearGradient(0, 0, 0, h);
      ciel.addColorStop(0, '#3fa0ff');
      ciel.addColorStop(1, '#cfeeff');
      c.fillStyle = ciel;
      c.fillRect(0, 0, l, h);
      for (let i = 1; i <= 8; i++) {
        const y = h - 90 - (i * (h - 160)) / 8;
        c.fillStyle = i <= record ? '#ffd447' : 'rgba(255,255,255,0.5)';
        etoile(c, l - 40, y, 12, c.fillStyle as string);
      }
      // Le trampoline.
      c.fillStyle = '#2b2233';
      c.fillRect(l / 2 - 120, h - 60, 240, 14);
      c.fillStyle = '#4c9cff';
      c.fillRect(l / 2 - 110, h - 70, 220, 10);
      const saut = Math.sin(phase * Math.PI);
      const y = h - 100 - saut * ((h - 180) * hauteur) / 8;
      c.fillStyle = '#ff5a6e';
      c.beginPath();
      c.arc(l / 2, y, 28, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffd0b0';
      c.beginPath();
      c.arc(l / 2, y - 40, 20, 0, Math.PI * 2);
      c.fill();
      // Le moment où toucher : la toile s'éclaire.
      if (phase < 0.12 || phase > 0.88) {
        c.fillStyle = 'rgba(111, 207, 74, 0.55)';
        c.fillRect(l / 2 - 110, h - 74, 220, 18);
      }
    },
  };
}

// --- Palais des glaces : un labyrinthe ------------------------------------------------------
function labyrinthe(colonnes: number, lignes: number): boolean[][][] {
  // murs[y][x] = [haut, droite, bas, gauche] ; on creuse en profondeur.
  const murs = Array.from({ length: lignes }, () => Array.from({ length: colonnes }, () => [true, true, true, true]));
  const vu = Array.from({ length: lignes }, () => Array.from({ length: colonnes }, () => false));
  const pile: Array<[number, number]> = [[0, 0]];
  (vu[0] as boolean[])[0] = true;
  const DIRS: Array<[number, number, number, number]> = [
    [0, -1, 0, 2],
    [1, 0, 1, 3],
    [0, 1, 2, 0],
    [-1, 0, 3, 1],
  ];
  while (pile.length > 0) {
    const [x, y] = pile[pile.length - 1] as [number, number];
    const voisins = DIRS.filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < colonnes && ny < lignes && !vu[ny]?.[nx];
    });
    if (voisins.length === 0) {
      pile.pop();
      continue;
    }
    const [dx, dy, m, n] = voisins[Math.floor(Math.random() * voisins.length)] as [number, number, number, number];
    (murs[y]?.[x] as boolean[])[m] = false;
    (murs[y + dy]?.[x + dx] as boolean[])[n] = false;
    (vu[y + dy] as boolean[])[x + dx] = true;
    pile.push([x + dx, y + dy]);
  }
  return murs;
}

function glaces(message: (t: string) => void): Jeu {
  let colonnes = 5;
  let lignes = 4;
  let murs = labyrinthe(colonnes, lignes);
  let moi = { x: 0, y: 0 };
  const taille = (l: number, h: number): { case_: number; ox: number; oy: number } => {
    const case_ = Math.min((l - 40) / colonnes, (h - 40) / lignes);
    return { case_, ox: (l - case_ * colonnes) / 2, oy: (h - case_ * lignes) / 2 };
  };
  return {
    toucher(x, y, l, h) {
      const { case_, ox, oy } = taille(l, h);
      const cx = Math.floor((x - ox) / case_);
      const cy = Math.floor((y - oy) / case_);
      const dx = cx - moi.x;
      const dy = cy - moi.y;
      if (Math.abs(dx) + Math.abs(dy) !== 1) return;
      const m = dy === -1 ? 0 : dx === 1 ? 1 : dy === 1 ? 2 : 3;
      if (murs[moi.y]?.[moi.x]?.[m]) {
        bruitage.son('mur', 0.6);
        return;
      }
      moi = { x: cx, y: cy };
      bruitage.son('pas', 0.5);
      if (cx === colonnes - 1 && cy === lignes - 1) {
        bruitage.finDeManche();
        message('Bravo, tu as trouvé la sortie ! Un palais plus grand t’attend.');
        colonnes = Math.min(9, colonnes + 1);
        lignes = Math.min(6, lignes + (colonnes % 2));
        murs = labyrinthe(colonnes, lignes);
        moi = { x: 0, y: 0 };
      }
    },
    dessiner(c, l, h) {
      c.fillStyle = '#e8f6ff';
      c.fillRect(0, 0, l, h);
      const { case_, ox, oy } = taille(l, h);
      for (let y = 0; y < lignes; y++) {
        for (let x = 0; x < colonnes; x++) {
          const px = ox + x * case_;
          const py = oy + y * case_;
          c.fillStyle = (x + y) % 2 === 0 ? '#cfefff' : '#dff4ff';
          c.fillRect(px, py, case_, case_);
          // Les cases où l'on peut aller s'éclairent.
          const dx = x - moi.x;
          const dy = y - moi.y;
          if (Math.abs(dx) + Math.abs(dy) === 1) {
            const m = dy === -1 ? 0 : dx === 1 ? 1 : dy === 1 ? 2 : 3;
            if (!murs[moi.y]?.[moi.x]?.[m]) {
              c.fillStyle = 'rgba(111, 207, 74, 0.35)';
              c.fillRect(px + 4, py + 4, case_ - 8, case_ - 8);
            }
          }
          c.strokeStyle = '#6b5f7d';
          c.lineWidth = 6;
          c.lineCap = 'round';
          const [haut, droite, bas, gauche] = murs[y]?.[x] ?? [];
          c.beginPath();
          if (haut) c.moveTo(px, py), c.lineTo(px + case_, py);
          if (droite) c.moveTo(px + case_, py), c.lineTo(px + case_, py + case_);
          if (bas) c.moveTo(px, py + case_), c.lineTo(px + case_, py + case_);
          if (gauche) c.moveTo(px, py), c.lineTo(px, py + case_);
          c.stroke();
        }
      }
      etoile(c, ox + (colonnes - 0.5) * case_, oy + (lignes - 0.5) * case_, case_ * 0.32);
      c.fillStyle = '#ff5a6e';
      c.beginPath();
      c.arc(ox + (moi.x + 0.5) * case_, oy + (moi.y + 0.5) * case_, case_ * 0.28, 0, Math.PI * 2);
      c.fill();
    },
  };
}

/** Ouvre un stand de détente ; se résout quand l'enfant revient à la fête. */
export function jouerDetente(id: IdDetente): Promise<void> {
  return new Promise((fini) => {
    const fond = document.createElement('div');
    fond.className = 'vitrine-fond';
    const carte = document.createElement('div');
    carte.className = 'detente';
    const [titreTexte, consigneTexte] = TITRES[id];
    const titre = document.createElement('p');
    titre.className = 'lecture-titre';
    titre.textContent = titreTexte;
    const consigne = document.createElement('p');
    consigne.className = 'lecture-texte';
    consigne.textContent = consigneTexte;
    const toile = document.createElement('canvas');
    toile.className = 'detente-toile';
    const retour = document.createElement('button');
    retour.type = 'button';
    retour.className = 'bouton-principal';
    retour.textContent = 'Retour à la fête';
    carte.append(titre, consigne, toile, retour);
    fond.append(carte);
    document.body.append(fond);

    const message = (t: string): void => {
      consigne.textContent = t;
    };
    const jeu = id === 'autos' ? autos(message) : id === 'trampoline' ? trampoline(message) : glaces(message);
    const c = toile.getContext('2d');
    let actif = true;
    let avant = performance.now();
    const boucle = (maintenant: number): void => {
      if (!actif || !c) return;
      const dt = Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      const echelle = Math.min(window.devicePixelRatio, 2);
      const l = toile.clientWidth;
      const h = toile.clientHeight;
      if (toile.width !== Math.round(l * echelle)) {
        toile.width = Math.round(l * echelle);
        toile.height = Math.round(h * echelle);
      }
      c.setTransform(echelle, 0, 0, echelle, 0, 0);
      jeu.dessiner(c, l, h, dt);
      requestAnimationFrame(boucle);
    };
    requestAnimationFrame(boucle);
    const pointeur = (e: PointerEvent): void => {
      const r = toile.getBoundingClientRect();
      jeu.toucher(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    };
    toile.addEventListener('pointerdown', pointeur);
    toile.addEventListener('pointermove', (e) => {
      if (id === 'autos' && e.buttons > 0) pointeur(e);
    });
    retour.addEventListener('click', () => {
      bruitage.touche();
      actif = false;
      fond.remove();
      fini();
    });
  });
}
