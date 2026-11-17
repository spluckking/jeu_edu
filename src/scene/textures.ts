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
  // Qualité haute : un gazon tondu, dense, fait de feuilles pointues en couches serrées, toutes
  // penchées dans le même sens (comme une pelouse brossée par le vent). Raccordable sans couture.
  const herbe = haute
    ? toile(1024, 1024, (g) => {
        const hasard = graine(7);
        const T = 1024;
        g.fillStyle = '#2c5e12';
        g.fillRect(0, 0, T, T);
        /** Une feuille : pointue, légèrement courbée, plus claire au bout. */
        const feuille = (x: number, y: number, longueur: number, largeur: number, angle: number, base: string, bout: string): void => {
          for (const dx of [0, -T, T]) {
            for (const dy of [0, -T, T]) {
              const ox = x + dx;
              const oy = y + dy;
              if (ox < -longueur || ox > T + longueur || oy < -longueur || oy > T + longueur) continue;
              const cx = Math.cos(angle);
              const cy = Math.sin(angle);
              const px = -cy;
              const py = cx;
              const pointe = [ox + cx * longueur, oy + cy * longueur];
              const courbe = (hasard() - 0.5) * largeur * 1.5;
              const degrade = g.createLinearGradient(ox, oy, pointe[0] ?? ox, pointe[1] ?? oy);
              degrade.addColorStop(0, base);
              degrade.addColorStop(1, bout);
              g.fillStyle = degrade;
              g.beginPath();
              g.moveTo(ox + px * largeur, oy + py * largeur);
              g.quadraticCurveTo(ox + cx * longueur * 0.55 + px * (largeur + courbe), oy + cy * longueur * 0.55 + py * (largeur + courbe), pointe[0] ?? ox, pointe[1] ?? oy);
              g.quadraticCurveTo(ox + cx * longueur * 0.5 - px * (largeur - courbe), oy + cy * longueur * 0.5 - py * (largeur - courbe), ox - px * largeur, oy - py * largeur);
              g.closePath();
              g.fill();
            }
          }
        };
        // Trois couches, de la plus sombre (au fond) à la plus claire (au-dessus).
        const couches: Array<[number, string, string]> = [
          [5200, '#244f0d', '#3f7e18'],
          [4200, '#2f6612', '#5a9e22'],
          [3000, '#3c7a16', '#86c834'],
        ];
        for (const [nombre, base, bout] of couches) {
          for (let i = 0; i < nombre; i++) {
            // Toutes penchées vers le haut à droite, avec un peu de désordre.
            const angle = -Math.PI * 0.35 + (hasard() - 0.5) * 0.7;
            feuille(hasard() * T, hasard() * T, 34 + hasard() * 30, 3.2 + hasard() * 2.6, angle, base, bout);
          }
        }
        // Quelques reflets clairs sur le bout des feuilles du dessus.
        g.globalAlpha = 0.5;
        for (let i = 0; i < 900; i++) feuille(hasard() * T, hasard() * T, 16 + hasard() * 14, 1.6 + hasard() * 1.2, -Math.PI * 0.35 + (hasard() - 0.5) * 0.6, '#6fb82c', '#a8e04a');
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
