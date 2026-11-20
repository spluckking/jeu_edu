// Les essais de manèges : cinq jeux de détente en 2D (le carrousel, les chaises volantes, les
// tasses, le bateau pirate, le petit grand huit). On ne perd jamais ; on compte ce qu'on attrape.

import T from '../../content/fete/essais.json';
import { bruitage } from '../son/bruitages.ts';
import { ciel, etoile, Etincelles, H, L, nuage, type Jeu, type Manege } from './manege-cadre.ts';
import { balancer, dansLeVert, ecartAngle, hauteurPiste, hauteurSaut, pousser, rouler, sommets, TASSE_VERT, tourner, type Pendule } from './physique-maneges.ts';

const COULEURS = ['#f27a8e', '#ffc94a', '#6aa8ef', '#8acb52', '#c58ce8', '#ff9f5a'];

// --- Le carrousel : attraper les anneaux -------------------------------------------------------

const carrousel: Manege = {
  id: 'carrousel',
  ...T.carrousel,
  duree: 45,
  creer(hasard): Jeu {
    const X = 300;
    let points = 0;
    let bras = 0; // le temps qui reste au bras tendu
    let prochain = 0.6;
    let anneaux: Array<{ x: number; y: number; or: boolean; pris: boolean }> = [];
    const etincelles = new Etincelles();
    const chevalY = (t: number): number => 360 + 70 * Math.sin(t * 2.2);
    const main = (t: number): { x: number; y: number } => ({ x: X + 40, y: chevalY(t) - (bras > 0 ? 175 : 120) });
    return {
      score: () => points,
      maj(dt, e, t) {
        if (e.tape && bras <= 0) {
          bras = 0.35;
          bruitage.touche();
        }
        bras -= dt;
        prochain -= dt;
        if (prochain <= 0) {
          prochain = 1 + hasard() * 0.6;
          anneaux.push({ x: L + 40, y: 150 + hasard() * 170, or: hasard() < 0.15, pris: false });
        }
        const m = main(t);
        for (const a of anneaux) {
          a.x -= 200 * dt;
          if (!a.pris && bras > 0 && Math.hypot(a.x - m.x, a.y - m.y) < 42) {
            a.pris = true;
            points += a.or ? 3 : 1;
            etincelles.jaillir(a.x, a.y, a.or ? '#ffc94a' : '#fff');
            bruitage.reussite();
          }
        }
        anneaux = anneaux.filter((a) => a.x > -60 && !a.pris);
        etincelles.maj(dt);
      },
      dessiner(c, t) {
        ciel(c, '#ffd9e6', '#fff1d6');
        // Les lumières de la fête qui défilent derrière.
        for (let i = 0; i < 14; i++) {
          const x = (((i * 90 - t * 60) % 1260) + 1260) % 1260 - 130;
          c.fillStyle = COULEURS[i % COULEURS.length]!;
          c.globalAlpha = 0.35;
          c.beginPath();
          c.arc(x, 470 + 20 * Math.sin(i), 34, 0, 7);
          c.fill();
        }
        c.globalAlpha = 1;
        // Le toit rayé du carrousel.
        for (let i = 0; i < 12; i++) {
          c.fillStyle = i % 2 ? '#fff8ee' : '#f27a8e';
          c.fillRect(i * (L / 12), 0, L / 12, 70);
        }
        c.fillStyle = '#ffc94a';
        for (let i = 0; i < 24; i++) {
          c.beginPath();
          c.arc(i * (L / 24) + 20, 72, 20, 0, Math.PI);
          c.fill();
        }
        // Les anneaux qui pendent à leur ficelle.
        for (const a of anneaux) {
          c.strokeStyle = '#7a6458';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(a.x, 92);
          c.lineTo(a.x, a.y - 24);
          c.stroke();
          c.strokeStyle = a.or ? '#f0b323' : '#b9bec6';
          c.lineWidth = 9;
          c.beginPath();
          c.arc(a.x, a.y, 22, 0, 7);
          c.stroke();
        }
        // Le cheval, sur sa barre dorée.
        const y = chevalY(t);
        c.fillStyle = '#e9c15a';
        c.fillRect(X - 6, 90, 12, 480);
        c.fillStyle = '#fff';
        c.beginPath();
        c.ellipse(X, y, 95, 45, 0, 0, 7);
        c.fill();
        c.beginPath();
        c.ellipse(X + 95, y - 55, 32, 55, 0.5, 0, 7);
        c.fill();
        c.fillStyle = '#c58ce8';
        c.beginPath();
        c.ellipse(X + 70, y - 80, 14, 40, 0.5, 0, 7);
        c.fill();
        c.fillStyle = '#4a3833';
        c.beginPath();
        c.arc(X + 108, y - 70, 5, 0, 7);
        c.fill();
        c.strokeStyle = '#fff';
        c.lineWidth = 14;
        c.lineCap = 'round';
        for (const [dx, a] of [[-60, 0.3], [-30, -0.2], [40, 0.2], [70, -0.3]] as const) {
          c.beginPath();
          c.moveTo(X + dx, y + 30);
          c.lineTo(X + dx + Math.sin(t * 4.4 + a * 10) * 12, y + 85);
          c.stroke();
        }
        c.fillStyle = '#f27a8e';
        c.fillRect(X - 30, y - 50, 60, 18);
        // L'enfant, et son bras (tendu quand on touche).
        c.fillStyle = '#6aa8ef';
        c.beginPath();
        c.roundRect(X - 22, y - 120, 44, 70, 14);
        c.fill();
        c.fillStyle = '#f5cfa8';
        c.beginPath();
        c.arc(X, y - 140, 24, 0, 7);
        c.fill();
        const m = main(t);
        c.strokeStyle = '#f5cfa8';
        c.lineWidth = 12;
        c.beginPath();
        c.moveTo(X + 14, y - 105);
        c.lineTo(m.x, m.y);
        c.stroke();
        c.fillStyle = '#f5cfa8';
        c.beginPath();
        c.arc(m.x, m.y, 12, 0, 7);
        c.fill();
        etincelles.dessiner(c);
      },
    };
  },
};

