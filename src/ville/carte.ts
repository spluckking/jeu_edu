// La carte de la ville : toute la ville vue de haut et de biais, comme dans le jeu (on reconnaît
// les bâtiments), photographiée dans la scène au moment où on l'ouvre (toujours à jour). On n'en
// voit qu'une partie, centrée sur l'enfant ; des flèches sur les bords la font glisser. L'enfant
// glisse le doigt dessus : le nom du lieu le plus proche s'affiche. Les lieux sont détourés d'un
// contour qui brille ; l'enfant est là, en miniature.

import * as THREE from 'three';
import T from '../../content/ville/carte.json';
import { LIEUX as PIEGES } from '../dictee/pieges.ts';
import { bruitage } from '../son/bruitages.ts';
import { BORDS, BUISSONS_MURES, ETANG, LIEUX } from './monde.ts';

export interface LieuCarte {
  nom: string;
  x: number;
  z: number;
  /** Ce qui est à moins de r mètres (bâtiment, décor) est détouré sur la carte ; 0 : rien. */
  r: number;
}

/** Les lieux de la carte. La boulangerie n'est un « chantier » que tant qu'elle n'est pas construite. */
export function lieuxDeLaCarte(boulangerieConstruite: boolean): LieuCarte[] {
  const n = T.lieux;
  const mures = BUISSONS_MURES.reduce((s, b) => ({ x: s.x + b.x / BUISSONS_MURES.length, z: s.z + b.z / BUISSONS_MURES.length }), { x: 0, z: 0 });
  return [
    { nom: n.maison, ...LIEUX.maison, r: 5.5 },
    { nom: n.potager, ...LIEUX.potager, r: 5 },
    { nom: n.pommier, ...LIEUX.pommier, r: 3 },
    { nom: n.place, x: 0, z: 0, r: 3 },
    { nom: n.tableau, ...LIEUX.tableau, r: 1.6 },
    { nom: n.murDesMots, ...LIEUX.murDesMots, r: 2.5 },
    { nom: n.epicerie, ...LIEUX.epicerie, r: 5 },
    { nom: n.poste, ...LIEUX.poste, r: 5 },
    { nom: boulangerieConstruite ? n.boulangerie : n.chantier, ...LIEUX.boulangerie, r: 5 },
    { nom: PIEGES.double.nom, ...LIEUX.tour, r: 3 },
    { nom: PIEGES.mbp.nom, ...LIEUX.pont, r: 6.5 },
    { nom: n.etang, x: ETANG.x, z: ETANG.z, r: 16 },
    { nom: n.ponton, ...LIEUX.ponton, r: 3 },
    { nom: n.bois, x: -64, z: -24, r: 0 },
    { nom: n.mures, ...mures, r: 6 },
    { nom: n.fete, ...LIEUX.fete, r: 31 },
  ].map(({ nom, x, z, r }) => ({ nom, x, z, r }));
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
  /** Le contour lumineux des lieux, à poser sur la photo (même proportions, moitié moins fin). */
  contours: HTMLCanvasElement;
  /** Pixels de l'image par mètre. */
  ppm: number;
  versCarte(x: number, z: number): { x: number; y: number };
  versMonde(px: number, py: number): { x: number; z: number };
}

/** Photographie toute la ville, morceau par morceau (chaque morceau à la taille de l'écran), dans
 *  une grande image ; pixelsParMetre fixe la finesse. À appeler sans brouillard ni personnage. */
