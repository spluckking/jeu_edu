// La carte de la ville : toute la ville vue de haut et de biais, comme dans le jeu (on reconnaît
// les bâtiments), photographiée dans la scène au moment où on l'ouvre (toujours à jour). On n'en
// voit qu'une partie, centrée sur l'enfant ; des flèches sur les bords la font glisser. L'enfant
// glisse le doigt dessus : le nom du lieu le plus proche s'affiche. Un point bleu montre où il est.

import * as THREE from 'three';
import T from '../../content/ville/carte.json';
import { LIEUX as PIEGES } from '../dictee/pieges.ts';
import { bruitage } from '../son/bruitages.ts';
import { BORDS, BUISSONS_MURES, ETANG, LIEUX } from './monde.ts';

export interface LieuCarte {
  nom: string;
  x: number;
  z: number;
}

/** Les lieux de la carte. La boulangerie n'est un « chantier » que tant qu'elle n'est pas construite. */
export function lieuxDeLaCarte(boulangerieConstruite: boolean): LieuCarte[] {
  const n = T.lieux;
  const mures = BUISSONS_MURES.reduce((s, b) => ({ x: s.x + b.x / BUISSONS_MURES.length, z: s.z + b.z / BUISSONS_MURES.length }), { x: 0, z: 0 });
  return [
    { nom: n.maison, ...LIEUX.maison },
    { nom: n.potager, ...LIEUX.potager },
    { nom: n.pommier, ...LIEUX.pommier },
    { nom: n.place, x: 0, z: 0 },
    { nom: n.tableau, ...LIEUX.tableau },
    { nom: n.murDesMots, ...LIEUX.murDesMots },
    { nom: n.epicerie, ...LIEUX.epicerie },
    { nom: n.poste, ...LIEUX.poste },
    { nom: boulangerieConstruite ? n.boulangerie : n.chantier, ...LIEUX.boulangerie },
    { nom: PIEGES.double.nom, ...LIEUX.tour },
    { nom: PIEGES.mbp.nom, ...LIEUX.pont },
    { nom: n.etang, x: ETANG.x, z: ETANG.z },
    { nom: n.ponton, ...LIEUX.ponton },
    { nom: n.bois, x: -64, z: -24 },
    { nom: n.mures, ...mures },
    { nom: n.fete, ...LIEUX.fete },
  ].map(({ nom, x, z }) => ({ nom, x, z }));
}

/** Le lieu le plus proche de ce point, s'il est assez près (en mètres). */
export function lieuProche(lieux: readonly LieuCarte[], x: number, z: number, portee = 12): LieuCarte | null {
  let meilleur: LieuCarte | null = null;
  let d = portee;
  for (const l of lieux) {
    const e = Math.hypot(l.x - x, l.z - z);
    if (e < d) {
      d = e;
      meilleur = l;
    }
  }
  return meilleur;
}

/** L'angle de la vue : de haut, un peu de biais vers le nord (on voit les façades, au sud). */
const ANGLE = 0.95;
const SA = Math.sin(ANGLE);
/** Au nord, de quoi voir le haut des grands bâtiments (la grande roue). */
const MARGE_NORD = 10;

/** La ville en image, et le passage des mètres aux pixels de l'image (et retour). */
export interface Plan {
  toile: HTMLCanvasElement;
  /** Pixels de l'image par mètre. */
  ppm: number;
  versCarte(x: number, z: number): { x: number; y: number };
  versMonde(px: number, py: number): { x: number; z: number };
}

/** Photographie toute la ville, morceau par morceau (chaque morceau à la taille de l'écran), dans
 *  une grande image ; pixelsParMetre fixe la finesse. À appeler sans brouillard ni personnage. */
export function photographierLaVille(renderer: THREE.WebGLRenderer, scene: THREE.Scene, pixelsParMetre = 12): Plan {
  const L = BORDS.xMax - BORDS.xMin;
  const haut = -BORDS.zMin * SA + MARGE_NORD;
  const bas = -BORDS.zMax * SA;
  const ppm = Math.min(pixelsParMetre, 4096 / L, 4096 / (haut - bas));
  const toile = document.createElement('canvas');
  toile.width = Math.round(L * ppm);
  toile.height = Math.round((haut - bas) * ppm);
  const g = toile.getContext('2d')!;
  const ecran = renderer.domElement;
  const tw = ecran.width;
  const th = ecran.height;
  const cam = new THREE.OrthographicCamera(-tw / 2 / ppm, tw / 2 / ppm, th / 2 / ppm, -th / 2 / ppm, 1, 500);
  cam.rotation.set(-ANGLE, 0, 0);
  const regard = new THREE.Vector3(0, -SA, -Math.cos(ANGLE));
  for (let iy = 0; iy * th < toile.height; iy++) {
    for (let ix = 0; ix * tw < toile.width; ix++) {
      // Le point du sol au centre de ce morceau.
      const x = BORDS.xMin + (ix + 0.5) * (tw / ppm);
      const sCentre = haut - (iy + 0.5) * (th / ppm);
      cam.position.set(x, 0, -sCentre / SA).addScaledVector(regard, -200);
      cam.updateMatrixWorld();
      renderer.render(scene, cam);
      g.drawImage(ecran, ix * tw, iy * th);
    }
  }
  return {
    toile,
    ppm,
    versCarte: (x, z) => ({ x: (x - BORDS.xMin) * ppm, y: (haut + z * SA) * ppm }),
    versMonde: (px, py) => ({ x: BORDS.xMin + px / ppm, z: (py / ppm - haut) / SA }),
  };
}

