// La qualité visuelle. « haute » : matériaux physiques avec grain et relief (bruit calculé dans
// le shader, sans texture à télécharger), ombres portées, lumière d'environnement, tonalité
// cinéma, herbe en brins qui bougent au vent. « standard » : le rendu doux en aplats, plus léger.
// Le parent choisit dans l'espace parent ; « ?qualite=standard » permet d'essayer.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type Qualite = 'standard' | 'haute';
export let qualite: Qualite = 'haute';

export function choisirQualite(q: string | null | undefined): Qualite {
  qualite = q === 'standard' ? 'standard' : 'haute';
  return qualite;
}

// --- Bruit précalculé dans une petite texture 3D (64³) : une lecture par octave, au lieu de
// dizaines de calculs par pixel (c'est ce qui coûte le plus sur une tablette). -------------------
const COTE = 64;
let texBruit: THREE.Data3DTexture | null = null;
function bruit(): THREE.Data3DTexture {
  if (texBruit) return texBruit;
  const n = COTE * COTE * COTE;
  let graine = 99;
  const hasard = (): number => (graine = (graine * 16807) % 2147483647) / 2147483647;
  const brut = new Float32Array(n);
  for (let i = 0; i < n; i++) brut[i] = hasard();
  // Un léger flou rend le bruit plus doux (moins de « neige »).
  const idx = (x: number, y: number, z: number): number => ((z + COTE) % COTE) * COTE * COTE + ((y + COTE) % COTE) * COTE + ((x + COTE) % COTE);
  const valeurs = new Uint8Array(n);
  for (let z = 0; z < COTE; z++)
    for (let y = 0; y < COTE; y++)
      for (let x = 0; x < COTE; x++) {
        let somme = 0;
        for (let d = -1; d <= 1; d++) somme += (brut[idx(x + d, y, z)] ?? 0) + (brut[idx(x, y + d, z)] ?? 0) + (brut[idx(x, y, z + d)] ?? 0);
        valeurs[idx(x, y, z)] = Math.round((somme / 9) * 255);
      }
  texBruit = new THREE.Data3DTexture(valeurs, COTE, COTE, COTE);
  texBruit.format = THREE.RedFormat;
  texBruit.minFilter = THREE.LinearFilter;
  texBruit.magFilter = THREE.LinearFilter;
  texBruit.wrapS = texBruit.wrapT = texBruit.wrapR = THREE.RepeatWrapping;
  texBruit.needsUpdate = true;
  return texBruit;
}
const BRUIT = /* glsl */ `
varying vec3 vPosMonde;
uniform highp sampler3D uBruit;
float bruit3(vec3 p) { return texture(uBruit, p * 0.125).r; }
`;

export interface Detail {
  /** Relief (0 : lisse). */
  relief: number;
  /** Variation de teinte, en plus ou en moins. */
  teinte: number;
  /** Taille du grain, en mètres. */
  grain: number;
}

/**
 * Un matériau physique « vivant » : la couleur, la rugosité et le relief varient doucement à la
 * surface (bois, toile, peinture usée), d'après la position dans le monde. Pas besoin d'UV.
 */
export function materiauDetaille(params: THREE.MeshStandardMaterialParameters, d: Detail): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0, ...params });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBruit = { value: bruit() };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosMonde;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 posMondeDetail = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          posMondeDetail = instanceMatrix * posMondeDetail;
        #endif
        vPosMonde = (modelMatrix * posMondeDetail).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${BRUIT}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float grosDetail = bruit3(vPosMonde * ${(0.25 / d.grain).toFixed(3)});
        float finDetail = bruit3(vPosMonde * ${(1 / d.grain).toFixed(3)});
        diffuseColor.rgb *= 1.0 + (grosDetail - 0.5) * ${(d.teinte * 1.4).toFixed(3)} + (finDetail - 0.5) * ${d.teinte.toFixed(3)};`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (finDetail - 0.5) * 0.35, 0.25, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        // Relief par dérivées (bump mapping sans texture) : le grain accroche la lumière.
        {
          float h = finDetail * 0.7 + grosDetail * 0.3;
          vec3 dpdx = dFdx(-vViewPosition);
          vec3 dpdy = dFdy(-vViewPosition);
          float hx = dFdx(h);
          float hy = dFdy(h);
          vec3 r1 = cross(dpdy, normal);
          vec3 r2 = cross(normal, dpdx);
          float det = dot(dpdx, r1);
          vec3 gradient = sign(det) * (hx * r1 + hy * r2);
          normal = normalize(abs(det) * normal - gradient * ${d.relief.toFixed(3)});
        }`,
      );
  };
  // Une clé par réglage : three.js ne mélange pas deux variantes du même shader.
  m.customProgramCacheKey = () => `detail-${d.relief}-${d.teinte}-${d.grain}`;
  return m;
}

