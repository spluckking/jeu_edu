// Prototype jetable : une petite place de fête foraine, construite en formes simples,
// dont l'habillage dépend entièrement du style reçu.
// Le chamboule-tout (au centre) et le personnage sont poussés au maximum de détail ;
// la confiserie (à gauche) reste simple, pour comparer.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { ColorKey, Style } from './styles.ts';

type Vec3 = [number, number, number];

/** Une couleur du style, ou une couleur fixe (cheveux, yeux, accessoires). */
type Paint = ColorKey | number;

/** Les tenues du personnage, pour juger de l'envie que donnent les accessoires. */
export const OUTFITS = ['Casquette et sac à dos', 'Chapeau haut et ballon', 'Couronne et cape', 'Bonnet et écharpe'];

/** Forme ronde qui remplace le bloc dans les styles à formes rondes. */
type Shape = 'ball' | 'tube' | 'disc';

interface BoxOptions {
  /** Répétition de la texture (style pixel) sur les grandes surfaces. */
  repeat?: number;
  /** Boule, cylindre debout ou disque de face ; ignoré par les styles en blocs. */
  shape?: Shape;
  /** false pour ne pas dessiner de liseré (sol, chemins). */
  rim?: boolean;
  rx?: number;
  ry?: number;
  rz?: number;
}

/** L'allure d'une personne : le héros, le forain ou un visiteur. */
interface Look {
  shirt: Paint;
  trousers: Paint;
  hair: number;
  outfit: number;
  /** Objet tenu en main (ballon, baguette, sucette) selon la tenue. */
  props: boolean;
  moustache?: boolean;
}

interface Person {
  group: THREE.Group;
  /** stride : 0 immobile, 1 en marche. wave : 0 bras baissé, 1 salut de la main. */
  animate(time: number, stride: number, wave: number): void;
}

export interface Fair {
  root: THREE.Group;
  update(time: number): void;
  dispose(): void;
}

const HAIR = 0x5a3a22;
const DARK = 0x2b2233;
const WHITE = 0xffffff;
const GOLD = 0xffcf3a;
const RED = 0xe0424b;

/** Texture 16×16 en nuances de gris clair, pour le grain « pixel ». */
function makeGrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D indisponible');
  let seed = 7;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const value = 200 + Math.floor(random() * 56);
      context.fillStyle = `rgb(${value},${value},${value})`;
      context.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Rampe du cel shading : au lieu d'un dégradé, la lumière ne prend que 2 ou 3 valeurs.
 * La texture couvre l'angle face/soleil de -1 (dos au soleil) à 1 (plein soleil).
 */
function makeToonRamp(bands: 2 | 3): THREE.DataTexture {
  const size = 16;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const facing = -1 + ((i + 0.5) / size) * 2;
    if (bands === 2) data[i] = facing < 0.25 ? 120 : 255;
    else data[i] = facing < 0.2 ? 90 : facing < 0.62 ? 170 : 255;
  }
  const texture = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

