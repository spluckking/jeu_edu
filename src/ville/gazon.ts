// L'herbe de la ville, dans un style peint et doux qui va avec les modèles « jouet » : un sol aux
// grandes taches de verts fondus (pas de petit détail qui scintille), des touffes rondes et
// basses dont la couleur suit les taches du sol, quelques grappes de fleurs. Les touffes
// ondulent au vent dans le shader. Un appel de dessin pour le sol, un pour les touffes, un pour
// les fleurs.

import * as THREE from 'three';

/** Bruit de valeur et sa somme sur plusieurs échelles, partagés par le sol et les touffes. */
const BRUIT_GLSL = /* glsl */ `
float hachage(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float bruit(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hachage(i), hachage(i + vec2(1, 0)), u.x), mix(hachage(i + vec2(0, 1)), hachage(i + vec2(1, 1)), u.x), u.y);
}
float taches(vec2 p) { return bruit(p * 0.07) * 0.6 + bruit(p * 0.19 + 7.0) * 0.3 + bruit(p * 0.6 + 3.0) * 0.1; }
vec3 vertDuSol(vec2 p) {
  float t = taches(p);
  vec3 fonce = vec3(0.30, 0.52, 0.20);
  vec3 moyen = vec3(0.44, 0.66, 0.27);
  vec3 clair = vec3(0.62, 0.78, 0.36);
  vec3 c = t < 0.5 ? mix(fonce, moyen, smoothstep(0.25, 0.5, t)) : mix(moyen, clair, smoothstep(0.5, 0.78, t));
  // Les teintes sont pensées en sRGB ; le rendu travaille en linéaire.
  return pow(c, vec3(2.2));
}
`;

/** Le sol : un grand plan dont la couleur vient des taches de verts. */
export function creerSol(taille: number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSol;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSol = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vSol;\n${BRUIT_GLSL}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vertDuSol(vSol), opacity );');
  };
  mat.customProgramCacheKey = () => 'ville-sol';
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(taille, taille).rotateX(-Math.PI / 2), mat);
  sol.receiveShadow = true;
  return sol;
}

