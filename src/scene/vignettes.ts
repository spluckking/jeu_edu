// Les vignettes de la garde-robe : chaque accessoire est photographié une fois, sur le personnage,
// avec le moteur du jeu (pas d'image à télécharger). Le résultat est gardé en mémoire.

import * as THREE from 'three';
import { Atelier } from './atelier.ts';
import { creerPersonne, type Accessoires } from './personne.ts';

const TAILLE = 192;
const cache = new Map<string, string>();

const SANS: Accessoires = { chapeau: 'rien', lunettes: 'rien', haut: 'haut-corail', chaussures: 'chaussures-bottines', objet: 'rien' };

/** Ce qu'il faut viser selon la place de l'accessoire (repère du personnage, déjà agrandi). */
const CADRES: Record<keyof Accessoires, { cible: [number, number, number]; recul: number }> = {
  chapeau: { cible: [0, 2.15, 0], recul: 5 },
  lunettes: { cible: [0, 1.9, 0.4], recul: 2.8 },
  haut: { cible: [0, 1.05, 0], recul: 5 },
  chaussures: { cible: [0, 0.3, 0.1], recul: 3 },
  objet: { cible: [0.5, 1.6, 0], recul: 6.5 },
};

export function vignette(renderer: THREE.WebGLRenderer, genre: keyof Accessoires, id: string): string {
  const cle = `${genre}:${id}`;
  const deja = cache.get(cle);
  if (deja !== undefined) return deja;
  const atelier = new Atelier();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xf2dcc4, 2.6));
  const lumiere = new THREE.DirectionalLight(0xffffff, 1.2);
  lumiere.position.set(2, 4, 5);
  scene.add(lumiere);
  const p = creerPersonne(atelier, scene, { maillot: 0xf28a6b, pantalon: 0xc79a6b, cheveux: 0xe08a3c, tenue: 0, objets: false, peau: 0xfadcc6, accessoires: { ...SANS, [genre]: id } });
  // Le sac se voit de dos : on tourne le personnage.
  if (id === 'objet-sac') p.racine.rotation.y = Math.PI * 0.8;
  p.animer(0, 0, 0);
  // L'ombre au sol gênerait la vignette.
  p.racine.children[0]?.removeFromParent();
  const cadre = CADRES[genre];
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);
  const cible = new THREE.Vector3(...cadre.cible);
  camera.position.copy(cible).add(new THREE.Vector3(0.45, 0.3, 1).normalize().multiplyScalar(cadre.recul));
  camera.lookAt(cible);

  const cibleRendu = new THREE.WebGLRenderTarget(TAILLE, TAILLE, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const fondAvant = renderer.getClearAlpha();
  const precedente = renderer.getRenderTarget();
  renderer.setRenderTarget(cibleRendu);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const pixels = new Uint8Array(TAILLE * TAILLE * 4);
  renderer.readRenderTargetPixels(cibleRendu, 0, 0, TAILLE, TAILLE, pixels);
  renderer.setRenderTarget(precedente);
  renderer.setClearAlpha(fondAvant);
  cibleRendu.dispose();
  atelier.liberer();

  // Les lignes arrivent du bas vers le haut : on les remet à l'endroit.
  const toile = document.createElement('canvas');
  toile.width = toile.height = TAILLE;
  const g = toile.getContext('2d');
  let url = '';
  if (g) {
    const image = g.createImageData(TAILLE, TAILLE);
    for (let y = 0; y < TAILLE; y++) image.data.set(pixels.subarray((TAILLE - 1 - y) * TAILLE * 4, (TAILLE - y) * TAILLE * 4), y * TAILLE * 4);
    g.putImageData(image, 0, 0);
    url = toile.toDataURL();
  }
  cache.set(cle, url);
  return url;
}
