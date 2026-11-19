// Le dessin du plan (monde.ts) : chemins de terre battue, rivière, étang et sa plage, bosquets
// d'arbres. Les arbres sont des modèles Tripo répétés en instances (un appel de dessin par
// modèle, quel que soit leur nombre).

import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { BORDS, ETANG, FETE, hasardStable, LIEUX, LARGEUR_CHEMIN, LARGEUR_RIVIERE, lignes, occupe, surUnChemin, type Point } from './monde.ts';

/** Un ruban posé au sol le long d'une ligne (chemin, rivière). */
function ruban(ligne: readonly Point[], largeur: number, hauteur: number, bords = 0): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let parcouru = 0;
  ligne.forEach((p, i) => {
    const a = ligne[Math.max(0, i - 1)]!;
    const b = ligne[Math.min(ligne.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1;
    // Une largeur qui respire un peu : rien n'est tiré au cordeau.
    const w = largeur / 2 + Math.sin(i * 0.37) * bords;
    const nx = -dz / l;
    const nz = dx / l;
    if (i > 0) parcouru += Math.hypot(p.x - ligne[i - 1]!.x, p.z - ligne[i - 1]!.z);
    positions.push(p.x + nx * w, hauteur, p.z + nz * w, p.x - nx * w, hauteur, p.z - nz * w);
    uvs.push(0, parcouru / largeur, 1, parcouru / largeur);
    if (i > 0) {
      const k = (i - 1) * 2;
      // Faces tournées vers le ciel.
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Une texture de terre battue : un brun clair avec des taches douces, faite au pinceau. */
function textureTerre(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d') as CanvasRenderingContext2D;
  x.fillStyle = '#d8c39a';
  x.fillRect(0, 0, 128, 128);
  const h = hasardStable(7);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = h() < 0.5 ? 'rgba(190,165,120,0.35)' : 'rgba(236,222,190,0.4)';
    x.beginPath();
    x.ellipse(h() * 128, h() * 128, 3 + h() * 9, 2 + h() * 6, h() * 3, 0, Math.PI * 2);
    x.fill();
  }
  // Les bords du chemin s'estompent dans l'herbe.
  const fondu = x.createLinearGradient(0, 0, 128, 0);
  fondu.addColorStop(0, 'rgba(150,190,110,0.55)');
  fondu.addColorStop(0.16, 'rgba(150,190,110,0)');
  fondu.addColorStop(0.84, 'rgba(150,190,110,0)');
  fondu.addColorStop(1, 'rgba(150,190,110,0.55)');
  x.fillStyle = fondu;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** L'eau : bleu clair, un peu brillante, qui ondule doucement. */
function materiauEau(temps: { value: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0x7ccbe8, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.92 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTemps = temps;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vEau;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEau = (modelMatrix * vec4(transformed, 1.0)).xz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTemps;\nvarying vec2 vEau;')
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        // Des reflets clairs qui glissent, sans texture.
        'float reflet = smoothstep(0.82, 1.0, sin(vEau.x * 0.9 + uTemps * 1.1) * sin(vEau.y * 0.7 - uTemps * 0.8));\nvec4 diffuseColor = vec4( mix(diffuse, vec3(0.92, 0.98, 1.0), reflet * 0.6), opacity );',
      );
  };
  m.customProgramCacheKey = () => 'ville-eau';
  return m;
}

export interface Monde {
  racine: THREE.Group;
  animer(temps: number): void;
}

/** Chemins, rivière, étang et plage. */
export function dessinerMonde(): Monde {
  const racine = new THREE.Group();
  const temps = { value: 0 };
  const terre = new THREE.MeshStandardMaterial({ map: textureTerre(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const l of lignes.chemins) racine.add(new THREE.Mesh(ruban(l, LARGEUR_CHEMIN, 0.03, 0.18), terre));
  // La rivière : une berge de sable, puis l'eau.
  const sable = new THREE.MeshStandardMaterial({ color: 0xead9a8, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const eau = materiauEau(temps);
  racine.add(new THREE.Mesh(ruban(lignes.riviere, LARGEUR_RIVIERE + 2.6, 0.02, 0.6), sable));
  const riviere = new THREE.Mesh(ruban(lignes.riviere, LARGEUR_RIVIERE, 0.06, 0.5), eau);
  racine.add(riviere);
  // L'étang, et sa plage au sud-est.
  const plage = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), sable);
  plage.scale.set(ETANG.rx + 5, 1, ETANG.rz + 4);
  plage.position.set(ETANG.x + 2.5, 0.025, ETANG.z + 2);
  const etang = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), eau);
  etang.scale.set(ETANG.rx, 1, ETANG.rz);
  etang.position.set(ETANG.x, 0.07, ETANG.z);
  racine.add(plage, etang);
  // Le sol de la fête : une grande place de terre battue.
  const place = new THREE.Mesh(new THREE.CircleGeometry(1, 64).rotateX(-Math.PI / 2), terre);
  place.scale.set(FETE.rx, 1, FETE.rz);
  place.position.set(LIEUX.fete.x, 0.028, LIEUX.fete.z);
  racine.add(place);
  for (const o of racine.children) o.receiveShadow = true;
  return { racine, animer: (t) => (temps.value = t) };
}

/** Des guirlandes de fanions tendues d'un point à un autre (en mètres, hauteur comprise), qui
 *  pendent un peu au milieu : un seul maillage en instances pour tous les fanions. */
export function guirlandes(fils: ReadonlyArray<[THREE.Vector3, THREE.Vector3]>): THREE.Object3D {
  const groupe = new THREE.Group();
  const couleurs = [0xf6a5b8, 0xffd27a, 0x9fd8f0, 0xb8e6a8, 0xd5b8f2, 0xffb38a];
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute('position', new THREE.Float32BufferAttribute([-0.2, 0, 0, 0.2, 0, 0, 0, -0.42, 0], 3));
  triangle.computeVertexNormals();
  const points: THREE.Vector3[] = [];
  const corde: number[] = [];
  const poses: Array<{ p: THREE.Vector3; angle: number }> = [];
  for (const [a, b] of fils) {
    const n = Math.max(4, Math.round(a.distanceTo(b) / 0.55));
    const fleche = a.distanceTo(b) * 0.06;
    const angle = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * fleche;
      if (i > 0) corde.push(...points[points.length - 1]!.toArray(), ...p.toArray());
      points.push(p);
      if (i > 0 && i < n) poses.push({ p, angle });
    }
  }
  const fil = new THREE.BufferGeometry();
  fil.setAttribute('position', new THREE.Float32BufferAttribute(corde, 3));
  groupe.add(new THREE.LineSegments(fil, new THREE.LineBasicMaterial({ color: 0x8a6a4a })));
  const fanions = new THREE.InstancedMesh(triangle, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), poses.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const un = new THREE.Vector3(1, 1, 1);
  const c = new THREE.Color();
  poses.forEach(({ p, angle }, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    fanions.setMatrixAt(i, m.compose(p, q, un));
    fanions.setColorAt(i, c.setHex(couleurs[i % couleurs.length]!));
  });
  groupe.add(fanions);
  return groupe;
}

/** Les zones boisées : un bois dense à l'ouest, des bosquets épars ailleurs. */
const ZONES = [
  { x: -60, z: -20, r: 32, densite: 0.9 },
  { x: -55, z: 25, r: 18, densite: 0.5 },
  { x: 20, z: -55, r: 28, densite: 0.55 },
  { x: -25, z: -55, r: 22, densite: 0.6 },
  // Autour de la fête, un bois clair ; et le pré à l'est de la route.
  { x: 85, z: -32, r: 42, densite: 0.3 },
  { x: 60, z: -75, r: 16, densite: 0.5 },
  { x: 100, z: 18, r: 16, densite: 0.45 },
  { x: 70, z: 45, r: 22, densite: 0.5 },
  { x: 15, z: 45, r: 20, densite: 0.35 },
  { x: 0, z: 0, r: 70, densite: 0.08 },
];

/** Où poussent les arbres : dans les zones, hors des chemins, de l'eau et des lieux. */
export function placesDesArbres(lieux: readonly (Point & { r: number })[]): Array<Point & { cap: number; taille: number; sorte: number }> {
  const h = hasardStable(2024);
  const r: Array<Point & { cap: number; taille: number; sorte: number }> = [];
  for (const zone of ZONES) {
    const essais = Math.round(zone.r * zone.r * 0.07 * zone.densite);
    for (let i = 0; i < essais; i++) {
      const a = h() * Math.PI * 2;
      const d = Math.sqrt(h()) * zone.r;
      const x = zone.x + Math.cos(a) * d;
      const z = zone.z + Math.sin(a) * d;
      if (x < BORDS.xMin + 2 || x > BORDS.xMax - 2 || z < BORDS.zMin + 2 || z > BORDS.zMax - 2) continue;
      // Ni sur un chemin, ni juste au sud d'un chemin : la caméra, derrière l'enfant, se
      // retrouverait dans le feuillage.
      if (occupe(x, z, lieux) || surUnChemin(x, z - 6, 2.5) || r.some((t) => Math.hypot(t.x - x, t.z - z) < 4.6)) continue;
      // Les sapins au nord, les cerisiers plutôt près du bourg, les chênes partout.
      const sorte = z < -35 && h() < 0.6 ? 1 : Math.hypot(x, z) < 45 && h() < 0.3 ? 2 : h() < 0.25 ? 1 : 0;
      r.push({ x, z, cap: h() * Math.PI * 2, taille: 0.8 + h() * 0.5, sorte });
    }
  }
  return r;
}

/** Les arbres d'une sorte, en instances (le modèle Tripo n'a qu'un maillage). */
export function planterArbres(modele: GLTF, hauteur: number, places: ReadonlyArray<Point & { cap: number; taille: number }>): THREE.Object3D {
  const groupe = new THREE.Group();
  modele.scene.updateMatrixWorld(true);
  const boite = new THREE.Box3().setFromObject(modele.scene);
  const echelle = hauteur / Math.max(1e-6, boite.max.y - boite.min.y);
  const centre = boite.getCenter(new THREE.Vector3());
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const haut = new THREE.Vector3(0, 1, 0);
  modele.scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const instances = new THREE.InstancedMesh(o.geometry, o.material, places.length);
    // Le maillage remis à l'origine, pied au sol.
    const base = new THREE.Matrix4().makeTranslation(-centre.x, -boite.min.y, -centre.z).multiply(o.matrixWorld);
    places.forEach((p, i) => {
      const s = echelle * p.taille;
      q.setFromAxisAngle(haut, p.cap);
      m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(s, s, s)).multiply(base);
      instances.setMatrixAt(i, m);
    });
    instances.castShadow = true;
    instances.receiveShadow = true;
    groupe.add(instances);
  });
  return groupe;
}