export function photographierLaVille(renderer: THREE.WebGLRenderer, scene: THREE.Scene, lieux: readonly LieuCarte[], pixelsParMetre = 12): Plan {
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
  // Vu de biais, le décalage de profondeur des sols (berges, chemins) les ferait passer devant
  // l'eau : on l'enlève le temps de la photo (la caméra orthographique n'en a pas besoin).
  const decales: THREE.Material[] = [];
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    for (const x of Array.isArray(m) ? m : m ? [m] : []) {
      if (x.polygonOffset) {
        x.polygonOffset = false;
        decales.push(x);
      }
    }
  });
  const photographier = (dessin: CanvasRenderingContext2D, k: number): void => {
    for (let iy = 0; iy * th < toile.height; iy++) {
      for (let ix = 0; ix * tw < toile.width; ix++) {
        // Le point du sol au centre de ce morceau.
        const x = BORDS.xMin + (ix + 0.5) * (tw / ppm);
        const sCentre = haut - (iy + 0.5) * (th / ppm);
        cam.position.set(x, 0, -sCentre / SA).addScaledVector(regard, -200);
        cam.updateMatrixWorld();
        renderer.render(scene, cam);
        dessin.drawImage(ecran, ix * tw * k, iy * th * k, tw * k, th * k);
      }
    }
  };
  photographier(g, 1);
  for (const m of decales) m.polygonOffset = true;
  const contours = detourer(scene, lieux, toile, (d, k) => photographier(d, k));
  return {
    toile,
    contours,
    ppm,
    versCarte: (x, z) => ({ x: (x - BORDS.xMin) * ppm, y: (haut + z * SA) * ppm }),
    versMonde: (px, py) => ({ x: BORDS.xMin + px / ppm, z: (py / ppm - haut) / SA }),
  };
}

/** Le contour lumineux des lieux : on photographie une seconde fois la ville, avec seulement ce qui
 *  est près d'un lieu (bâtiments, décor, étang), tout en blanc sur fond noir, à moitié de la
 *  finesse ; puis on ne garde que le bord de ces formes, élargi, qui brille. */
function detourer(
  scene: THREE.Scene,
  lieux: readonly LieuCarte[],
  toile: HTMLCanvasElement,
  photographier: (d: CanvasRenderingContext2D, k: number) => void,
): HTMLCanvasElement {
  const K = 0.5;
  const w = Math.round(toile.width * K);
  const h = Math.round(toile.height * K);
  const masque = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const caches: THREE.Object3D[] = [];
  const sphere = new THREE.Sphere();
  scene.traverse((o) => {
    if (!o.visible) return;
    const mesh = o as THREE.Mesh;
    const dessine = mesh.isMesh || (o as THREE.Line).isLine || (o as THREE.Points).isPoints;
    if (!dessine) return;
    let garde = false;
    if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh) {
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
      garde = sphere.radius < 16 && lieux.some((l) => l.r > 0 && Math.hypot(sphere.center.x - l.x, sphere.center.z - l.z) < l.r);
    }
    if (!garde) {
      o.visible = false;
      caches.push(o);
    }
  });
  const fond = scene.background;
  const blanc = new THREE.MeshBasicMaterial({ color: 0xffffff });
  scene.background = new THREE.Color(0x000000);
  scene.overrideMaterial = blanc;
  photographier(masque.getContext('2d')!, K);
  scene.overrideMaterial = null;
  scene.background = fond;
  blanc.dispose();
  for (const o of caches) o.visible = true;

  // Le blanc devient une forme pleine (opaque), couleur crème.
  const m = masque.getContext('2d')!;
  const image = m.getImageData(0, 0, w, h);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const plein = (px[i] ?? 0) > 60;
    px[i] = 255;
    px[i + 1] = 252;
    px[i + 2] = 230;
    px[i + 3] = plein ? 255 : 0;
  }
  m.putImageData(image, 0, 0);
  // Le bord : la forme élargie dans toutes les directions, moins la forme elle-même.
  const bord = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const b = bord.getContext('2d')!;
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    b.drawImage(masque, Math.cos(t) * 3.5, Math.sin(t) * 3.5);
  }
  b.globalCompositeOperation = 'destination-out';
  b.drawImage(masque, 0, 0);
  // Il brille un peu.
  const contours = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const c = contours.getContext('2d')!;
  c.shadowColor = 'rgba(255, 196, 64, 1)';
  c.shadowBlur = 9;
  for (let i = 0; i < 3; i++) c.drawImage(bord, 0, 0);
  return contours;
}

