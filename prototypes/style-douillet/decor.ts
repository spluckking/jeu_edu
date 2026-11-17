// Prototype jetable : un coin de fête foraine en couleurs pastel, ambiance douillette.

import * as THREE from 'three';
import { creerHeros, peinture, piece } from './heros.ts';

const boule = new THREE.SphereGeometry(1, 20, 14);

function toile(l: number, h: number, dessiner: (g: CanvasRenderingContext2D) => void, repete: [number, number] = [1, 1]): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = l;
  c.height = h;
  const g = c.getContext('2d');
  if (g) dessiner(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repete);
  t.anisotropy = 4;
  return t;
}

// Herbe semée de petites fleurs.
const herbe = toile(
  256,
  256,
  (g) => {
    g.fillStyle = '#8fd47a';
    g.fillRect(0, 0, 256, 256);
    let graine = 7;
    const hasard = (): number => ((graine = (graine * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = hasard() > 0.5 ? '#9fdc86' : '#80c96d';
      g.fillRect(hasard() * 256, hasard() * 256, 6, 3);
    }
    const fleurs = ['#ffffff', '#ffd6e4', '#fff2a6', '#d9ccff'];
    for (let i = 0; i < 70; i++) {
      const x = hasard() * 256;
      const y = hasard() * 256;
      g.fillStyle = fleurs[i % fleurs.length]!;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffc94a';
      g.beginPath();
      g.arc(x, y, 1.6, 0, Math.PI * 2);
      g.fill();
    }
  },
  [14, 14],
);

// Allée en dalles crème.
const dalles = toile(
  128,
  128,
  (g) => {
    g.fillStyle = '#efd9b4';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#dcc097';
    g.lineWidth = 3;
    for (const [x, y, l, h] of [[2, 2, 60, 40], [66, 2, 60, 58], [2, 46, 60, 80], [66, 64, 60, 62]] as const) {
      g.beginPath();
      g.roundRect(x, y, l, h, 10);
      g.stroke();
    }
  },
  [2, 10],
);

const rayuresAuvent = (a: string, b: string): THREE.Texture =>
  toile(128, 16, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? b : a;
      g.fillRect(i * 16, 0, 16, 16);
    }
  });

/** Un stand en bois peint, avec un auvent rayé festonné. */
function stand(parent: THREE.Object3D, x: number, z: number, ry: number, a: string, b: string, comptoir: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  parent.add(g);
  piece(g, new THREE.BoxGeometry(3.2, 1.1, 1.1), comptoir, [0, 0.55, 0]);
  piece(g, new THREE.BoxGeometry(3.3, 0.12, 1.2), 0xfdf7ee, [0, 1.14, 0]);
  piece(g, new THREE.BoxGeometry(3.2, 2.4, 0.15), 0xfdf3e3, [0, 1.2, -1.2]);
  for (const px of [-1.5, 1.5]) for (const pz of [-1.2, 0.45]) piece(g, new THREE.CylinderGeometry(0.07, 0.07, 2.6, 10), 0xffffff, [px, 1.3, pz]);
  const auvent = new THREE.CylinderGeometry(0.01, 1, 1, 32, 1, true, -Math.PI / 2, Math.PI);
  const tex = rayuresAuvent(a, b);
  const toit = piece(g, auvent, peinture(0xffffff, tex), [0, 2.65, -0.35], [1.75, 0.5, 1.0]);
  toit.material = new THREE.MeshToonMaterial({ color: 0xffffff, map: tex, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    piece(g, new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), i % 2 ? Number(`0x${b.slice(1)}`) : Number(`0x${a.slice(1)}`), [-1.53 + i * 0.437, 2.17, 0.62], [1, 0.9, 0.3]);
  }
  // Peluches et bocaux sur le comptoir.
  piece(g, boule, 0xf6b3c9, [-0.9, 1.45, -0.1], [0.24, 0.24, 0.22]);
  piece(g, boule, 0xf6b3c9, [-0.9, 1.75, -0.1], [0.2, 0.18, 0.18]);
  piece(g, boule, 0xc8a7f0, [0.9, 1.45, -0.1], [0.24, 0.24, 0.22]);
  piece(g, boule, 0xc8a7f0, [0.9, 1.75, -0.1], [0.2, 0.18, 0.18]);
  return g;
}

