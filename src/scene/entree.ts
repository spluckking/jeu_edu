// La grande entrée de la fête, comme celle d'un parc d'attractions : deux tours rayées,
// une arche d'ampoules, une enseigne, des tourniquets, la billetterie et l'allée d'arrivée.

import * as THREE from 'three';
import { AMPOULES, Atelier, type Peinture, type Vec3 } from './atelier.ts';

export interface Entree {
  racine: THREE.Group;
  obstacles: THREE.Box3[];
  mettreAJour(temps: number): void;
  /** Vrai si ce point est dans la fête (ou sur l'allée d'arrivée) : on ne sort pas dans le vide. */
  dansLaFete(x: number, z: number): boolean;
}

const Z = 12;
/** Les palissades : côtés en ±BORD, fond en FOND ; l'allée d'arrivée va jusqu'à FIN_ALLEE. */
const BORD = 25;
const FOND = -42;
const FIN_ALLEE = 33;

function enseigne(texte: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 200;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#ffd447';
    g.beginPath();
    g.roundRect(8, 8, 1008, 184, 60);
    g.fill();
    g.lineWidth = 14;
    g.strokeStyle = '#ff5a6e';
    g.stroke();
    g.fillStyle = '#3a2f4a';
    g.font = '700 112px Andika, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(texte, 512, 108);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.7), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

export function construireEntree(): Entree {
  const atelier = new Atelier();
  const racine = new THREE.Group();
  const f = (taille: Vec3, position: Vec3, p: Peinture, o = {}): THREE.Mesh => atelier.forme(racine, taille, position, p, o);
  const obstacles: THREE.Box3[] = [];
  // Ampoules fixes : elles sont fusionnées avec le reste (peu d'appels de dessin).
  const ampoule = (x: number, y: number, z: number, i: number): void => {
    atelier.forme(racine, [0.3, 0.3, 0.3], [x, y, z], AMPOULES[i % AMPOULES.length] ?? 0xffffff, { forme: 'boule', lumineux: true });
  };

  // Deux tours rayées, avec un toit en cône et un fanion.
  for (const x of [-5.2, 5.2]) {
    for (let i = 0; i < 7; i++) f([2.4, 1, 2.4], [x, 0.5 + i, Z], i % 2 === 0 ? 'toileA' : 'toileB', { forme: 'tube' });
    f([2.8, 0.3, 2.8], [x, 7.15, Z], 'enseigne', { forme: 'tube' });
    for (let i = 0; i < 4; i++) f([2.4 - i * 0.6, 0.6, 2.4 - i * 0.6], [x, 7.6 + i * 0.55, Z], i % 2 === 0 ? 'toileA' : 'bonbon2', { forme: 'tube' });
    f([0.08, 1.4, 0.08], [x, 10.5, Z], 'poteau', { forme: 'tube' });
    f([0.9, 0.5, 0.04], [x + 0.45, 10.9, Z], 'bonbon3');
    obstacles.push(new THREE.Box3(new THREE.Vector3(x - 1.4, 0, Z - 1.4), new THREE.Vector3(x + 1.4, 8, Z + 1.4)));
  }
  // L'arche : une demi-couronne de blocs, bordée d'ampoules.
  const segments = 14;
  for (let i = 0; i <= segments; i++) {
    const a = Math.PI - (i / segments) * Math.PI;
    const x = Math.cos(a) * 5.2;
    const y = 7.4 + Math.sin(a) * 2.2;
    f([0.9, 0.55, 0.7], [x, y, Z], i % 2 === 0 ? 'toileA' : 'enseigne', { rz: a - Math.PI / 2 });
    ampoule(x, y + 0.45, Z + 0.4, i);
  }
  const panneau = enseigne('LA FÊTE FORAINE');
  panneau.position.set(0, 8.2, Z + 0.45);
  racine.add(panneau);
  // Les tourniquets, au milieu, et des poteaux d'ampoules.
  for (const x of [-2.6, -1.3, 1.3, 2.6]) {
    f([0.3, 1.1, 0.3], [x, 0.55, Z], 'sombre', { forme: 'tube' });
    for (let k = 0; k < 3; k++) f([0.9, 0.08, 0.08], [x + (x < 0 ? 0.45 : -0.45), 0.9, Z], 'blanc', { ry: (k * Math.PI) / 3 });
  }
  // La billetterie à gauche.
  f([2.2, 2.2, 1.8], [-8.2, 1.1, Z + 1.2], 'comptoir');
  f([2.5, 0.25, 2.1], [-8.2, 2.35, Z + 1.2], 'toileA');
  f([1.2, 0.6, 0.06], [-8.2, 1.5, Z + 2.12], 'toileB');
  obstacles.push(new THREE.Box3(new THREE.Vector3(-9.4, 0, Z + 0.2), new THREE.Vector3(-7, 3, Z + 2.2)));
  // Les palissades de chaque côté de l'entrée.
  for (const signe of [-1, 1]) {
    for (let i = 0; i < 31; i++) {
      const x = signe * (6.8 + i * 0.6);
      f([0.5, 1.6, 0.14], [x, 0.8, Z], i % 2 === 0 ? 'barriereA' : 'barriereB');
    }
    obstacles.push(new THREE.Box3(new THREE.Vector3(signe < 0 ? -BORD : 6.5, 0, Z - 0.3), new THREE.Vector3(signe < 0 ? -6.5 : BORD, 2, Z + 0.3)));
  }
  // L'allée d'arrivée et ses lampadaires.
  atelier.sol(racine, 3.4, 23, 0, 0.03, Z + 11.5, 'dalles');
  for (let i = 0; i < 4; i++) {
    for (const x of [-2.6, 2.6]) {
      f([0.16, 3, 0.16], [x, 1.5, Z + 4 + i * 5], 'poteau', { forme: 'tube' });
      ampoule(x, 3.15, Z + 4 + i * 5, i + (x > 0 ? 1 : 0));
    }
  }
  // Les palissades qui ferment la fête sur les côtés et au fond.
  for (let z = Z - 0.3; z > FOND; z -= 0.6) {
    for (const x of [-BORD, BORD]) f([0.14, 1.6, 0.5], [x, 0.8, z], Math.round(z / 0.6) % 2 === 0 ? 'barriereA' : 'barriereB');
  }
  for (let x = -BORD; x <= BORD; x += 0.6) f([0.5, 1.6, 0.14], [x, 0.8, FOND], Math.round(x / 0.6) % 2 === 0 ? 'barriereA' : 'barriereB');
  // Des haies le long de l'allée d'arrivée, et au bout.
  for (let z = Z + 1.5; z <= FIN_ALLEE; z += 1.4) {
    for (const x of [-2.9, 2.9]) f([1.2, 1, 1.2], [x, 0.5, z], 'bonbon3', { forme: 'boule' });
  }
  for (let x = -2.2; x <= 2.2; x += 1.1) f([1.2, 1, 1.2], [x, 0.5, FIN_ALLEE + 0.8], 'bonbon3', { forme: 'boule' });
  atelier.fusionner(racine);

  return {
    racine,
    obstacles,
    mettreAJour() {},
    dansLaFete(x, z) {
      const place = Math.abs(x) <= BORD - 0.6 && z >= FOND + 0.6 && z <= Z - 0.4;
      const allee = Math.abs(x) <= 2.2 && z >= Z - 0.4 && z <= FIN_ALLEE;
      return place || allee;
    },
  };
}