/** Pixels d'écran par mètre, sur la carte (de près). */
const ZOOM = 7;

const FLECHES = [
  { cote: 'haut', dx: 0, dy: -1, d: 'M6 15l6-6 6 6' },
  { cote: 'bas', dx: 0, dy: 1, d: 'M6 9l6 6 6-6' },
  { cote: 'gauche', dx: -1, dy: 0, d: 'M15 6l-6 6 6 6' },
  { cote: 'droite', dx: 1, dy: 0, d: 'M9 6l6 6-6 6' },
] as const;

/** ici.portrait : le personnage en miniature (image), posé à sa place sur la carte. */
/** quetes : les quêtes en cours, chacune marquée d'un repère ; un toucher sur le repère ouvre sa
 *  fiche, qui reste affichée (dans un coin de la carte) jusqu'à ce qu'on la ferme.
 *  deLoin : ouvrir sur toute la ville (depuis la Gazette). */
export function ouvrirCarte(
  plan: Plan,
  lieux: readonly LieuCarte[],
  ici: { x: number; z: number; portrait: string | null },
  quetes: ReadonlyArray<{ x: number; z: number; titre: string; texte: string }> = [],
  options: { deLoin?: boolean } = {},
): Promise<void> {
  return new Promise((fini) => {
    // pr : pixels de l'image par pixel d'écran. De près (7 pixels d'écran par mètre), on voit le
    // quartier autour de l'enfant ; de loin, toute la ville tient dans la fenêtre.
    let pr = plan.ppm / ZOOM;
    let deLoin = options.deLoin ?? false;
    const fond = Object.assign(document.createElement('div'), { className: 'carte-fond' });
    const boite = Object.assign(document.createElement('div'), { className: 'carte-boite' });
    const titre = Object.assign(document.createElement('p'), { className: 'carte-titre-ville', textContent: T.titre });
    const aide = Object.assign(document.createElement('p'), { className: 'carte-aide', textContent: T.aide });
    const vue = Object.assign(document.createElement('div'), { className: 'carte-vue' });
    const calque = Object.assign(document.createElement('div'), { className: 'carte-calque' });
    let W = 0;
    let H = 0;
    plan.contours.className = 'carte-contours';
    calque.append(plan.toile, plan.contours);
    /** Les repères posés sur la carte, à replacer quand l'échelle change. */
    const reperes: Array<{ e: HTMLElement; x: number; z: number }> = [];
    const ou = (x: number, z: number): { left: string; top: string } => {
      const p = plan.versCarte(x, z);
      return { left: `${p.x / pr}px`, top: `${p.y / pr}px` };
    };
    // L'enfant : son personnage en miniature (ou un point bleu, si le portrait manque).
    const moi = Object.assign(document.createElement('span'), { className: 'carte-moi' });
    if (ici.portrait) {
      moi.classList.add('portrait');
      moi.append(Object.assign(document.createElement('img'), { src: ici.portrait, alt: '', draggable: false }));
    }
    reperes.push({ e: moi, x: ici.x, z: ici.z });
    const bulle = Object.assign(document.createElement('span'), { className: 'carte-bulle' });
    bulle.hidden = true;
    calque.append(moi, bulle);
    vue.append(calque);

    // Les quêtes : un repère « ! » à leur place ; sa fiche s'ouvre dans un coin et y reste.
    const fiche = Object.assign(document.createElement('div'), { className: 'carte-fiche' });
    fiche.hidden = true;
    const ficheTitre = Object.assign(document.createElement('p'), { className: 'carte-fiche-titre' });
    const ficheTexte = Object.assign(document.createElement('p'), { className: 'carte-fiche-texte' });
    const ficheFermer = Object.assign(document.createElement('button'), { type: 'button', className: 'carte-fiche-fermer', textContent: '×', ariaLabel: 'Fermer' });
    fiche.append(ficheFermer, ficheTitre, ficheTexte);
    const marques = quetes.map((q) => {
      const m = Object.assign(document.createElement('button'), { type: 'button', className: 'carte-quete', textContent: '!' });
      m.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        bruitage.touche();
        for (const x of marques) x.classList.toggle('choisie', x === m);
        ficheTitre.textContent = q.titre;
        ficheTexte.textContent = q.texte;
        fiche.hidden = false;
      });
      reperes.push({ e: m, x: q.x, z: q.z });
      calque.append(m);
      return m;
    });
    ficheFermer.addEventListener('click', () => {
      bruitage.touche();
      fiche.hidden = true;
      for (const x of marques) x.classList.remove('choisie');
    });
    vue.append(fiche);

    // Le décalage de l'image dans la fenêtre ; une flèche sans rien au-delà est grisée.
    let ox = 0;
    let oy = 0;
    const fleches: Array<{ dx: number; dy: number; b: HTMLButtonElement }> = [];
    const placer = (x: number, y: number): void => {
      // offsetWidth : la taille sans l'animation d'ouverture (qui part d'un quart de la taille).
      const r = { width: vue.offsetWidth, height: vue.offsetHeight };
      // Plus petite que la fenêtre (de loin), la carte est centrée.
      ox = W <= r.width ? (W - r.width) / 2 : Math.max(0, Math.min(W - r.width, x));
      oy = H <= r.height ? (H - r.height) / 2 : Math.max(0, Math.min(H - r.height, y));
      calque.style.transform = `translate(${-ox}px, ${-oy}px)`;
      for (const f of fleches) {
        f.b.hidden = deLoin;
        f.b.disabled =(f.dx < 0 && ox <= 0) || (f.dx > 0 && ox >= W - r.width - 1) || (f.dy < 0 && oy <= 0) || (f.dy > 0 && oy >= H - r.height - 1);
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
      const tous = [...lieux, { nom: T.ici, x: ici.x, z: ici.z, r: 0 }];
      const l = lieuProche(tous, m.x, m.z, 9);
      if (!l) {
        bulle.hidden = true;
        dernier = '';
        return;
      }
      if (l.nom !== dernier) bruitage.touche();
      dernier = l.nom;
      bulle.classList.remove('quete');
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
    const loin = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-secondaire', textContent: T.deLoin });
    const actions = Object.assign(document.createElement('div'), { className: 'carte-actions' });
    actions.append(loin, fermer);
    boite.append(titre, aide, vue, actions);
    fond.append(boite);
    document.body.append(fond);
    /** Change d'échelle, puis met l'enfant au milieu de la fenêtre. */
    const echelle = (): void => {
      const r = { width: vue.offsetWidth, height: vue.offsetHeight };
      pr = deLoin ? Math.max(plan.toile.width / r.width, plan.toile.height / r.height) : plan.ppm / ZOOM;
      W = plan.toile.width / pr;
      H = plan.toile.height / pr;
      for (const t of [plan.toile, plan.contours]) Object.assign(t.style, { width: `${W}px`, height: `${H}px` });
      Object.assign(calque.style, { width: `${W}px`, height: `${H}px` });
      for (const p of reperes) Object.assign(p.e.style, ou(p.x, p.z));
      bulle.hidden = true;
      const c = plan.versCarte(ici.x, ici.z);
      calque.style.transition = 'none';
      placer(c.x / pr - r.width / 2, c.y / pr - r.height / 2);
      requestAnimationFrame(() => requestAnimationFrame(() => (calque.style.transition = '')));
      loin.textContent = deLoin ? T.dePres : T.deLoin;
    };
    loin.addEventListener('click', () => {
      bruitage.touche();
      deLoin = !deLoin;
      echelle();
    });
    echelle();
    // Depuis la Gazette, la première quête est déjà ouverte.
    if (options.deLoin && marques[0]) marques[0].dispatchEvent(new PointerEvent('pointerdown'));
  });
}