/** Les tasses qui tournent, autour d'une grosse théière. */
function tasses(parent: THREE.Object3D, x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  piece(g, new THREE.CylinderGeometry(3, 3.15, 0.3, 40), 0xfdf3e3, [0, 0.15, 0]);
  piece(g, new THREE.CylinderGeometry(3.18, 3.18, 0.1, 40), 0xb6e3d0, [0, 0.28, 0]);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    piece(g, boule, i % 2 ? 0xffe27a : 0xffffff, [Math.sin(a) * 3.15, 0.17, Math.cos(a) * 3.15], [0.07, 0.07, 0.07]);
  }
  // Théière au centre.
  piece(g, boule, 0xa8e0a0, [0, 1.1, 0], [0.75, 0.62, 0.75]);
  piece(g, new THREE.CylinderGeometry(0.3, 0.45, 0.25, 20), 0xfdf3e3, [0, 1.75, 0]);
  piece(g, boule, 0xf6b3c9, [0, 1.95, 0], [0.12, 0.12, 0.12]);
  piece(g, new THREE.CylinderGeometry(0.06, 0.13, 0.7, 12), 0xa8e0a0, [0.75, 1.25, 0], [1, 1, 1], [0, 0, -0.9]);
  piece(g, new THREE.TorusGeometry(0.3, 0.07, 8, 20, Math.PI), 0xa8e0a0, [-0.75, 1.15, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  const plateau = new THREE.Group();
  plateau.name = 'plateau';
  g.add(plateau);
  const profil = [0.05, 0.5, 0.62, 0.7, 0.72].map((r, i) => new THREE.Vector2(r, i * 0.17));
  const tasse = new THREE.LatheGeometry(profil, 32);
  const couleurs = [0xf6b3c9, 0x9fd6f0, 0xffe27a];
  couleurs.forEach((c, i) => {
    const a = (i / 3) * Math.PI * 2;
    const t = new THREE.Group();
    t.position.set(Math.sin(a) * 2, 0.33, Math.cos(a) * 2);
    plateau.add(t);
    const m = piece(t, tasse, c, [0, 0, 0]);
    (m.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
    piece(t, new THREE.TorusGeometry(0.72, 0.05, 8, 32), 0xffffff, [0, 0.69, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    piece(t, new THREE.TorusGeometry(0.2, 0.06, 8, 16), c, [0.78, 0.38, 0], [1, 1, 1], [0, 0, 0]);
    piece(t, new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), 0xdadada, [0, 0.4, 0]);
    piece(t, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), 0xffffff, [0, 0.6, 0]);
  });
  return g;
}

function barriere(parent: THREE.Object3D, x0: number, x1: number, z: number): void {
  for (let x = x0; x <= x1; x += 0.42) {
    piece(parent, new THREE.BoxGeometry(0.26, 0.95, 0.08), Math.round((x - x0) / 0.42) % 2 ? 0xffc7d6 : 0xfff6ee, [x, 0.47, z]);
    piece(parent, new THREE.ConeGeometry(0.15, 0.18, 4), 0xfff6ee, [x, 1.02, z], [1, 1, 0.4], [0, Math.PI / 4, 0]);
  }
  for (const y of [0.3, 0.7]) piece(parent, new THREE.BoxGeometry(x1 - x0 + 0.3, 0.08, 0.06), 0xfff6ee, [(x0 + x1) / 2, y, z - 0.07]);
}

function bouquetDeBallons(parent: THREE.Object3D, x: number, z: number, couleurs: number[]): void {
  couleurs.forEach((c, i) => {
    const a = i * 2.1;
    const p = new THREE.Vector3(x + Math.sin(a) * 0.35, 2.7 + (i % 2) * 0.35, z + Math.cos(a) * 0.35);
    piece(parent, boule, c, [p.x, p.y, p.z], [0.3, 0.36, 0.3]);
    const fil = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().setY(p.y - 0.35), new THREE.Vector3(x, 0.6, z)]), new THREE.LineBasicMaterial({ color: 0xffffff }));
    parent.add(fil);
  });
  piece(parent, new THREE.CylinderGeometry(0.12, 0.16, 0.6, 12), 0xfdf3e3, [x, 0.3, z]);
}

function guirlande(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const couleurs = [0xf6b3c9, 0xffe27a, 0x9fd6f0, 0xb6e3a8, 0xc8a7f0];
  const n = Math.round(a.distanceTo(b) / 0.45);
  const fanion = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.17, 0, 0), new THREE.Vector3(0.17, 0, 0), new THREE.Vector3(0, -0.36, 0)]);
  fanion.computeVertexNormals();
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * 0.6;
    points.push(p);
    if (i < n) {
      const m = new THREE.Mesh(fanion, new THREE.MeshBasicMaterial({ color: couleurs[i % couleurs.length], side: THREE.DoubleSide }));
      m.position.copy(p);
      m.lookAt(p.clone().add(new THREE.Vector3(0, 0, 1)));
      m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      parent.add(m);
    }
  }
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffffff })));
}