// --- Les chaises volantes : éclater les ballons ------------------------------------------------

const chaises: Manege = {
  id: 'chaises',
  ...T.chaises,
  duree: 45,
  creer(hasard): Jeu {
    const X = 300;
    let y = 380;
    let vy = 0;
    let points = 0;
    let prochain = 0.5;
    let ballons: Array<{ x: number; y: number; phase: number; couleur: string }> = [];
    const etincelles = new Etincelles();
    return {
      score: () => points,
      maj(dt, e, t) {
        // Appuyer fait monter, lâcher fait descendre : en douceur.
        vy += (e.appui ? -1100 : 700) * dt;
        vy = Math.max(-420, Math.min(380, vy * Math.exp(-1.2 * dt)));
        y += vy * dt;
        if (y < 140 || y > 520) {
          y = Math.max(140, Math.min(520, y));
          vy = 0;
        }
        prochain -= dt;
        if (prochain <= 0) {
          prochain = 0.7 + hasard() * 0.6;
          ballons.push({ x: L + 40, y: 150 + hasard() * 360, phase: hasard() * 6, couleur: COULEURS[Math.floor(hasard() * COULEURS.length)]! });
        }
        const cy = y + 10 * Math.sin(t * 3);
        ballons = ballons.filter((b) => {
          b.x -= 230 * dt;
          const by = b.y + 14 * Math.sin(t * 2 + b.phase);
          if (Math.hypot(b.x - X, by - cy) < 60) {
            points++;
            etincelles.jaillir(b.x, by, b.couleur);
            bruitage.reussite();
            return false;
          }
          return b.x > -50;
        });
        etincelles.maj(dt);
      },
      dessiner(c, t) {
        ciel(c, '#8fd0f5', '#e8f7ff');
        for (let i = 0; i < 5; i++) nuage(c, ((((i * 260 - t * 40) % 1300) + 1300) % 1300) - 150, 90 + (i % 3) * 140, 0.9 + (i % 2) * 0.4);
        c.fillStyle = '#9fd36b';
        c.beginPath();
        c.ellipse(L / 2, H + 120, 800, 200, 0, 0, 7);
        c.fill();
        for (const b of ballons) {
          const by = b.y + 14 * Math.sin(t * 2 + b.phase);
          c.strokeStyle = '#7a6458';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(b.x, by + 34);
          c.quadraticCurveTo(b.x + 8, by + 60, b.x, by + 80);
          c.stroke();
          c.fillStyle = b.couleur;
          c.beginPath();
          c.ellipse(b.x, by, 28, 34, 0, 0, 7);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.5)';
          c.beginPath();
          c.ellipse(b.x - 9, by - 12, 7, 11, -0.4, 0, 7);
          c.fill();
        }
        // La chaîne qui monte jusqu'au toit du manège, et la chaise.
        const cy = y + 10 * Math.sin(t * 3);
        c.strokeStyle = '#9aa1ab';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(X - 120, -10);
        c.lineTo(X - 14, cy - 40);
        c.moveTo(X - 90, -10);
        c.lineTo(X + 14, cy - 40);
        c.stroke();
        c.fillStyle = '#f27a8e';
        c.beginPath();
        c.roundRect(X - 34, cy - 10, 68, 40, 10);
        c.fill();
        c.fillStyle = '#6aa8ef';
        c.beginPath();
        c.roundRect(X - 18, cy - 50, 36, 46, 12);
        c.fill();
        c.fillStyle = '#f5cfa8';
        c.beginPath();
        c.arc(X, cy - 66, 20, 0, 7);
        c.fill();
        c.strokeStyle = '#f5cfa8';
        c.lineWidth = 10;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(X + 6, cy + 24);
        c.lineTo(X + 40, cy + 44);
        c.stroke();
        etincelles.dessiner(c);
      },
    };
  },
};