/** Pixels d'écran par mètre, sur la carte. */
const ZOOM = 14;

const FLECHES = [
  { cote: 'haut', dx: 0, dy: -1, d: 'M6 15l6-6 6 6' },
  { cote: 'bas', dx: 0, dy: 1, d: 'M6 9l6 6 6-6' },
  { cote: 'gauche', dx: -1, dy: 0, d: 'M15 6l-6 6 6 6' },
  { cote: 'droite', dx: 1, dy: 0, d: 'M9 6l6 6-6 6' },
] as const;

export function ouvrirCarte(plan: Plan, lieux: readonly LieuCarte[], ici: { x: number; z: number }): Promise<void> {
  return new Promise((fini) => {
    // À l'écran, 14 pixels par mètre : on voit le quartier autour de l'enfant.
    const pr = plan.ppm / ZOOM;
    const fond = Object.assign(document.createElement('div'), { className: 'carte-fond' });
    const boite = Object.assign(document.createElement('div'), { className: 'carte-boite' });
    const titre = Object.assign(document.createElement('p'), { className: 'carte-titre-ville', textContent: T.titre });
    const aide = Object.assign(document.createElement('p'), { className: 'carte-aide', textContent: T.aide });
    const vue = Object.assign(document.createElement('div'), { className: 'carte-vue' });
    const calque = Object.assign(document.createElement('div'), { className: 'carte-calque' });
    const W = plan.toile.width / pr;
    const H = plan.toile.height / pr;
    Object.assign(plan.toile.style, { width: `${W}px`, height: `${H}px` });
    Object.assign(calque.style, { width: `${W}px`, height: `${H}px` });
    calque.append(plan.toile);
    const ou = (x: number, z: number): { left: string; top: string } => {
      const p = plan.versCarte(x, z);
      return { left: `${p.x / pr}px`, top: `${p.y / pr}px` };
    };
    const points = lieux.map((l) => {
      const p = Object.assign(document.createElement('span'), { className: 'carte-point' });
      Object.assign(p.style, ou(l.x, l.z));
      calque.append(p);
      return p;
    });
    const moi = Object.assign(document.createElement('span'), { className: 'carte-moi' });
    Object.assign(moi.style, ou(ici.x, ici.z));
    const bulle = Object.assign(document.createElement('span'), { className: 'carte-bulle' });
    bulle.hidden = true;
    calque.append(moi, bulle);
    vue.append(calque);

    // Le décalage de l'image dans la fenêtre ; une flèche sans rien au-delà est grisée.
    let ox = 0;
    let oy = 0;
    const fleches: Array<{ dx: number; dy: number; b: HTMLButtonElement }> = [];
    const placer = (x: number, y: number): void => {
      // offsetWidth : la taille sans l'animation d'ouverture (qui part d'un quart de la taille).
      const r = { width: vue.offsetWidth, height: vue.offsetHeight };
      ox = Math.max(0, Math.min(W - r.width, x));
      oy = Math.max(0, Math.min(H - r.height, y));
      calque.style.transform = `translate(${-ox}px, ${-oy}px)`;
      for (const f of fleches) {
        f.b.disabled = (f.dx < 0 && ox <= 0) || (f.dx > 0 && ox >= W - r.width - 1) || (f.dy < 0 && oy <= 0) || (f.dy > 0 && oy >= H - r.height - 1);
      }
    };
    for (const f of FLECHES) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: `carte-fleche carte-fleche-${f.cote}` });
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${f.d}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      b.addEventListener('click', () => {
        bruitage.touche();
        const r = { width: vue.offsetWidth, height: vue.offsetHeight };
        bulle.hidden = true;
        placer(ox + f.dx * r.width * 0.45, oy + f.dy * r.height * 0.45);
      });
      vue.append(b);
      fleches.push({ dx: f.dx, dy: f.dy, b });
    }

    // Le doigt glisse sur la carte : le nom du lieu le plus proche (ou « Tu es ici »).
    let dernier = '';
    const montrer = (e: PointerEvent): void => {
      const r = calque.getBoundingClientRect();
      const k = calque.offsetWidth / r.width;
      const m = plan.versMonde((e.clientX - r.left) * k * pr, (e.clientY - r.top) * k * pr);
      const tous = [...lieux, { nom: T.ici, x: ici.x, z: ici.z }];
      const l = lieuProche(tous, m.x, m.z, 9);
      points.forEach((p, i) => p.classList.toggle('vise', lieux[i] === l));
      if (!l) {
        bulle.hidden = true;
        dernier = '';
        return;
      }
      if (l.nom !== dernier) bruitage.touche();
      dernier = l.nom;
      bulle.textContent = l.nom;
      Object.assign(bulle.style, ou(l.x, l.z));
      bulle.hidden = false;
    };
    calque.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      calque.setPointerCapture(e.pointerId);
      montrer(e);
    });
    calque.addEventListener('pointermove', montrer);

    const fermer = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-principal', textContent: 'Fermer' });
    fermer.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini();
    });
    boite.append(titre, aide, vue, fermer);
    fond.append(boite);
    document.body.append(fond);
    // Au départ, l'enfant au milieu de la fenêtre.
    const r = { width: vue.offsetWidth, height: vue.offsetHeight };
    const c = plan.versCarte(ici.x, ici.z);
    calque.style.transition = 'none';
    placer(c.x / pr - r.width / 2, c.y / pr - r.height / 2);
    requestAnimationFrame(() => requestAnimationFrame(() => (calque.style.transition = '')));
  });
}