function arbreTaille(parent: THREE.Object3D, x: number, z: number): void {
  piece(parent, new THREE.CylinderGeometry(0.12, 0.15, 0.8, 8), 0x9a6b4a, [x, 0.4, z]);
  piece(parent, boule, 0x5fb36a, [x, 1.2, z], [0.6, 0.6, 0.6]);
  piece(parent, boule, 0x6cc078, [x, 1.95, z], [0.45, 0.45, 0.45]);
  piece(parent, new THREE.CylinderGeometry(0.35, 0.3, 0.4, 12), 0xf6b3c9, [x, 0.2, z]);
}

function distributeur(parent: THREE.Object3D, x: number, z: number): void {
  piece(parent, new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), 0xe8a0b4, [x, 0.4, z]);
  piece(parent, new THREE.CylinderGeometry(0.28, 0.32, 0.35, 16), 0xf27a9a, [x, 0.95, z]);
  const verre = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05 }));
  verre.position.set(x, 1.45, z);
  parent.add(verre);
  const c = [0xffe27a, 0x9fd6f0, 0xf6b3c9, 0xb6e3a8, 0xc8a7f0];
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4;
    const r = 0.22 * Math.sqrt((i % 11) / 11);
    piece(parent, boule, c[i % 5]!, [x + Math.sin(a) * r, 1.28 + (i / 22) * 0.35, z + Math.cos(a) * r], [0.08, 0.08, 0.08]);
  }
  piece(parent, boule, 0xf27a9a, [x, 1.86, z], [0.12, 0.08, 0.12]);
}

/** La grande porte pastel au fond, avec ses tours coiffées de cônes. */
function portail(parent: THREE.Object3D, z: number): void {
  const rose = 0xffd3df;
  const creme = 0xfdf3e3;
  const menthe = 0xb6e3c8;
  const rayures = toile(64, 8, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#ffd3df' : '#fdf3e3';
      g.fillRect(i * 8, 0, 8, 8);
    }
  }, [6, 1]);
  const mur = piece(parent, new THREE.BoxGeometry(22, 4.5, 1), peinture(0xffffff, rayures), [0, 2.25, z]);
  mur.material = new THREE.MeshToonMaterial({ map: rayures });
  piece(parent, new THREE.BoxGeometry(22.4, 0.4, 1.3), menthe, [0, 4.6, z]);
  for (const x of [-11, -5.5, 5.5, 11, -2.3, 2.3]) {
    const haute = Math.abs(x) === 2.3;
    const h = haute ? 8 : 6.2;
    piece(parent, new THREE.CylinderGeometry(0.9, 1, h, 20), Math.abs(x) === 2.3 ? creme : 0xfff1cf, [x, h / 2, z + 0.4]);
    piece(parent, new THREE.CylinderGeometry(1.1, 1.1, 0.35, 20), menthe, [x, h, z + 0.4]);
    piece(parent, new THREE.ConeGeometry(1.15, 2, 20), rose, [x, h + 1.15, z + 0.4]);
    piece(parent, boule, 0xffe27a, [x, h + 2.25, z + 0.4], [0.16, 0.16, 0.16]);
    piece(parent, new THREE.CapsuleGeometry(0.28, 0.5, 4, 12), menthe, [x, h * 0.62, z + 1.35]);
  }
  // L'arche d'entrée.
  piece(parent, new THREE.TorusGeometry(2, 0.35, 12, 32, Math.PI), menthe, [0, 4.6, z + 0.6]);
  piece(parent, new THREE.BoxGeometry(3.4, 0.9, 0.3), creme, [0, 6.3, z + 0.7]);
  piece(parent, new THREE.BoxGeometry(3.8, 4.6, 0.9), 0xc7e9ff, [0, 2.3, z + 0.2]);
}

function nuage(parent: THREE.Object3D, x: number, y: number, z: number, s: number): void {
  const blanc = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [dx, dy, r] of [[0, 0, 1.4], [1.5, -0.3, 1.1], [-1.5, -0.3, 1.1], [0.7, 0.6, 1]] as const) {
    const m = new THREE.Mesh(boule, blanc);
    m.position.set(x + dx * s, y + dy * s, z);
    m.scale.setScalar(r * s);
    parent.add(m);
  }
}

export interface LieuStand {
  nom: string;
  /** Centre du stand et sens dans lequel il regarde (vers le visiteur). */
  x: number;
  z: number;
  ry: number;
  /** Rayon à ne pas traverser. */
  rayon: number;
}