// --- Les tasses : garder la vitesse dans le vert -----------------------------------------------

const tasses: Manege = {
  id: 'tasses',
  ...T.tasses,
  duree: 40,
  creer(): Jeu {
    const CX = L / 2;
    const CY = 300;
    let angle = 0;
    let w = 0;
    let dernier: number | null = null;
    let dansVert = 0;
    let avaitVert = false;
    return {
      score: () => Math.floor(dansVert),
      maj(dt, e) {
        let elan: number | null = null;
        if (e.appui) {
          const a = Math.atan2(e.y - CY, e.x - CX);
          if (dernier !== null && dt > 0) elan = ecartAngle(dernier, a) / dt;
          dernier = a;
        } else dernier = null;
        w = tourner(w, dt, elan);
        angle += w * dt;
        const vert = dansLeVert(w);
        if (vert) dansVert += dt;
        if (vert && !avaitVert) bruitage.touche();
        avaitVert = vert;
      },
      dessiner(c, t) {
        ciel(c, '#fff1d6', '#ffd9e6');
        // Le plateau, et les autres tasses qui tournent tranquillement.
        c.fillStyle = '#f7e2c8';
        c.beginPath();
        c.ellipse(CX, CY, 460, 250, 0, 0, 7);
        c.fill();
        for (let i = 0; i < 4; i++) {
          const a = t * 0.4 + (i * Math.PI) / 2;
          const x = CX + 360 * Math.cos(a);
          const y = CY + 190 * Math.sin(a);
          c.fillStyle = COULEURS[i + 1]!;
          c.globalAlpha = 0.55;
          c.beginPath();
          c.arc(x, y, 55, 0, 7);
          c.fill();
        }
        c.globalAlpha = 1;
        // Notre tasse : des pois qui tournent, une anse, une soucoupe.
        c.fillStyle = '#fff8ee';
        c.beginPath();
        c.arc(CX, CY, 150, 0, 7);
        c.fill();
        c.save();
        c.translate(CX, CY);
        c.rotate(angle);
        c.fillStyle = '#f27a8e';
        c.beginPath();
        c.arc(0, 0, 125, 0, 7);
        c.fill();
        c.fillStyle = '#fff8ee';
        for (let i = 0; i < 8; i++) {
          c.beginPath();
          c.arc(90 * Math.cos((i / 8) * 2 * Math.PI), 90 * Math.sin((i / 8) * 2 * Math.PI), 14, 0, 7);
          c.fill();
        }
        c.fillStyle = '#d65c72';
        c.fillRect(120, -22, 50, 44);
        c.fillStyle = '#fff8ee';
        c.beginPath();
        c.arc(0, 0, 55, 0, 7);
        c.fill();
        c.fillStyle = '#6aa8ef';
        c.beginPath();
        c.arc(0, -10, 22, 0, 7);
        c.fill();
        c.restore();
        // La jauge de vitesse : le vert au milieu.
        const gx = 250;
        const gy = 545;
        const gl = 500;
        const echelle = (v: number): number => gx + (Math.min(12, v) / 12) * gl;
        c.fillStyle = '#fff8ee';
        c.beginPath();
        c.roundRect(gx, gy, gl, 30, 15);
        c.fill();
        c.fillStyle = '#8acb52';
        c.fillRect(echelle(TASSE_VERT.min), gy, echelle(TASSE_VERT.max) - echelle(TASSE_VERT.min), 30);
        c.fillStyle = '#4a3833';
        c.fillRect(echelle(Math.abs(w)) - 4, gy - 6, 8, 42);
      },
    };
  },
};