export function buildFair(style: Style, outfit = 0): Fair {
  const root = new THREE.Group();
  const materials = new Map<string, THREE.Material>();
  const geometries: THREE.BufferGeometry[] = [];
  const textures = new Map<number, THREE.Texture>();
  const animations: Array<(time: number) => void> = [];

  const grain = style.finish === 'pixel' ? makeGrainTexture() : null;
  if (grain) textures.set(1, grain);
  const toonRamp = style.finish === 'toon' ? makeToonRamp(style.toonBands ?? 3) : null;
  if (toonRamp) textures.set(-1, toonRamp);

  let seed = 23;
  const random = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  function grainFor(repeat: number): THREE.Texture | null {
    if (!grain) return null;
    const known = textures.get(repeat);
    if (known) return known;
    const texture = grain.clone();
    texture.repeat.set(repeat, repeat);
    texture.needsUpdate = true;
    textures.set(repeat, texture);
    return texture;
  }

  function tint(paint: Paint): THREE.Color {
    return new THREE.Color(typeof paint === 'number' ? paint : style.colors[paint]);
  }

  /** La même couleur, plus sombre : pour détacher un détail de son support. */
  function shade(paint: Paint, factor = 0.72): number {
    return tint(paint).multiplyScalar(factor).getHex();
  }

  function surface(key: Paint, repeat = 1): THREE.Material {
    const id = `surface:${key}:${repeat}`;
    const known = materials.get(id);
    if (known) return known;
    const color = tint(key);
    let material: THREE.Material;
    switch (style.finish) {
      case 'pixel':
        material = new THREE.MeshLambertMaterial({ color, map: grainFor(repeat) });
        break;
      case 'wood':
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0 });
        break;
      case 'paper':
        material = new THREE.MeshLambertMaterial({ color });
        break;
      case 'neon':
        material = new THREE.MeshStandardMaterial({
          color: color.multiplyScalar(0.16),
          roughness: 0.85,
          metalness: 0,
        });
        break;
      case 'toon':
        material = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp });
        break;
      case 'clay':
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
        break;
      case 'soft':
        // Le reflet de velours éclaircit les bords des formes, comme sur une peluche.
        material = new THREE.MeshPhysicalMaterial({
          color,
          roughness: 0.75,
          metalness: 0,
          sheen: 1,
          sheenRoughness: 0.5,
          sheenColor: color.clone().lerp(new THREE.Color(0xffffff), 0.5),
        });
        break;
    }
    materials.set(id, material);
    return material;
  }

  function rimMaterial(key: Paint): THREE.Material | null {
    const rim = style.rim;
    if (!rim) return null;
    const id = rim.color === 'own' ? `rim:${key}` : 'rim';
    const known = materials.get(id);
    if (known) return known;
    const color = rim.color === 'own' ? tint(key) : new THREE.Color(rim.color);
    color.multiplyScalar(rim.boost);
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
    materials.set(id, material);
    return material;
  }

  function track<T extends THREE.BufferGeometry>(geometry: T): T {
    geometries.push(geometry);
    return geometry;
  }

  function box(parent: THREE.Object3D, size: Vec3, position: Vec3, key: Paint, options: BoxOptions = {}): THREE.Mesh {
    const [w, h, d] = size;
    const geometry = track(shapeGeometry(size, style.curves ? options.shape : undefined));
    const mesh = new THREE.Mesh(geometry, surface(key, options.repeat));
    mesh.position.set(...position);
    mesh.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
    parent.add(mesh);

    // Liseré : la même forme, un peu plus grande, dont on ne voit que l'intérieur.
    const rim = options.rim === false ? null : rimMaterial(key);
    if (rim && style.rim) {
      const t = style.rim.thickness * 2;
      const hull = new THREE.Mesh(geometry, rim);
      hull.scale.set((w + t) / w, (h + t) / h, (d + t) / d);
      mesh.add(hull);
    }
    return mesh;
  }

  function shapeGeometry(size: Vec3, shape: Shape | undefined): THREE.BufferGeometry {
    const [w, h, d] = size;
    switch (shape) {
      case 'ball':
        return new THREE.SphereGeometry(0.5, 20, 14).scale(w, h, d);
      case 'tube':
        return new THREE.CylinderGeometry(w / 2, w / 2, h, 20).scale(1, 1, d / w);
      case 'disc':
        return new THREE.CylinderGeometry(w / 2, w / 2, d, 20).rotateX(Math.PI / 2).scale(1, h / w, 1);
      case undefined: {
        const round = style.round;
        if (!round) return new THREE.BoxGeometry(w, h, d);
        return new RoundedBoxGeometry(w, h, d, 3, Math.min(Math.min(w, h, d) * round.ratio, round.max));
      }
    }
  }

  // Les petits détails n'ont pas de liseré, sauf en néon où le liseré est la seule lumière.
  const fine = (shape?: Shape): BoxOptions => ({ rim: style.finish === 'neon', shape });

  // --- Ampoules ---------------------------------------------------------
  const bulbGeometry = track(
    style.round || style.curves ? new THREE.SphereGeometry(0.13, 12, 8) : new THREE.BoxGeometry(0.2, 0.2, 0.2),
  );
  let bulbCount = 0;

  function bulb(parent: THREE.Object3D, position: Vec3): void {
    const index = bulbCount++;
    const slot = index % style.bulbs.length;
    const id = `bulb:${slot}`;
    let material = materials.get(id);
    if (!material) {
      const color = new THREE.Color(style.bulbs[slot]).multiplyScalar(style.bulbBoost);
      material = new THREE.MeshBasicMaterial({ color });
      materials.set(id, material);
    }
    const mesh = new THREE.Mesh(bulbGeometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    animations.push((time) => {
      mesh.scale.setScalar(1 + 0.22 * Math.sin(time * 2.2 + index * 1.7));
    });
  }

  const wireMaterial = new THREE.LineBasicMaterial({ color: style.colors.pole });
  materials.set('wire', wireMaterial);

  function wire(parent: THREE.Object3D, points: THREE.Vector3[]): void {
    parent.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(points)), wireMaterial));
  }

  function sagging(from: THREE.Vector3, to: THREE.Vector3, count: number, sag: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const point = from.clone().lerp(to, t);
      point.y -= sag * 4 * t * (1 - t);
      points.push(point);
    }
    return points;
  }

  function garland(from: THREE.Vector3, to: THREE.Vector3, count: number, sag: number): void {
    const points = sagging(from, to, count, sag);
    points.slice(1, -1).forEach((point) => bulb(root, [point.x, point.y - 0.14, point.z]));
    wire(root, points);
  }

  /** Une corde de fanions de couleur. */
  function bunting(from: THREE.Vector3, to: THREE.Vector3, count: number, sag: number): void {
    const points = sagging(from, to, count, sag);
    const turn = -Math.atan2(to.z - from.z, to.x - from.x);
    const paints: ColorKey[] = ['candy1', 'sign', 'candy2', 'candy3', 'awningA'];
    points.slice(1, -1).forEach((point, i) => {
      const paint = paints[i % paints.length] ?? 'sign';
      const flag = box(root, [0.36, 0.36, 0.03], [point.x, point.y - 0.24, point.z], paint, {
        ...fine(),
        ry: turn,
        rz: Math.PI / 4,
      });
      animations.push((time) => {
        flag.rotation.x = Math.sin(time * 2.4 + i * 0.9) * 0.28;
      });
    });
    wire(root, points);
  }

  // --- Sol et chemins ---------------------------------------------------
  box(root, [90, 0.4, 90], [0, -0.2, 0], 'ground', { repeat: 70, rim: false });
  box(root, [3.4, 0.06, 15], [0, 0.03, 2.5], 'path', { repeat: 6, rim: false });
  box(root, [24, 0.07, 3.4], [0, 0.035, 1], 'path', { repeat: 6, rim: false });

  // --- Stand générique --------------------------------------------------
  function stand(x: number, z: number, ry: number, fill: (group: THREE.Group) => void): void {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = ry;
    root.add(group);

    box(group, [4.2, 1, 1], [0, 0.5, 1.3], 'counter');
    box(group, [4.5, 0.16, 1.3], [0, 1.08, 1.3], 'wood');
    for (const sx of [-2, 2]) {
      for (const sz of [-1.3, 1.3]) box(group, [0.28, 3.3, 0.28], [sx, 1.65, sz], 'pole', { shape: 'tube' });
    }
    box(group, [4.2, 2.7, 0.2], [0, 1.55, -1.4], 'wood');

    const awning = new THREE.Group();
    awning.position.set(0, 3.45, 0.1);
    awning.rotation.x = 0.16;
    group.add(awning);
    for (let i = 0; i < 9; i++) {
      const key: ColorKey = i % 2 === 0 ? 'awningA' : 'awningB';
      box(awning, [0.5, 0.14, 3.6], [-2 + i * 0.5, 0, 0], key);
      box(awning, [0.5, 0.42, 0.12], [-2 + i * 0.5, -0.24, 1.8], key);
    }

    for (const sx of [-1, 1]) box(group, [0.16, 0.8, 0.16], [sx, 3.7, 0.6], 'pole', { shape: 'tube' });
    box(group, [2.8, 0.9, 0.22], [0, 4.45, 0.6], 'sign');
    for (let i = 0; i < 7; i++) {
      bulb(group, [-1.35 + i * 0.45, 5.03, 0.6]);
      bulb(group, [-1.35 + i * 0.45, 3.87, 0.74]);
    }
    fill(group);
  }

  // --- Peluche : un lot à gagner ------------------------------------------
  /** hang > 0 : la peluche pend au bout d'un fil de cette longueur et se balance. */
  function plush(parent: THREE.Object3D, position: Vec3, paint: Paint, scale = 1, hang = 0): void {
    const pivot = new THREE.Group();
    pivot.position.set(...position);
    parent.add(pivot);
    const toy = new THREE.Group();
    toy.position.y = -hang;
    toy.scale.setScalar(scale);
    pivot.add(toy);

    box(toy, [0.36, 0.4, 0.3], [0, 0.2, 0], paint, { shape: 'ball' });
    box(toy, [0.3, 0.28, 0.28], [0, 0.5, 0], paint, { shape: 'ball' });
    for (const side of [-1, 1]) {
      box(toy, [0.12, 0.12, 0.08], [side * 0.12, 0.66, 0], paint, fine('ball'));
      box(toy, [0.12, 0.2, 0.12], [side * 0.2, 0.26, 0.04], paint, fine('ball'));
      box(toy, [0.14, 0.14, 0.2], [side * 0.11, 0.05, 0.1], paint, fine('ball'));
      box(toy, [0.04, 0.05, 0.04], [side * 0.07, 0.54, 0.13], DARK, fine('ball'));
    }
    box(toy, [0.14, 0.1, 0.08], [0, 0.46, 0.13], WHITE, fine('ball'));

    if (hang > 0) {
      wire(pivot, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -hang + 0.7 * scale, 0)]);
      animations.push((time) => {
        pivot.rotation.z = Math.sin(time * 1.4 + position[0] * 2) * 0.14;
      });
    }
  }

  // --- Chamboule-tout, poussé au maximum de détail -------------------------
  function fillCans(group: THREE.Group): void {
    // Fond : un soleil de rayons derrière les boîtes.
    for (let i = 0; i < 5; i++) {
      const key: ColorKey = i % 2 === 0 ? 'awningA' : 'sign';
      box(group, [0.16, 1.7, 0.03], [0, 2.75, -1.27], key, { ...fine(), rz: (i * Math.PI) / 5 });
    }
    box(group, [0.5, 0.5, 0.05], [0, 2.75, -1.25], WHITE, fine('disc'));

    // Étagère et pyramide de boîtes, chacune avec son étiquette.
    box(group, [2.6, 0.12, 0.7], [0, 1.75, -0.95], 'wood');
    for (const sx of [-1.1, 1.1]) box(group, [0.16, 1.7, 0.16], [sx, 0.85, -0.95], 'pole', { shape: 'tube' });
    [3, 2, 1].forEach((count, row) => {
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.44;
        const y = 2.04 + row * 0.47;
        box(group, [0.38, 0.46, 0.38], [x, y, -0.95], 'can', { shape: 'tube' });
        box(group, [0.4, 0.18, 0.4], [x, y, -0.95], (i + row) % 2 === 0 ? 'awningA' : 'candy2', fine('tube'));
      }
    });

    // Étagères à lots, de chaque côté.
    const prizes: Paint[] = [0xc98a5a, 'candy1', 'candy2', 0xf2e2c4];
    for (const side of [-1, 1]) {
      box(group, [0.9, 0.08, 0.4], [side * 1.55, 2.3, -1.1], 'wood');
      plush(group, [side * 1.75, 2.34, -1.1], prizes[side < 0 ? 0 : 1] ?? 'candy1', 0.75);
      plush(group, [side * 1.35, 2.34, -1.1], prizes[side < 0 ? 2 : 3] ?? 'candy2', 0.75);
    }

    // Lots suspendus à une tringle, qui se balancent.
    box(group, [0.07, 0.07, 3.9], [0, 3.02, 1.3], 'pole', { shape: 'tube', ry: Math.PI / 2 });
    [-1.75, 1.15, 1.7].forEach((x, i) => {
      plush(group, [x, 3.0, 1.3], prizes[(i + 1) % prizes.length] ?? 'candy1', 0.8, 0.85);
    });

    // Jupe du comptoir à rayures.
    for (let i = 0; i < 8; i++) {
      const key: ColorKey = i % 2 === 0 ? 'awningA' : 'awningB';
      box(group, [0.525, 0.98, 0.05], [-1.84 + i * 0.525, 0.5, 1.83], key);
    }
    box(group, [4.6, 0.05, 1.2], [0, 0.07, 2.7], 'counter', { rim: false });

    // Sur le comptoir : panier de balles, rouleau de tickets, sonnette, gros lot.
    box(group, [0.56, 0.2, 0.56], [-1.3, 1.26, 1.3], 0x9a6a3a, { shape: 'tube' });
    const balls: Array<[number, number, ColorKey]> = [
      [-0.13, -0.08, 'candy1'],
      [0.12, -0.1, 'candy3'],
      [0, 0.12, 'sign'],
      [-0.02, -0.02, 'candy2'],
    ];
    balls.forEach(([dx, dz, key], i) => {
      box(group, [0.24, 0.24, 0.24], [-1.3 + dx, i === 3 ? 1.56 : 1.4, 1.3 + dz], key, { shape: 'ball' });
    });
    box(group, [0.32, 0.32, 0.14], [-0.35, 1.32, 1.4], RED, { shape: 'disc' });
    box(group, [0.14, 0.14, 0.16], [-0.35, 1.32, 1.4], WHITE, fine('disc'));
    box(group, [0.34, 0.05, 0.34], [0.35, 1.19, 1.45], DARK, fine('tube'));
    box(group, [0.28, 0.3, 0.28], [0.35, 1.22, 1.45], GOLD, { shape: 'ball' });
    box(group, [0.07, 0.07, 0.07], [0.35, 1.39, 1.45], DARK, fine('ball'));
    plush(group, [1.5, 1.16, 1.3], 0xc98a5a, 1.5);

    // Enseigne : une cible et des étoiles.
    box(group, [0.74, 0.74, 0.05], [0, 4.45, 0.73], RED, fine('disc'));
    box(group, [0.5, 0.5, 0.05], [0, 4.45, 0.76], WHITE, fine('disc'));
    box(group, [0.26, 0.26, 0.05], [0, 4.45, 0.79], RED, fine('disc'));
    for (const side of [-1, 1]) {
      const star = new THREE.Group();
      star.position.set(side * 0.98, 4.45, 0.74);
      group.add(star);
      box(star, [0.3, 0.3, 0.05], [0, 0, 0], WHITE, fine());
      box(star, [0.3, 0.3, 0.05], [0, 0, 0.01], WHITE, { ...fine(), rz: Math.PI / 4 });
      animations.push((time) => {
        star.rotation.z = time * 0.8 * side;
      });
    }

    // Deux drapeaux qui flottent au-dessus du toit.
    [-2, 2].forEach((x, i) => {
      box(group, [0.07, 1.2, 0.07], [x, 3.9, 1.3], 'pole', { shape: 'tube' });
      const flag = new THREE.Group();
      flag.position.set(x, 4.3, 1.3);
      group.add(flag);
      box(flag, [0.6, 0.34, 0.03], [0.32, 0, 0], i === 0 ? 'candy2' : 'candy1', fine());
      animations.push((time) => {
        flag.rotation.y = Math.sin(time * 3 + i * 2) * 0.5;
      });
    });

    // Tonneau et caisses à côté du stand.
    box(group, [0.62, 0.8, 0.62], [-2.85, 0.4, 1.5], 'wood', { shape: 'tube' });
    for (const y of [0.2, 0.6]) box(group, [0.66, 0.07, 0.66], [-2.85, y, 1.5], DARK, fine('tube'));
    box(group, [0.7, 0.6, 0.7], [-2.9, 0.3, 0.5], 'pole');
    box(group, [0.45, 0.4, 0.45], [-2.9, 0.8, 0.5], 'wood', { ry: 0.4 });

    // Ballons accrochés au coin du stand.
    const balloons: Array<[Vec3, ColorKey]> = [
      [[2.3, 4.7, 1.3], 'candy1'],
      [[2.75, 5.3, 1.05], 'candy2'],
      [[1.95, 5.6, 1.5], 'sign'],
    ];
    balloons.forEach(([position, key], i) => {
      const balloon = box(group, [0.55, 0.65, 0.55], position, key, { shape: 'ball' });
      wire(group, [new THREE.Vector3(2.1, 1.2, 1.3), new THREE.Vector3(...position)]);
      animations.push((time) => {
        balloon.position.y = position[1] + Math.sin(time * 1.3 + i * 2) * 0.07;
      });
    });

    // Le forain, derrière son comptoir, qui salue de temps en temps.
    const keeper = person(group, { shirt: 0xf2f2f2, trousers: DARK, hair: 0x3a2a1c, outfit: 1, props: false, moustache: true });
    keeper.group.position.set(-0.95, 0, 0.3);
    keeper.group.scale.setScalar(1.12);
    animations.push((time) => {
      keeper.animate(time, 0, Math.min(1, Math.max(0, Math.sin(time * 0.7) * 2)));
    });
  }

  // --- Confiserie (laissée simple, pour comparer) --------------------------
  function fillSweets(group: THREE.Group): void {
    const candies: ColorKey[] = ['candy1', 'candy2', 'candy3'];
    candies.forEach((key, i) => {
      const x = -1.4 + i * 0.7;
      box(group, [0.5, 0.62, 0.5], [x, 1.47, 1.3], key, { shape: 'tube' });
      box(group, [0.56, 0.1, 0.56], [x, 1.83, 1.3], 'wood', { shape: 'tube' });
    });
    [-1.35, -0.45, 0.45, 1.35].forEach((x, i) => {
      box(group, [0.08, 0.9, 0.08], [x, 1.9, -1.2], 'awningB', { shape: 'tube' });
      box(group, [0.6, 0.6, 0.14], [x, 2.55, -1.2], candies[i % candies.length] ?? 'candy1', { shape: 'disc' });
    });
    box(group, [0.08, 0.8, 0.08], [1.45, 1.55, 1.3], 'awningB', { shape: 'tube' });
    box(group, [0.62, 0.46, 0.62], [1.45, 2.05, 1.3], 'candy1', { shape: 'ball' });
    box(group, [0.46, 0.36, 0.46], [1.45, 2.44, 1.3], 'candy1', { shape: 'ball' });
  }

  // --- Chantier : le prochain stand s'annonce ----------------------------
  function buildSite(x: number, z: number, ry: number): void {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = ry;
    root.add(group);

    for (let i = 0; i < 10; i++) {
      const key: ColorKey = i % 2 === 0 ? 'fenceA' : 'fenceB';
      box(group, [0.5, 1.7, 0.12], [-2.7 + i * 0.6, 0.85, 2], key);
    }
    for (let i = 0; i < 6; i++) {
      const key: ColorKey = i % 2 === 0 ? 'fenceB' : 'fenceA';
      for (const sx of [-3, 3]) box(group, [0.12, 1.7, 0.5], [sx, 0.85, 1.6 - i * 0.6], key);
    }
    box(group, [5.9, 0.14, 0.16], [0, 1.25, 2.1], 'wood');

    box(group, [0.2, 2.8, 0.2], [-2.2, 1.4, 2.3], 'pole');
    box(group, [1.7, 1.05, 0.16], [-2.2, 3.1, 2.3], 'sign');
    box(group, [0.95, 0.46, 0.08], [-2.2, 3.1, 2.42], 'awningA', { rz: 0.16 });
    bulb(group, [-2.95, 3.72, 2.3]);
    bulb(group, [-1.45, 3.72, 2.3]);

    // Silhouette de la grande roue à venir.
    const ghostColor = new THREE.Color(style.colors.ghost);
    if (style.finish === 'neon') ghostColor.multiplyScalar(1.3);
    const ghost = new THREE.MeshBasicMaterial({
      color: ghostColor,
      transparent: true,
      opacity: style.ghostOpacity,
      depthWrite: false,
    });
    materials.set('ghost', ghost);
    const ghostBox = (parent: THREE.Object3D, size: Vec3, position: Vec3, rz = 0): void => {
      const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(...size)), ghost);
      mesh.position.set(...position);
      mesh.rotation.z = rz;
      parent.add(mesh);
    };
    ghostBox(group, [0.26, 4.5, 0.26], [0.75, 2.1, -0.5], 0.343);
    ghostBox(group, [0.26, 4.5, 0.26], [-0.75, 2.1, -0.5], -0.343);
    const wheel = new THREE.Group();
    wheel.position.set(0, 4.2, -0.5);
    group.add(wheel);
    for (let i = 0; i < 6; i++) ghostBox(wheel, [5.8, 0.12, 0.12], [0, 0, 0], (i * Math.PI) / 6);
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ghostBox(wheel, [0.62, 0.62, 0.5], [Math.cos(angle) * 2.9, Math.sin(angle) * 2.9, 0]);
    }
    animations.push((time) => {
      wheel.rotation.z = time * 0.15;
    });
  }

  // --- Personnes : le héros, le forain, les visiteurs ----------------------
  const shadowGeometry = track(new THREE.CircleGeometry(0.62, 20));
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  materials.set('shadow', shadowMaterial);
  let personCount = 0;

  function person(parent: THREE.Object3D, look: Look): Person {
    const index = personCount++;
    const holder = new THREE.Group();
    parent.add(holder);
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    holder.add(shadow);
    // Tout le corps est dans ce groupe, qui sautille quand la personne marche.
    const group = new THREE.Group();
    holder.add(group);

    const round = style.curves;
    /** Profondeur du visage à cet endroit, pour y poser les yeux et la bouche. */
    const faceZ = (fx: number, fy: number): number =>
      round ? 0.44 * Math.sqrt(Math.max(0.05, 1 - (fx / 0.48) ** 2 - ((fy - 2) / 0.44) ** 2)) : 0.44;
    /** Calotte posée sur la tête : demi-boule dans les styles ronds, bloc sinon. */
    const dome = (size: Vec3, baseY: number, paint: Paint, dz = 0): void => {
      const [w, h, d] = size;
      if (round) box(group, [w, h * 2, d], [0, baseY, dz], paint, { shape: 'ball' });
      else box(group, size, [0, baseY + h / 2, dz], paint);
    };

    // Jambes : chacune pivote à la hanche.
    const leg = (side: number): THREE.Group => {
      const limb = new THREE.Group();
      limb.position.set(side * 0.19, 0.75, 0);
      group.add(limb);
      box(limb, [0.3, 0.5, 0.3], [0, -0.25, 0], look.trousers, { shape: 'tube' });
      box(limb, [0.34, 0.24, 0.5], [0, -0.61, 0.07], WHITE, { shape: 'ball' });
      box(limb, [0.36, 0.08, 0.52], [0, -0.7, 0.07], RED, fine('tube'));
      return limb;
    };
    const legLeft = leg(-1);
    const legRight = leg(1);

    // Corps.
    box(group, [0.8, 0.78, 0.5], [0, 1.13, 0], look.shirt);
    box(group, [0.82, 0.14, 0.52], [0, 1.24, 0], shade(look.shirt), fine());
    box(group, [0.82, 0.1, 0.52], [0, 0.79, 0], DARK, fine());
    box(group, [0.14, 0.12, 0.06], [0, 0.79, 0.27], GOLD, fine());

    // Bras : chacun pivote à l'épaule.
    const arm = (side: number): THREE.Group => {
      const limb = new THREE.Group();
      limb.position.set(side * 0.5, 1.46, 0);
      limb.rotation.z = side * 0.2;
      group.add(limb);
      box(limb, [0.22, 0.56, 0.22], [0, -0.26, 0], look.shirt, { shape: 'tube' });
      box(limb, [0.25, 0.25, 0.25], [0, -0.6, 0], 'skin', { shape: 'ball' });
      return limb;
    };
    const armLeft = arm(-1);
    const armRight = arm(1);

    // Tête et visage.
    box(group, [0.96, 0.88, 0.88], [0, 2.0, 0], 'skin', { shape: 'ball' });
    const eyes: THREE.Mesh[] = [];
    const glints: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      box(group, [0.16, 0.2, 0.14], [side * 0.48, 1.98, 0], 'skin', fine('ball'));
      const ex = side * 0.19;
      const ez = faceZ(ex, 1.95);
      eyes.push(box(group, [0.13, 0.2, 0.08], [ex, 1.95, ez], DARK, fine('ball')));
      glints.push(box(group, [0.05, 0.06, 0.04], [ex + 0.025, 2.0, ez + 0.035], WHITE, fine('ball')));
      box(group, [0.15, 0.1, 0.04], [side * 0.3, 1.8, faceZ(side * 0.3, 1.8)], 0xff9aa8, fine('disc'));
      if (look.moustache) {
        box(group, [0.2, 0.08, 0.07], [side * 0.1, 1.8, faceZ(side * 0.1, 1.8) + 0.02], look.hair, {
          ...fine('ball'),
          rz: side * -0.3,
        });
      }
    }
    const mouthY = look.moustache ? 1.71 : 1.75;
    const mouth = box(group, [0.18, 0.07, 0.06], [0, mouthY, faceZ(0, mouthY)], 0xb8444e, fine('ball'));
    box(group, [0.9, 0.46, 0.3], [0, 2.02, -0.34], look.hair, { shape: 'ball' });
    const hairOnTop = (): void => dome([0.98, 0.26, 0.92], 2.26, look.hair, -0.02);

    // Tenues. Un bras qui tient un objet ne se balance pas.
    let holdsLeft = false;
    let holdsRight = false;
    switch (look.outfit) {
      case 1: {
        // Chapeau haut-de-forme, nœud papillon, ballon.
        hairOnTop();
        box(group, [1.06, 0.07, 1.06], [0, 2.53, 0], DARK, { shape: 'tube' });
        box(group, [0.6, 0.5, 0.6], [0, 2.8, 0], DARK, { shape: 'tube' });
        box(group, [0.63, 0.12, 0.63], [0, 2.63, 0], RED, fine('tube'));
        for (const side of [-1, 1]) box(group, [0.18, 0.15, 0.08], [side * 0.11, 1.5, 0.27], RED, fine('ball'));
        box(group, [0.08, 0.08, 0.1], [0, 1.5, 0.28], GOLD, fine('ball'));
        if (look.props) {
          holdsRight = true;
          wire(group, [new THREE.Vector3(0.6, 0.86, 0), new THREE.Vector3(0.82, 3.25, 0)]);
          const balloon = box(group, [0.55, 0.66, 0.55], [0.82, 3.55, 0], 'candy1', { shape: 'ball' });
          animations.push((time) => {
            balloon.scale.setScalar(1 + Math.sin(time * 1.6) * 0.03);
          });
        }
        break;
      }
      case 2: {
        // Couronne, cape, baguette.
        hairOnTop();
        box(group, [0.66, 0.16, 0.66], [0, 2.5, 0], GOLD, { shape: 'tube' });
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          box(group, [0.12, 0.2, 0.12], [Math.sin(angle) * 0.27, 2.66, Math.cos(angle) * 0.27], GOLD, fine());
        }
        box(group, [0.1, 0.1, 0.06], [0, 2.5, 0.33], RED, fine('ball'));
        box(group, [0.92, 1.15, 0.08], [0, 0.98, -0.36], RED, { rx: 0.14 });
        box(group, [0.9, 0.14, 0.58], [0, 1.5, 0], RED);
        box(group, [0.12, 0.12, 0.08], [0, 1.5, 0.3], GOLD, fine('ball'));
        if (look.props) {
          holdsLeft = true;
          box(group, [0.05, 0.75, 0.05], [-0.6, 1.2, 0.1], WHITE, fine('tube'));
          box(group, [0.2, 0.2, 0.07], [-0.6, 1.62, 0.1], GOLD, { ...fine(), rz: Math.PI / 4 });
        }
        break;
      }
      case 3: {
        // Bonnet à pompon, écharpe, sucette.
        dome([1.02, 0.36, 0.98], 2.26, 0x3f8fe0);
        box(group, [1.05, 0.16, 1.01], [0, 2.3, 0], WHITE, { shape: 'tube' });
        box(group, [0.26, 0.26, 0.26], [0, 2.72, 0], WHITE, { shape: 'ball' });
        box(group, [0.62, 0.18, 0.6], [0, 1.56, 0], 0xff8a3a, { shape: 'tube' });
        box(group, [0.2, 0.5, 0.08], [0.2, 1.3, 0.29], 0xff8a3a);
        if (look.props) {
          holdsRight = true;
          box(group, [0.05, 0.6, 0.05], [0.6, 1.15, 0.12], WHITE, fine('tube'));
          box(group, [0.34, 0.34, 0.08], [0.6, 1.55, 0.12], 'candy1', { shape: 'disc' });
        }
        break;
      }
      default: {
        // Casquette et sac à dos.
        dome([1.02, 0.34, 0.98], 2.26, 'hat');
        box(group, [0.56, 0.07, 0.38], [0, 2.3, 0.58], shade('hat'), { shape: 'tube' });
        box(group, [0.12, 0.1, 0.12], [0, 2.61, 0], WHITE, fine('ball'));
        box(group, [0.56, 0.62, 0.26], [0, 1.14, -0.38], 'candy3');
        box(group, [0.36, 0.26, 0.08], [0, 1.02, -0.53], shade('candy3'), fine());
        for (const side of [-1, 1]) box(group, [0.1, 0.74, 0.05], [side * 0.25, 1.16, 0.26], 'candy3', fine());
        break;
      }
    }

    return {
      group: holder,
      animate(time: number, stride: number, wave: number): void {
        const phase = time * 7 + index * 1.3;
        const swing = Math.sin(phase) * 0.55 * stride;
        legLeft.rotation.x = swing;
        legRight.rotation.x = -swing;
        armLeft.rotation.set(holdsLeft ? 0 : -swing * 0.9, 0, -0.2);
        armRight.rotation.set(holdsRight ? 0 : swing * 0.9, 0, 0.2);
        if (wave > 0) {
          // Salut de la main, avec le bras qui ne tient rien.
          const lift = 0.2 + wave * (2.3 + Math.sin(time * 9) * 0.35);
          if (holdsLeft) armRight.rotation.set(0, 0, lift);
          else armLeft.rotation.set(0, 0, -lift);
        }
        group.position.y = Math.abs(Math.sin(phase)) * 0.05 * stride;
        // Clin d'œil régulier, et sourire plus grand pendant le salut.
        const blinking = (time + index * 0.7) % 3.4 < 0.13;
        for (const eye of eyes) eye.scale.y = blinking ? 0.12 : 1;
        for (const glint of glints) glint.visible = !blinking;
        mouth.scale.set(1 + wave * 0.5, 1 + wave * 1.2, 1);
      },
    };
  }

  /** Le héros marche en rond, puis s'arrête face à nous et salue. */
  function buildHero(x: number, z: number): void {
    const hero = person(root, { shirt: 'shirt', trousers: 'trousers', hair: HAIR, outfit, props: true });
    hero.group.position.set(x, 0.06, z);
    hero.group.rotation.y = 0.35;
    const radius = 1.5;
    const walkFor = 7;
    const cycle = walkFor + 2.8;
    animations.push((time) => {
      const turn = Math.floor(time / cycle);
      const within = time - turn * cycle;
      const angle = (turn * walkFor + Math.min(within, walkFor)) * 0.75;
      hero.group.position.set(x + Math.sin(angle) * radius, 0.06, z + Math.cos(angle) * radius);
      const stop =
        within < walkFor ? 0 : Math.min(1, (within - walkFor) / 0.5) * Math.min(1, (cycle - within) / 0.5);
      const heading = angle + Math.PI / 2;
      const facing = 0.2 + Math.PI * 2 * Math.round((heading - 0.2) / (Math.PI * 2));
      hero.group.rotation.y = heading + (facing - heading) * stop;
      hero.animate(time, 1 - stop, stop);
    });
  }

  /** Des visiteurs qui vont et viennent sur l'allée. */
  function buildVisitors(): void {
    const looks: Look[] = [
      { shirt: 0xffb347, trousers: 0x4a6fa5, hair: 0x2b2233, outfit: 3, props: true },
      { shirt: 0x7bd389, trousers: 0x7a5c9a, hair: 0xc98a3a, outfit: 1, props: true },
      { shirt: 0xff7aa2, trousers: 0x3d5a80, hair: 0x8a4b2a, outfit: 0, props: true },
      { shirt: 0xb48cf2, trousers: 0x5b6b7a, hair: 0xe2c06a, outfit: 2, props: true },
    ];
    const span = 19;
    looks.forEach((look, i) => {
      const visitor = person(root, look);
      const z = 1.3 + i * 0.42;
      const speed = 0.9 + i * 0.17;
      const offset = i * 9.7;
      visitor.group.scale.setScalar(0.92 + (i % 3) * 0.12);
      const place = (time: number): void => {
        const along = (time * speed + offset) % (span * 2);
        const forward = along < span;
        visitor.group.position.set(-span / 2 + (forward ? along : span * 2 - along), 0.06, z);
        visitor.group.rotation.y = forward ? Math.PI / 2 : -Math.PI / 2;
      };
      place(0);
      animations.push((time) => {
        place(time);
        visitor.animate(time, 1, 0);
      });
    });
  }

  // --- Arbres, nuages, ballons, confettis ----------------------------------
  function tree(x: number, z: number, scale: number): void {
    box(root, [0.5 * scale, 1.6 * scale, 0.5 * scale], [x, 0.8 * scale, z], 'pole', { shape: 'tube' });
    box(root, [2.6 * scale, 2.4 * scale, 2.6 * scale], [x, 2.6 * scale, z], 'candy3', { shape: 'ball' });
    box(root, [1.8 * scale, 1.7 * scale, 1.8 * scale], [x + 0.7 * scale, 3.7 * scale, z + 0.2], 'candy3', {
      shape: 'ball',
    });
  }

  function cloud(x: number, y: number, z: number): void {
    const parts: Array<[Vec3, Vec3]> = [
      [[5, 2.2, 2.6], [0, 0, 0]],
      [[3.2, 2.4, 2.4], [-1.2, 1, 0]],
      [[2.8, 1.8, 2.2], [1.6, 0.7, 0]],
    ];
    for (const [size, offset] of parts) {
      box(root, size, [x + offset[0], y + offset[1], z + offset[2]], 0xffffff, { shape: 'ball', rim: false });
    }
  }

  /** Des ballons lâchés qui montent dans le ciel. */
  function risingBalloons(): void {
    const paints: ColorKey[] = ['candy1', 'candy2', 'sign', 'candy3', 'awningA'];
    paints.forEach((paint, i) => {
      const x = -13 + random() * 26;
      const z = -14 + random() * 9;
      const balloon = box(root, [0.6, 0.72, 0.6], [x, 6 + i * 2.4, z], paint, { shape: 'ball' });
      animations.push((time) => {
        const height = (time * 0.7 + i * 3.6) % 18;
        balloon.position.set(x + Math.sin(time * 0.6 + i) * 0.5, 2 + height, z);
        // Le ballon grandit au départ et rétrécit avant de disparaître, sans à-coup.
        balloon.scale.setScalar(Math.max(0.01, Math.min(1, height, (18 - height) / 2)));
      });
    });
  }

  /** Une pluie de confettis au-dessus du chamboule-tout. */
  function confetti(): void {
    const count = 130;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const drift: number[] = [];
    const palette = [style.colors.candy1, style.colors.candy2, style.colors.candy3, style.colors.sign];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -3.6 + random() * 7.2;
      positions[i * 3 + 1] = 0.5 + random() * 8;
      positions[i * 3 + 2] = -7.5 + random() * 6;
      drift.push(0.6 + random() * 0.8);
      const color = new THREE.Color(palette[i % palette.length]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const start = positions.slice();
    const geometry = track(new THREE.BufferGeometry());
    const attribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', attribute);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true });
    materials.set('confetti', material);
    root.add(new THREE.Points(geometry, material));
    animations.push((time) => {
      for (let i = 0; i < count; i++) {
        const speed = drift[i] ?? 1;
        const fallen = ((start[i * 3 + 1] ?? 0) - time * speed) % 8;
        positions[i * 3] = (start[i * 3] ?? 0) + Math.sin(time * speed * 2 + i) * 0.25;
        positions[i * 3 + 1] = 0.5 + (fallen < 0 ? fallen + 8 : fallen);
      }
      attribute.needsUpdate = true;
    });
  }

  // --- Chapiteaux au loin ------------------------------------------------
  function tent(x: number, z: number): void {
    box(root, [5.2, 2.2, 5.2], [x, 1.1, z], 'awningB', { shape: 'tube' });
    for (let i = 0; i < 5; i++) {
      const side = 6 - i * 1.2;
      const key: ColorKey = i % 2 === 0 ? 'awningA' : 'awningB';
      box(root, [side, 0.9, side], [x, 2.65 + i * 0.9, z], key, { shape: 'tube' });
    }
    bulb(root, [x, 7.0, z]);
  }

  // --- Assemblage -------------------------------------------------------
  stand(-6.6, -1.5, 0.5, fillSweets);
  stand(0, -5, 0, fillCans);
  buildSite(6.9, -1.5, -0.5);
  buildHero(0, 5);
  buildVisitors();
  tent(-14, -16);
  tent(1, -20);
  tent(15, -16);
  tree(-12, -7, 1.1);
  tree(12.5, -8, 1.2);
  tree(-14, 2.5, 1);
  tree(14, 3, 0.9);
  tree(-6.5, -13, 1.3);
  tree(7.5, -13.5, 1.15);
  if (!style.stars) {
    cloud(-20, 17, -34);
    cloud(4, 21, -40);
    cloud(24, 15, -32);
  }
  risingBalloons();
  confetti();

  const corners: Vec3[] = [
    [-10.5, 0, 5],
    [10.5, 0, 5],
    [-10.5, 0, -9],
    [10.5, 0, -9],
  ];
  for (const [x, , z] of corners) box(root, [0.3, 5.6, 0.3], [x, 2.8, z], 'pole', { shape: 'tube' });
  box(root, [0.34, 8, 0.34], [0, 4, -10.5], 'pole', { shape: 'tube' });
  const top = (index: number): THREE.Vector3 => {
    const corner = corners[index] ?? [0, 0, 0];
    return new THREE.Vector3(corner[0], 5.6, corner[2]);
  };
  const mast = new THREE.Vector3(0, 8, -10.5);
  garland(top(0), top(2), 12, 0.7);
  garland(top(1), top(3), 12, 0.7);
  garland(top(2), mast, 10, 0.6);
  garland(mast, top(3), 10, 0.6);
  garland(top(0), mast, 16, 0.9);
  garland(top(1), mast, 16, 0.9);
  bunting(new THREE.Vector3(-10.5, 4.6, 5), new THREE.Vector3(-2, 4.5, -3.7), 13, 0.8);
  bunting(new THREE.Vector3(10.5, 4.6, 5), new THREE.Vector3(2, 4.5, -3.7), 13, 0.8);

  if (style.stars) {
    const positions: number[] = [];
    for (let i = 0; i < 220; i++) {
      const angle = random() * Math.PI * 2;
      const height = 0.18 + random() * 0.8;
      const radius = Math.sqrt(1 - height * height) * 80;
      positions.push(Math.cos(angle) * radius, height * 80, Math.sin(angle) * radius);
    }
    const geometry = track(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(0xffffff).multiplyScalar(1.4),
      size: 2.2,
      sizeAttenuation: false,
      fog: false,
    });
    materials.set('stars', material);
    root.add(new THREE.Points(geometry, material));
  }

  return {
    root,
    update(time: number): void {
      for (const animate of animations) animate(time);
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials.values()) material.dispose();
      for (const texture of textures.values()) texture.dispose();
    },
  };
}