// --- Lumière ------------------------------------------------------------------------------------
/** Ombres portées douces, lumière d'environnement, tonalité cinéma, brume atmosphérique. */
export function eclairer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, soleil: THREE.DirectionalLight, ciel: THREE.HemisphereLight): void {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Recalculée à la demande (voir la boucle de rendu) : le décor ne bouge pas.
  renderer.shadowMap.autoUpdate = false;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  pmrem.dispose();
  ciel.intensity = 0.65;
  // Un soleil de fin d'après-midi, assez bas pour des ombres longues.
  soleil.color.set(0xffe3c0);
  soleil.intensity = 3.8;
  soleil.position.set(-28, 34, 22);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  // L'ombre couvre toute la fête (elle ne bouge pas) : pas de recalcul de cadrage.
  const c = soleil.shadow.camera;
  c.left = -48;
  c.right = 48;
  c.top = 52;
  c.bottom = -52;
  c.near = 5;
  c.far = 120;
  soleil.target.position.set(0, 0, -6);
  scene.add(soleil.target);
  soleil.shadow.bias = -0.0004;
  soleil.shadow.normalBias = 0.04;
  soleil.shadow.radius = 3;
}

/** Tout ce qui a un volume porte et reçoit des ombres ; les ampoules et le sol plat, non. */
export function ombrer(racine: THREE.Object3D): void {
  racine.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.Material;
    if (m instanceof THREE.MeshBasicMaterial) return;
    o.receiveShadow = true;
    o.castShadow = !(o.geometry.boundingBox?.getSize(new THREE.Vector3()).y === 0);
  });
}

// --- Herbe en brins -------------------------------------------------------------------------------
export interface Herbe {
  racine: THREE.Group;
  animer(temps: number): void;
}

/**
 * Une touffe de gazon tondu : cinq feuilles courtes et larges, toutes penchées du même côté que
 * la texture du sol. Hauteur 1 (mise à l'échelle par instance), posée sur y = 0.
 */