export const STANDS: LieuStand[] = [
  { nom: 'Chamboule-tout', x: -7.5, z: -6, ry: 0.35, rayon: 1.9 },
  { nom: 'Confiserie', x: 7.5, z: -6, ry: -0.35, rayon: 1.9 },
  { nom: 'Pêche aux canards', x: -9, z: 3, ry: 1.2, rayon: 1.9 },
  { nom: 'Les tasses', x: 4.8, z: 1.5, ry: -0.6, rayon: 3.3 },
];

export interface Decor {
  racine: THREE.Group;
  animer(t: number): void;
}

export function construireDecor(): Decor {
  const racine = new THREE.Group();
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshToonMaterial({ map: herbe }));
  sol.rotation.x = -Math.PI / 2;
  racine.add(sol);
  const allee = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 30), new THREE.MeshToonMaterial({ map: dalles }));
  allee.rotation.x = -Math.PI / 2;
  allee.position.set(0, 0.02, 2);
  racine.add(allee);

  portail(racine, -16);
  stand(racine, -7.5, -6, 0.35, '#ffb3c7', '#fff6ee', 0xffd3df);
  stand(racine, 7.5, -6, -0.35, '#9fd6f0', '#fff6ee', 0xc7e9ff);
  stand(racine, -9, 3, 1.2, '#ffe27a', '#fff6ee', 0xfff1cf);
  const manege = tasses(racine, 4.8, 1.5);
  distributeur(racine, -4.2, 4.5);
  distributeur(racine, -5, 4.9);
  bouquetDeBallons(racine, -3.5, -3, [0xf6b3c9, 0x9fd6f0, 0xffe27a]);
  bouquetDeBallons(racine, 3.2, -4, [0xc8a7f0, 0xb6e3a8, 0xf6b3c9]);
  for (const [x, z] of [[-12, -11], [12, -11], [-11, 8], [11, 9], [9.5, -1.5]] as const) arbreTaille(racine, x, z);
  barriere(racine, -11, -2.3, 11);
  barriere(racine, 2.3, 11, 11);
  guirlande(racine, new THREE.Vector3(-9, 3.4, -6.5), new THREE.Vector3(-2.2, 3.8, -9));
  guirlande(racine, new THREE.Vector3(2.2, 3.8, -9), new THREE.Vector3(9, 3.4, -6.5));
  guirlande(racine, new THREE.Vector3(-6, 3.4, -5), new THREE.Vector3(6, 3.4, -5));
  for (const [x, y, z, s] of [[-18, 16, -40, 2.2], [6, 19, -45, 2.8], [24, 14, -38, 2]] as const) nuage(racine, x, y, z, s);

  // Des forains et visiteurs dans le même style que le héros.
  const gens = [
    { pos: [-7.5 - Math.sin(0.35) * 0.6, -6 - Math.cos(0.35) * 0.6, 0.35], choix: { chapeau: 'paille', lunettes: 'rien', haut: 'salopette', chaussures: 'brunes', objet: 'rien', cheveux: 0x6b4430, peau: 0xf5c9a8 } },
    { pos: [7.5 + Math.sin(0.35) * 0.6, -6 - Math.cos(0.35) * 0.6, -0.35], choix: { chapeau: 'magicien', lunettes: 'rondes', haut: 'lilas', chaussures: 'bleues', objet: 'baguette', cheveux: 0xd9d4cf, peau: 0xe8b996 } },
    { pos: [-1.6, 3.5, 2.4], choix: { chapeau: 'bonnet', lunettes: 'rien', haut: 'menthe', chaussures: 'rouges', objet: 'ballon', cheveux: 0xc76a3a, peau: 0xfadcc6 } },
    { pos: [2, -1.5, -0.6], choix: { chapeau: 'rien', lunettes: 'rien', haut: 'corail', chaussures: 'pluie', objet: 'sucette', cheveux: 0x2f2430, peau: 0xb07a55 } },
  ] as const;
  const animes = gens.map(({ pos, choix }) => {
    const h = creerHeros({ ...choix });
    h.racine.position.set(pos[0], 0, pos[1]);
    h.racine.rotation.y = pos[2];
    racine.add(h.racine);
    return h;
  });

  const plateau = manege.getObjectByName('plateau');
  return {
    racine,
    animer(t) {
      if (plateau) {
        plateau.rotation.y = t * 0.5;
        plateau.children.forEach((c, i) => (c.rotation.y = -t * (1.2 + i * 0.2)));
      }
      animes.forEach((h, i) => h.animer(t + i, 0));
    },
  };
}
