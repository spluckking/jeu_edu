// Le terrain de la qualité haute : un sol d'un seul tenant. La fête est sur un replat ; autour,
// des collines boisées. Les chemins ne sont plus des bandes droites : ce sont des courbes aux bords
// irréguliers, peintes dans une carte de mélange herbe / pavés, avec des placettes arrondies
// devant les stands.

import * as THREE from 'three';
import { materiauDetaille } from './qualite.ts';

// --- Le relief ----------------------------------------------------------------------------------
/** Le replat de la fête (là où l'on marche) : rien n'y bouge, le personnage reste à y = 0. */
const REPLAT = { x: 27, zMin: -45, zMax: 36 };

const lisse = (t: number): number => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

/** Hauteur du sol en (x, z) : 0 sur le replat, des collines douces au-delà. */
export function hauteurSol(x: number, z: number): number {
  const dx = Math.max(0, Math.abs(x) - REPLAT.x);
  const dz = Math.max(0, REPLAT.zMin - z, z - REPLAT.zMax);
  const d = Math.hypot(dx, dz);
  if (d <= 0) return 0;
  const collines =
    3.2 + 2.4 * Math.sin(x * 0.085 + 1.3) * Math.cos(z * 0.07) + 1.6 * Math.sin((x - z) * 0.05 + 0.4) + 0.7 * Math.sin(x * 0.23 + z * 0.17);
  return lisse(d / 18) * Math.max(0.6, collines) * (1 + d * 0.03);
}

// --- Les chemins ----------------------------------------------------------------------------------
/** Les chemins de la fête, en points de passage (x, z) : la courbe passe par chacun. */
export const CHEMINS: Array<{ points: Array<[number, number]>; largeur: number }> = [
  // L'allée d'arrivée, de la route à la place.
  { points: [[0.4, 36], [-0.3, 26], [0.5, 17], [-0.2, 10], [0.3, 4], [0, -1]], largeur: 3.2 },
  // La grande allée en travers, qui ondule.
  { points: [[-19, -0.2], [-12, -1.6], [-5, -0.6], [0, -1], [5, -1.8], [12, -0.4], [19, -1.4]], largeur: 3.2 },
  // Les deux allées vers le fond, de chaque côté du chamboule-tout.
  { points: [[-5, -1], [-6.4, -7], [-5, -13], [-6, -18], [-5.4, -23]], largeur: 2.7 },
  { points: [[5, -1], [6.2, -6], [4.9, -12], [6.1, -18], [5.5, -23]], largeur: 2.7 },
  // L'allée du fond.
  { points: [[-16, -22], [-9, -23.6], [0, -22.4], [9, -23.4], [16, -22]], largeur: 2.9 },
];

/** La carte des chemins couvre 100 × 100 m autour de la fête. */
const CARTE = { x0: -50, z0: -60, taille: 100, px: 1024 };

export interface Terrain {
  racine: THREE.Group;
  /** Pavés à cet endroit ? (0 : herbe, 1 : pavés) */
  pave(x: number, z: number): number;
}

/** Une forme ronde mais irrégulière (placette), décrite par son contour. */
function tache(c: CanvasRenderingContext2D, x: number, y: number, r: number, graine: number): void {
  c.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rr = r * (1 + 0.12 * Math.sin(a * 3 + graine) + 0.07 * Math.sin(a * 5 + graine * 2.3));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.fill();
}