// --- Le bateau pirate : se balancer jusqu'aux mouettes -----------------------------------------

const bateau: Manege = {
  id: 'bateau',
  ...T.bateau,
  duree: 50,
  creer(hasard): Jeu {
    const PX = L / 2;
    const PY = 90;
    const BRAS = 300;
    let p: Pendule = { angle: 0.3, vitesse: 0 };
    let points = 0;
    const etincelles = new Etincelles();
    // Deux mouettes, une de chaque côté, à un angle à atteindre.
    const mouettes = [
      { cote: -1, angle: 0.8, revient: 0 },
      { cote: 1, angle: 0.85, revient: 0 },
    ];
    const position = (a: number): { x: number; y: number } => ({ x: PX + BRAS * Math.sin(a), y: PY + BRAS * Math.cos(a) });
    return {
      score: () => points,
      maj(dt, e) {
        if (e.tape) {
          const r = pousser(p);
          p = r.pendule;
          if (r.bonMoment) bruitage.touche();
        }
        p = balancer(p, dt);
        for (const m of mouettes) {
          m.revient -= dt;
          if (m.revient <= 0 && Math.sign(p.angle) === m.cote && Math.abs(p.angle) >= m.angle) {
            points++;
            const b = position(p.angle);
            etincelles.jaillir(b.x, b.y - 60, '#fff');
            bruitage.reussite();
            m.revient = 2;
            m.angle = 0.85 + hasard() * 0.45;
          }
        }
        etincelles.maj(dt);
      },
      dessiner(c, t) {
        ciel(c, '#9fd7f0', '#fff1d6');
        nuage(c, 120, 120);
        nuage(c, 760, 80, 1.2);
        // La mer.
        c.fillStyle = '#5fb0de';
        c.beginPath();
        c.moveTo(0, H);
        for (let x = 0; x <= L; x += 20) c.lineTo(x, 520 + 10 * Math.sin(x / 50 + t * 2));
        c.lineTo(L, H);
        c.fill();
        // Les mouettes : là où le bateau doit monter.
        for (const m of mouettes) {
          if (m.revient > 0) continue;
          const b = position(m.cote * m.angle);
          const x = b.x + m.cote * 30;
          const y = b.y - 80;
          c.strokeStyle = '#4a3833';
          c.lineWidth = 4;
          c.beginPath();
          c.moveTo(x - 22, y - 4 + 6 * Math.sin(t * 8));
          c.quadraticCurveTo(x - 10, y - 14, x, y);
          c.quadraticCurveTo(x + 10, y - 14, x + 22, y - 4 + 6 * Math.sin(t * 8));
          c.stroke();
        }
        // Le portique et le bras.
        c.strokeStyle = '#a0704a';
        c.lineWidth = 16;
        c.beginPath();
        c.moveTo(PX - 160, 540);
        c.lineTo(PX, PY);
        c.lineTo(PX + 160, 540);
        c.stroke();
        const b = position(p.angle);
        c.strokeStyle = '#7a5236';
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(PX, PY);
        c.lineTo(b.x, b.y);
        c.stroke();
        // Le bateau, qui penche avec le bras.
        c.save();
        c.translate(b.x, b.y);
        c.rotate(-p.angle);
        c.fillStyle = '#c0703c';
        c.beginPath();
        c.moveTo(-150, -20);
        c.lineTo(150, -20);
        c.lineTo(110, 45);
        c.lineTo(-110, 45);
        c.closePath();
        c.fill();
        c.fillStyle = '#ffc94a';
        c.fillRect(-150, -26, 300, 10);
        for (let i = -2; i <= 2; i++) {
          c.fillStyle = '#f5cfa8';
          c.beginPath();
          c.arc(i * 50, -42, 15, 0, 7);
          c.fill();
        }
        c.fillStyle = '#f27a8e';
        c.beginPath();
        c.moveTo(0, -20);
        c.lineTo(0, -120);
        c.lineTo(50, -100);
        c.lineTo(0, -80);
        c.fill();
        c.restore();
        c.fillStyle = '#4a3833';
        c.beginPath();
        c.arc(PX, PY, 14, 0, 7);
        c.fill();
        etincelles.dessiner(c);
      },
    };
  },
};

// --- Le petit grand huit : sauter jusqu'aux étoiles --------------------------------------------

