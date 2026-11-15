// Fabrique les icônes de l'application (PNG 192 et 512) sans aucune dépendance :
// un rond de ciel, une toile de stand rayée rouge et blanc, une étoile dorée.
// Usage : node scripts/icones.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(octets) {
  let c = 0xffffffff;
  for (const o of octets) c = TABLE[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function morceau(type, donnees) {
  const tete = Buffer.alloc(8);
  tete.writeUInt32BE(donnees.length, 0);
  tete.write(type, 4, 'ascii');
  const fin = Buffer.alloc(4);
  fin.writeUInt32BE(crc32(Buffer.concat([tete.subarray(4), donnees])), 0);
  return Buffer.concat([tete, donnees, fin]);
}

function png(taille, pixel) {
  const lignes = Buffer.alloc(taille * (taille * 4 + 1));
  for (let y = 0; y < taille; y++) {
    lignes[y * (taille * 4 + 1)] = 0;
    for (let x = 0; x < taille; x++) {
      const [r, g, b, a] = pixel((x + 0.5) / taille, (y + 0.5) / taille);
      lignes.set([r, g, b, a], y * (taille * 4 + 1) + 1 + x * 4);
    }
  }
  const entete = Buffer.alloc(13);
  entete.writeUInt32BE(taille, 0);
  entete.writeUInt32BE(taille, 4);
  entete[8] = 8;
  entete[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', entete),
    morceau('IDAT', deflateSync(lignes)),
    morceau('IEND', Buffer.alloc(0)),
  ]);
}

function dansEtoile(x, y, cx, cy, rayon) {
  const angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
  const d = Math.hypot(x - cx, y - cy);
  const branche = Math.cos(((angle % ((2 * Math.PI) / 5)) + (2 * Math.PI) / 5) % ((2 * Math.PI) / 5) - Math.PI / 5);
  return d < rayon * (0.5 + 0.5 * branche ** 6);
}

function pixel(x, y) {
  // Fond plein (icône « maskable » : l'important reste dans le cercle central).
  const ciel = [63 + (207 - 63) * y, 160 + (238 - 160) * y, 255];
  let couleur = ciel;
  // Toile du stand : bande arrondie en haut, rayures rouges et blanches.
  const toile = y > 0.36 && y < 0.56 && x > 0.18 && x < 0.82;
  const festons = y >= 0.56 && y < 0.62 && x > 0.18 && x < 0.82 && Math.hypot(((x - 0.18) % 0.08) - 0.04, y - 0.56) < 0.04;
  if (toile || festons) couleur = Math.floor((x - 0.18) / 0.08) % 2 === 0 ? [255, 90, 110] : [255, 250, 240];
  // Comptoir.
  if (y > 0.66 && y < 0.8 && x > 0.22 && x < 0.78) couleur = [255, 133, 82];
  // Étoile dorée au-dessus.
  if (dansEtoile(x, y, 0.5, 0.24, 0.13)) couleur = [255, 212, 71];
  return [...couleur.map(Math.round), 255];
}

writeFileSync('public/icone-192.png', png(192, pixel));
writeFileSync('public/icone-512.png', png(512, pixel));
console.log('Icônes écrites dans public/.');