function dessinerCarte(placettes: Array<{ x: number; z: number; r: number }>): HTMLCanvasElement {
  const brut = document.createElement('canvas');
  brut.width = brut.height = CARTE.px;
  const c = brut.getContext('2d');
  const echelle = CARTE.px / CARTE.taille;
  const vers = (x: number, z: number): [number, number] => [(x - CARTE.x0) * echelle, (z - CARTE.z0) * echelle];
  if (c) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, CARTE.px, CARTE.px);
    c.fillStyle = '#fff';
    for (const [n, chemin] of CHEMINS.entries()) {
      const courbe = new THREE.CatmullRomCurve3(chemin.points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
      const longueur = courbe.getLength();
      const pas = Math.ceil(longueur / 0.2);
      for (let i = 0; i <= pas; i++) {
        const p = courbe.getPointAt(i / pas);
        const s = (i / pas) * longueur;
        // La largeur respire le long du chemin : jamais deux bords parallèles.
        const r = (chemin.largeur / 2) * (1 + 0.14 * Math.sin(s * 0.7 + n) + 0.08 * Math.sin(s * 1.9 + n * 2));
        const [px, py] = vers(p.x, p.z);
        c.beginPath();
        c.arc(px, py, r * echelle, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (const [i, p] of placettes.entries()) {
      const [px, py] = vers(p.x, p.z);
      tache(c, px, py, p.r * echelle, i * 1.7);
    }
  }
  // Bords fondus : la herbe mange un peu les pavés.
  const doux = document.createElement('canvas');
  doux.width = doux.height = CARTE.px;
  const d = doux.getContext('2d');
  if (d) {
    d.filter = 'blur(4px)';
    d.drawImage(brut, 0, 0);
  }
  return doux;
}

export function construireTerrain(herbe: THREE.Texture, dalles: THREE.Texture, placettes: Array<{ x: number; z: number; r: number }>): Terrain {
  const racine = new THREE.Group();
  const carte = dessinerCarte(placettes);
  const pixels = carte.getContext('2d')?.getImageData(0, 0, CARTE.px, CARTE.px).data;
  const masque = new THREE.CanvasTexture(carte);
  masque.colorSpace = THREE.NoColorSpace;
  masque.minFilter = THREE.LinearFilter;
  masque.generateMipmaps = false;
  // La première ligne de la carte est le bord z0 : pas de retournement.
  masque.flipY = false;

  // Le sol : un grand maillage subdivisé qui suit le relief.
  const geo = new THREE.PlaneGeometry(240, 240, 200, 200).rotateX(-Math.PI / 2).translate(0, 0, -8);
  const pos = geo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) pos.setY(i, hauteurSol(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();

  const mat = materiauDetaille({ map: herbe, roughness: 0.93 }, { relief: 0.07, teinte: 0.1, grain: 1.2 });
  const avant = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    avant.call(mat, shader, renderer);
    shader.uniforms.uDalles = { value: dalles };
    shader.uniforms.uMasque = { value: masque };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uDalles;\nuniform sampler2D uMasque;')
      .replace(
        '#include <map_fragment>',
        `// Herbe et pavés mélangés selon la carte des chemins, avec un bord irrégulier.
        vec2 sol = vPosMonde.xz;
        vec4 couleurHerbe = texture2D(map, sol * 0.125);
        vec4 couleurPaves = texture2D(uDalles, sol * 0.3125);
        float chemin = texture2D(uMasque, (sol - vec2(${CARTE.x0.toFixed(1)}, ${CARTE.z0.toFixed(1)})) / ${CARTE.taille.toFixed(1)}).r;
        chemin = smoothstep(0.38, 0.62, chemin + (bruit3(vPosMonde * 1.3) - 0.5) * 0.45);
        diffuseColor *= mix(couleurHerbe, couleurPaves, chemin);`,
      );
  };
  mat.customProgramCacheKey = () => 'terrain';
  const sol = new THREE.Mesh(geo, mat);
  sol.receiveShadow = true;
  racine.add(sol);

  const pave = (x: number, z: number): number => {
    if (!pixels) return 0;
    const px = Math.floor(((x - CARTE.x0) / CARTE.taille) * CARTE.px);
    const pz = Math.floor(((z - CARTE.z0) / CARTE.taille) * CARTE.px);
    if (px < 0 || pz < 0 || px >= CARTE.px || pz >= CARTE.px) return 0;
    return (pixels[(pz * CARTE.px + px) * 4] ?? 0) / 255;
  };

  // Des arbres ronds sur les collines : troncs et houppiers, deux appels de dessin en tout.
  const N = 260;
  const troncs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 1, 7), materiauDetaille({ color: 0x5a3f2b }, { relief: 0.1, teinte: 0.12, grain: 0.3 }), N);
  const houppiers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), materiauDetaille({ color: 0xffffff, roughness: 0.95 }, { relief: 0.18, teinte: 0.16, grain: 0.6 }), N * 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const couleur = new THREE.Color();
  let graine = 77;
  const hasard = (): number => (graine = (graine * 16807) % 2147483647) / 2147483647;
  let t = 0;
  let h = 0;
  for (let essai = 0; t < N && essai < 5000; essai++) {
    const x = (hasard() * 2 - 1) * 105;
    const z = -8 + (hasard() * 2 - 1) * 105;
    const y = hauteurSol(x, z);
    if (y < 0.8) continue;
    const taille = 0.8 + hasard() * 0.9;
    const haut = 2.6 * taille;
    p.set(x, y + haut / 2 - 0.2, z);
    troncs.setMatrixAt(t, m.compose(p, q.identity(), s.set(taille, haut, taille)));
    // Deux boules un peu décalées par arbre : une silhouette moins régulière.
    for (let k = 0; k < 2; k++) {
      p.set(x + (hasard() - 0.5) * 1.2 * taille, y + haut + (0.6 + k * 0.9) * taille, z + (hasard() - 0.5) * 1.2 * taille);
      s.set(1.6 + hasard() * 0.8, 1.3 + hasard() * 0.6, 1.6 + hasard() * 0.8).multiplyScalar(taille * (k ? 0.8 : 1.1));
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hasard() * 6);
      houppiers.setMatrixAt(h, m.compose(p, q, s));
      houppiers.setColorAt(h, couleur.setHSL(0.26 + hasard() * 0.07, 0.42 + hasard() * 0.15, 0.27 + hasard() * 0.12));
      h++;
    }
    t++;
  }
  troncs.count = t;
  houppiers.count = h;
  for (const i of [troncs, houppiers]) {
    i.frustumCulled = false;
    i.receiveShadow = true;
    racine.add(i);
  }

  return { racine, pave };
}
