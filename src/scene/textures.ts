// Les textures dessinées en code du style « douillet » : herbe semée de petites fleurs, dalles
// crème des allées, et le dégradé d'ombrage en trois aplats doux.

import * as THREE from 'three';
import { palette } from './palette.ts';
import { qualite } from './qualite.ts';

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
  const haute = qualite === 'haute';
  // Qualité haute : herbe plus fine et plus variée (touffes, terre, trèfle), pavés irréguliers.
  const herbe = haute
    ? toile(512, 512, (g) => {
        const hasard = graine(7);
        g.fillStyle = palette.herbe.fond;
        g.fillRect(0, 0, 512, 512);
        // Grandes taches de teinte, puis des milliers de petits traits d'herbe.
        for (let i = 0; i < 70; i++) {
          g.fillStyle = hasard() > 0.5 ? palette.herbe.clair : palette.herbe.sombre;
          g.globalAlpha = 0.18;
          g.beginPath();
          g.arc(hasard() * 512, hasard() * 512, 20 + hasard() * 60, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
        for (let i = 0; i < 9000; i++) {
          const x = hasard() * 512;
          const y = hasard() * 512;
          const t = hasard();
          g.strokeStyle = t > 0.66 ? palette.herbe.clair : t > 0.33 ? palette.herbe.sombre : '#7aa850';
          g.globalAlpha = 0.35 + hasard() * 0.5;
          g.lineWidth = 1 + hasard();
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + (hasard() - 0.5) * 4, y - 3 - hasard() * 6);
          g.stroke();
        }
        // Un peu de terre qui affleure.
        for (let i = 0; i < 40; i++) {
          g.fillStyle = '#6b5a3c';
          g.globalAlpha = 0.12 + hasard() * 0.12;
          g.beginPath();
          g.ellipse(hasard() * 512, hasard() * 512, 3 + hasard() * 9, 2 + hasard() * 6, hasard() * 3, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      })
    : toile(256, 256, (g) => {
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
  // Une répétition tous les 6 m (8 m en qualité haute : moins de motif visible).
  herbe.repeat.set(haute ? 1 / 8 : 1 / 6, haute ? 1 / 8 : 1 / 6);

  const dalles = haute
    ? toile(512, 512, (g) => {
        // Pavés irréguliers : chaque pierre a sa teinte, ses arêtes usées et ses joints sombres.
        const hasard = graine(3);
        g.fillStyle = '#857a6a';
        g.fillRect(0, 0, 512, 512);
        const rangs = 8;
        for (let r = 0; r < rangs; r++) {
          let x = r % 2 ? -32 : 0;
          while (x < 512 - 24) {
            const l = 48 + hasard() * 40;
            const y = r * 64;
            const base = 150 + hasard() * 40;
            const teinte = `rgb(${base + 18}, ${base + 6}, ${base - 18})`;
            g.fillStyle = teinte;
            const arrondi = 10 + hasard() * 8;
            for (const decalage of [0, -512, 512]) {
              g.beginPath();
              g.roundRect(x + 3 + decalage, y + 3, l - 6, 58, arrondi);
              g.fill();
            }
            // Grain et taches de la pierre.
            for (let i = 0; i < 40; i++) {
              g.fillStyle = hasard() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
              g.fillRect(x + 6 + hasard() * (l - 12), y + 6 + hasard() * 50, 2 + hasard() * 4, 2 + hasard() * 3);
            }
            g.strokeStyle = 'rgba(255,255,255,0.18)';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(x + 8, y + 6);
            g.lineTo(x + l - 10, y + 6);
            g.stroke();
            x += l;
          }
        }
      })
    : toile(128, 128, (g) => {
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
  // Une dalle d'environ 1,6 m (3,2 m de motif en qualité haute, avec des pavés plus petits).
  dalles.repeat.set(haute ? 1 / 3.2 : 1 / 1.6, haute ? 1 / 3.2 : 1 / 1.6);

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
