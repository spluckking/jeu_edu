// Les textures dessinées en code du style « douillet » : herbe semée de petites fleurs, dalles
// crème des allées, et le dégradé d'ombrage en trois aplats doux.

import * as THREE from 'three';
import { palette } from './palette.ts';

function toile(l: number, h: number, dessiner: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = l;
  c.height = h;
  const g = c.getContext('2d');
  if (g) dessiner(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Hasard reproductible : la même herbe à chaque lancement. */
function graine(depart: number): () => number {
  let s = depart;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function texturesDouillettes(): { herbe: THREE.CanvasTexture; dalles: THREE.CanvasTexture; degrade: THREE.DataTexture; liberer(): void } {
  const herbe = toile(256, 256, (g) => {
    const hasard = graine(7);
    g.fillStyle = palette.herbe.fond;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = hasard() > 0.5 ? palette.herbe.clair : palette.herbe.sombre;
      g.fillRect(hasard() * 256, hasard() * 256, 7, 3);
    }
    const fleurs = ['#ffffff', '#ffd6e4', '#fff2a6', '#d9ccff'];
    for (let i = 0; i < 26; i++) {
      const x = hasard() * 256;
      const y = hasard() * 256;
      g.fillStyle = fleurs[i % fleurs.length] ?? '#ffffff';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 2.8, y + Math.sin(a) * 2.8, 2.1, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffc94a';
      g.beginPath();
      g.arc(x, y, 1.7, 0, Math.PI * 2);
      g.fill();
    }
  });
  // Une répétition tous les 6 m.
  herbe.repeat.set(1 / 6, 1 / 6);

  const dalles = toile(128, 128, (g) => {
    g.fillStyle = '#f3dfbd';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#e1c79e';
    g.lineWidth = 3;
    for (const [x, y, l, h] of [[2, 2, 60, 40], [66, 2, 60, 58], [2, 46, 60, 80], [66, 64, 60, 62]] as const) {
      g.beginPath();
      g.roundRect(x, y, l, h, 10);
      g.stroke();
    }
  });
  // Une dalle d'environ 1,6 m.
  dalles.repeat.set(1 / 1.6, 1 / 1.6);

  // Trois aplats doux : la face au soleil, la face de côté, l'ombre (jamais noire).
  const degrade = new THREE.DataTexture(new Uint8Array([165, 215, 255]), 3, 1, THREE.RedFormat);
  degrade.minFilter = THREE.NearestFilter;
  degrade.magFilter = THREE.NearestFilter;
  degrade.needsUpdate = true;

  return {
    herbe,
    dalles,
    degrade,
    liberer() {
      herbe.dispose();
      dalles.dispose();
      degrade.dispose();
    },
  };
}

/** Un sol plat dont les coordonnées de texture suivent le monde (en mètres). */
export function plaque(largeur: number, profondeur: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(largeur, profondeur).rotateX(-Math.PI / 2).translate(x, y, z);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), -pos.getZ(i));
  return g;
}