const grandHuit: Manege = {
  id: 'grandHuit',
  ...T.grandHuit,
  duree: 50,
  creer(hasard): Jeu {
    const ECRAN_X = 280;
    const SOL = 560;
    let x = 0;
    let v = 260;
    let points = 0;
    const etincelles = new Etincelles();
    // Une étoile au-dessus de chaque sommet, à une hauteur au hasard.
    const etoiles = new Map<number, { haut: number; prise: boolean; ratee: boolean }>();
    let vu = 0;
    const saut = (wx: number): number => {
      for (const s of sommets(wx - 140, wx + 140)) {
        const d = (wx - s) / 140;
        return hauteurSaut(v) * Math.max(0, 1 - d * d);
      }
      return 0;
    };
    const ecranY = (wx: number): number => SOL - hauteurPiste(wx);
    return {
      score: () => points,
      maj(dt, e) {
        v = rouler(v, x, dt, e.appui);
        const avant = x;
        x += v * dt;
        for (const s of sommets(vu, x + L)) etoiles.set(s, { haut: 25 + hasard() * 80, prise: false, ratee: false });
        vu = Math.max(vu, x + L);
        for (const [s, et] of etoiles) {
          if (et.prise || et.ratee || !(avant < s && x >= s)) continue;
          if (Math.abs(hauteurSaut(v) - et.haut) < 32) {
            et.prise = true;
            points++;
            etincelles.jaillir(ECRAN_X, ecranY(s) - 40 - et.haut, '#ffc94a');
            bruitage.reussite();
          } else et.ratee = true;
        }
        for (const s of etoiles.keys()) if (s < x - 400) etoiles.delete(s);
        etincelles.maj(dt);
      },
      dessiner(c, t) {
        ciel(c, '#c9e9ff', '#fff1d6');
        for (let i = 0; i < 4; i++) nuage(c, ((((i * 330 - x * 0.2) % 1320) + 1320) % 1320) - 160, 90 + (i % 2) * 70);
        const gauche = x - ECRAN_X;
        // Les poteaux et la piste.
        c.strokeStyle = '#d7c3a8';
        c.lineWidth = 8;
        for (let wx = Math.ceil(gauche / 80) * 80; wx < gauche + L + 80; wx += 80) {
          c.beginPath();
          c.moveTo(wx - gauche, ecranY(wx));
          c.lineTo(wx - gauche, H);
          c.stroke();
        }
        c.strokeStyle = '#f27a8e';
        c.lineWidth = 12;
        c.beginPath();
        for (let sx = 0; sx <= L; sx += 8) c.lineTo(sx, ecranY(gauche + sx));
        c.stroke();
        // Les étoiles au-dessus des sommets.
        for (const [s, et] of etoiles) {
          if (et.prise) continue;
          const sx = s - gauche;
          if (sx < -40 || sx > L + 40) continue;
          etoile(c, sx, ecranY(s) - 40 - et.haut, 22 + 3 * Math.sin(t * 5), et.ratee ? 'rgba(240,179,35,0.35)' : '#f0b323');
        }
        // Le wagon, qui saute en haut des bosses.
        const wy = ecranY(x) - saut(x);
        const pente = Math.atan2(hauteurPiste(x - 10) - hauteurPiste(x + 10), 20);
        c.save();
        c.translate(ECRAN_X, wy);
        c.rotate(pente);
        c.fillStyle = '#6aa8ef';
        c.beginPath();
        c.roundRect(-40, -46, 80, 40, 10);
        c.fill();
        c.fillStyle = '#f5cfa8';
        c.beginPath();
        c.arc(-8, -58, 16, 0, 7);
        c.fill();
        c.fillStyle = '#4a3833';
        c.beginPath();
        c.arc(-24, -6, 9, 0, 7);
        c.arc(24, -6, 9, 0, 7);
        c.fill();
        c.restore();
        // Le compteur de vitesse, en bas.
        c.fillStyle = 'rgba(255,248,238,0.9)';
        c.beginPath();
        c.roundRect(20, H - 50, 220, 30, 15);
        c.fill();
        c.fillStyle = '#ff9f5a';
        c.beginPath();
        c.roundRect(20, H - 50, 220 * Math.min(1, (v - 100) / 420), 30, 15);
        c.fill();
        etincelles.dessiner(c);
      },
    };
  },
};

export const MANEGES_ESSAI: readonly Manege[] = [carrousel, chaises, tasses, bateau, grandHuit];