function touffe(): THREE.BufferGeometry {
  const positions: number[] = [];
  const couleurs: number[] = [];
  const base = new THREE.Color(0x3b7619);
  const pointe = new THREE.Color(0x9ad646);
  for (let b = 0; b < 5; b++) {
    const a = (b / 5) * Math.PI * 2;
    const ox = Math.cos(a) * 0.09;
    const oz = Math.sin(a) * 0.09;
    const travers = a + Math.PI / 2;
    const lx = Math.cos(travers) * 0.07;
    const lz = Math.sin(travers) * 0.07;
    // Penchées vers le même côté (+x, −z), comme une pelouse brossée.
    const tip = [ox + 0.16, 1, oz - 0.12];
    for (const [v, t] of [[[ox - lx, 0, oz - lz], 0], [[ox + lx, 0, oz + lz], 0], [tip, 1]] as const) {
      positions.push(...v);
      const c = base.clone().lerp(pointe, t);
      couleurs.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 3));
  // Normales vers le ciel : l'herbe est éclairée comme le sol, sans faces noires.
  g.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

/**
 * Des touffes d'herbe sur toute la fête (un seul appel de dessin), sauf sur les allées et sous les
 * stands. Elles ondulent au vent dans le shader. libre(x, z) : vrai si on peut y mettre de l'herbe.
 */
export function semerHerbe(
  libre: (x: number, z: number) => boolean,
  nombre: number,
  zone: { x: number; zMin: number; zMax: number },
  sol: (x: number, z: number) => number = () => 0,
): Herbe {
  const racine = new THREE.Group();
  const temps = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTemps = temps;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTemps;').replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 pied = instanceMatrix[3].xyz;
      float souffle = sin(uTemps * 1.6 + pied.x * 0.35 + pied.z * 0.22) * 0.5 + sin(uTemps * 2.7 + pied.x * 0.9) * 0.2;
      float h = position.y * position.y;
      transformed.x += souffle * 0.05 * h;
      transformed.z += souffle * 0.03 * h;`,
    );
  };
  mat.customProgramCacheKey = () => 'herbe-vent';
  const geo = touffe();
  const touffes = new THREE.InstancedMesh(geo, mat, nombre);
  touffes.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  let graine = 1234;
  const hasard = (): number => (graine = (graine * 16807) % 2147483647) / 2147483647;
  let n = 0;
  for (let essai = 0; n < nombre && essai < nombre * 4; essai++) {
    const x = (hasard() * 2 - 1) * zone.x;
    const z = zone.zMin + hasard() * (zone.zMax - zone.zMin);
    if (!libre(x, z)) continue;
    p.set(x, sol(x, z), z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hasard() * Math.PI * 2);
    // Un gazon tondu : bas (10 à 18 cm) et touffu.
    const hauteur = 0.07 + hasard() * 0.06;
    const largeur = 0.7 + hasard() * 0.6;
    s.set(largeur, hauteur, largeur);
    touffes.setMatrixAt(n, m.compose(p, q, s));
    touffes.setColorAt(n, c.setHSL(0.25 + hasard() * 0.04, 0.55 + hasard() * 0.2, 0.5 + hasard() * 0.12));
    n++;
  }
  touffes.count = n;
  touffes.frustumCulled = false;
  racine.add(touffes);

  // Fleurs des champs et petits cailloux, en touches discrètes.
  const fleur = new THREE.IcosahedronGeometry(0.07, 0);
  const fleurs = new THREE.InstancedMesh(fleur, new THREE.MeshStandardMaterial({ roughness: 0.7 }), 1400);
  const teintes = [0xf4f1e8, 0xf2d34f, 0xb58ad8, 0xe98aa8, 0x8ab8e8];
  let f = 0;
  for (let essai = 0; f < 1400 && essai < 6000; essai++) {
    const x = (hasard() * 2 - 1) * zone.x;
    const z = zone.zMin + hasard() * (zone.zMax - zone.zMin);
    if (!libre(x, z)) continue;
    p.set(x, sol(x, z) + 0.12 + hasard() * 0.05, z);
    s.setScalar(0.5 + hasard() * 0.5);
    fleurs.setMatrixAt(f, m.compose(p, q.identity(), s));
    fleurs.setColorAt(f, c.set(teintes[f % teintes.length] ?? 0xffffff));
    f++;
  }
  fleurs.count = f;
  fleurs.frustumCulled = false;
  racine.add(fleurs);

  const caillou = new THREE.DodecahedronGeometry(0.12, 0);
  const cailloux = new THREE.InstancedMesh(caillou, materiauDetaille({ color: 0x9a948a }, { relief: 0.2, teinte: 0.15, grain: 0.06 }), 600);
  let k = 0;
  for (let essai = 0; k < 600 && essai < 4000; essai++) {
    const x = (hasard() * 2 - 1) * zone.x;
    const z = zone.zMin + hasard() * (zone.zMax - zone.zMin);
    if (!libre(x, z)) continue;
    p.set(x, sol(x, z) + 0.02, z);
    q.setFromEuler(new THREE.Euler(hasard() * 3, hasard() * 3, hasard() * 3));
    s.set(0.6 + hasard() * 1.4, 0.4 + hasard() * 0.5, 0.6 + hasard() * 1.2);
    cailloux.setMatrixAt(k, m.compose(p, q, s));
    k++;
  }
  cailloux.count = k;
  cailloux.castShadow = true;
  cailloux.receiveShadow = true;
  cailloux.frustumCulled = false;
  racine.add(cailloux);

  return {
    racine,
    animer(t) {
      temps.value = t;
    },
  };
}