/** Une touffe ronde : sept feuilles courtes, larges et courbées vers l'extérieur. Hauteur 1. */
function touffe(): THREE.BufferGeometry {
  const positions: number[] = [];
  const clair: number[] = [];
  const N = 7;
  for (let b = 0; b < N; b++) {
    const a = (b / N) * Math.PI * 2 + (b % 2) * 0.3;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const tx = -dz * 0.09;
    const tz = dx * 0.09;
    const h = b % 2 ? 0.8 : 1;
    // Une feuille en deux étages, qui s'ouvre puis retombe un peu.
    const bas = [dx * 0.05, 0, dz * 0.05];
    const milieu = [dx * 0.22, h * 0.6, dz * 0.22];
    const pointe = [dx * 0.4, h, dz * 0.4];
    const quad = (a1: number[], a2: number[], b1: number[], b2: number[], ca: number, cb: number): void => {
      for (const [v, c] of [[a1, ca], [a2, ca], [b1, cb], [a2, ca], [b2, cb], [b1, cb]] as Array<[number[], number]>) {
        positions.push(...v);
        clair.push(c);
      }
    };
    quad([(bas[0] ?? 0) - tx, 0, (bas[2] ?? 0) - tz], [(bas[0] ?? 0) + tx, 0, (bas[2] ?? 0) + tz], [(milieu[0] ?? 0) - tx * 0.8, milieu[1] ?? 0, (milieu[2] ?? 0) - tz * 0.8], [(milieu[0] ?? 0) + tx * 0.8, milieu[1] ?? 0, (milieu[2] ?? 0) + tz * 0.8], 0, 0.6);
    for (const [v, c] of [
      [[(milieu[0] ?? 0) - tx * 0.8, milieu[1] ?? 0, (milieu[2] ?? 0) - tz * 0.8], 0.6],
      [[(milieu[0] ?? 0) + tx * 0.8, milieu[1] ?? 0, (milieu[2] ?? 0) + tz * 0.8], 0.6],
      [pointe, 1],
    ] as Array<[number[], number]>) {
      positions.push(...v);
      clair.push(c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aClair', new THREE.Float32BufferAttribute(clair, 1));
  // Normales vers le ciel : les touffes sont éclairées comme le sol, sans faces sombres.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

export interface Gazon {
  racine: THREE.Group;
  animer(temps: number): void;
}

/** Sème les touffes et les fleurs. libre(x, z) : vrai si l'herbe peut pousser là. */
export function semerGazon(libre: (x: number, z: number) => boolean, nombre: number, zone: { x: number; zMin: number; zMax: number }): Gazon {
  const racine = new THREE.Group();
  const temps = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTemps = temps;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTemps;\nattribute float aClair;\nvarying float vClair;\nvarying vec2 vPied;\n`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 pied = instanceMatrix[3].xyz;
        vPied = pied.xz;
        vClair = aClair;
        float souffle = sin(uTemps * 1.4 + pied.x * 0.3 + pied.z * 0.2) * 0.6 + sin(uTemps * 2.3 + pied.z * 0.7) * 0.25;
        float h = position.y * position.y;
        transformed.x += souffle * 0.06 * h;
        transformed.z += souffle * 0.04 * h;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vClair;\nvarying vec2 vPied;\n${BRUIT_GLSL}`)
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        // Le pied de la touffe a la couleur du sol en dessous ; la pointe est plus claire et plus jaune.
        'vec3 base = vertDuSol(vPied) * 0.92;\nvec3 couleurTouffe = mix(base, base * vec3(1.18, 1.14, 0.9) + vec3(0.04, 0.05, 0.0), vClair);\nvec4 diffuseColor = vec4( diffuse * couleurTouffe, opacity );',
      );
  };
  mat.customProgramCacheKey = () => 'ville-gazon';
  const touffes = new THREE.InstancedMesh(touffe(), mat, nombre);
  touffes.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const haut = new THREE.Vector3(0, 1, 0);
  let graine = 4321;
  const hasard = (): number => (graine = (graine * 16807) % 2147483647) / 2147483647;
  let n = 0;
  for (let essai = 0; n < nombre && essai < nombre * 4; essai++) {
    const x = (hasard() * 2 - 1) * zone.x;
    const z = zone.zMin + hasard() * (zone.zMax - zone.zMin);
    if (!libre(x, z)) continue;
    p.set(x, 0, z);
    q.setFromAxisAngle(haut, hasard() * Math.PI * 2);
    // Des touffes basses et rondes : 12 à 22 cm de haut, 30 à 45 cm de large.
    const h = 0.12 + hasard() * 0.1;
    const l = 0.75 + hasard() * 0.4;
    touffes.setMatrixAt(n, m.compose(p, q, s.set(l, h, l)));
    n++;
  }
  touffes.count = n;
  touffes.frustumCulled = false;
  racine.add(touffes);

  // Des fleurs en petites grappes (blanches, jaunes, roses, mauves), jamais isolées au hasard.
  const fleur = new THREE.IcosahedronGeometry(0.1, 1);
  const fleurs = new THREE.InstancedMesh(fleur, new THREE.MeshStandardMaterial({ roughness: 0.8 }), 1200);
  const teintes = [0xfbf6ea, 0xf5d65a, 0xf0a6c0, 0xc3a3e6];
  const c = new THREE.Color();
  let f = 0;
  for (let grappe = 0; f < 1200 && grappe < 600; grappe++) {
    const cx = (hasard() * 2 - 1) * zone.x;
    const cz = zone.zMin + hasard() * (zone.zMax - zone.zMin);
    if (!libre(cx, cz)) continue;
    const teinte = teintes[grappe % teintes.length] ?? 0xffffff;
    const nb = 4 + Math.floor(hasard() * 6);
    for (let i = 0; i < nb && f < 1200; i++) {
      const x = cx + (hasard() - 0.5) * 1.1;
      const z = cz + (hasard() - 0.5) * 1.1;
      if (!libre(x, z)) continue;
      fleurs.setMatrixAt(f, m.compose(p.set(x, 0.14 + hasard() * 0.06, z), q.identity(), s.setScalar(0.7 + hasard() * 0.5)));
      fleurs.setColorAt(f, c.set(teinte));
      f++;
    }
  }
  fleurs.count = f;
  fleurs.frustumCulled = false;
  racine.add(fleurs);

  return {
    racine,
    animer(t) {
      temps.value = t;
    },
  };
}
