// Le Golem Express en 3D, vu de derrière : la barque du golem file sur une rivière qui tourne, se
// rétrécit et s'élargit, au milieu d'un lieu (la mine, la rivière, la forêt, la montagne, le
// volcan). Ce module ne fait que dessiner : les règles et le temps sont dans golem-express-vue.ts.
// Le monde avance vers -z ; à la distance d, la rivière a son milieu en x = centre(d) et va de
// x = -1 à x = 1 (en largeurs de rivière). Rien dans le décor ne ressemble à ce qu'on vise : pas
// d'objets au bord de l'eau, seulement les berges et des formes lointaines.

import * as THREE from 'three';
import type { Epreuve, IdLieu, Matiere, Objet, Riviere } from './golem-express.ts';

/** Jusqu'où on voit devant (les épreuves apparaissent dans la brume). */
export const PORTEE_VUE = 130;

/** Les couleurs des minerais : la couleur principale, et celle des éclats. */
export const COULEURS: Record<Matiere, [string, string]> = {
  fer: ['#ddd5ca', '#a8917a'],
  or: ['#f6c945', '#c48d1d'],
  cuivre: ['#d9824e', '#7fbfa0'],
  emeraude: ['#35c47a', '#1b7f4b'],
  diamant: ['#79e6e2', '#2fa9b8'],
  charbon: ['#4a4a4a', '#1c1c1c'],
  pierreRouge: ['#e0443a', '#ff8a7a'],
};

interface Decor {
  ciel: number;
  brume: [number, number];
  /** L'eau (ou la lave) : deux couleurs pour ses reflets. */
  eau: [string, string];
  lave?: boolean;
  berge: [string, string];
  /** Sous terre : la hauteur de la voûte. */
  voute?: number;
  rocher: number;
  /** Des formes au loin, bien à l'écart de l'eau (collines, montagnes, sapins géants). */
  lointain?: { sorte: 'colline' | 'montagne' | 'sapin'; couleur: number };
}

const DECORS: Record<IdLieu, Decor> = {
  mine: {
    ciel: 0x2b2018,
    brume: [30, PORTEE_VUE],
    eau: ['#2f7aa8', '#5aa9d6'],
    berge: ['#6b5240', '#5a4434'],
    voute: 7,
    rocher: 0x8a7a6a,
  },
  riviere: {
    ciel: 0xbfe6ff,
    brume: [45, PORTEE_VUE + 10],
    eau: ['#3f95cf', '#5fb1e3'],
    berge: ['#7cc35a', '#6db04d'],
    rocher: 0x9c9c92,
    lointain: { sorte: 'colline', couleur: 0x8fcf6a },
  },
  foret: {
    ciel: 0xd6efd0,
    brume: [35, PORTEE_VUE],
    eau: ['#3c8a8a', '#4f9f9a'],
    berge: ['#4e8a3a', '#447a33'],
    rocher: 0x8f8a7c,
    lointain: { sorte: 'sapin', couleur: 0x2f6e3a },
  },
  montagne: {
    ciel: 0xe6f2ff,
    brume: [40, PORTEE_VUE],
    eau: ['#6fb6e6', '#9fd0f0'],
    berge: ['#eef4fb', '#dbe7f3'],
    rocher: 0x7f8c99,
    lointain: { sorte: 'montagne', couleur: 0xb9c9dc },
  },
  volcan: {
    ciel: 0x4a2a2a,
    brume: [30, PORTEE_VUE],
    eau: ['#ff6a1a', '#ffa040'],
    lave: true,
    berge: ['#3e3634', '#332c2a'],
    rocher: 0x5a4f4a,
    lointain: { sorte: 'montagne', couleur: 0x2a2220 },
  },
};

/** Une texture en petites taches : l'eau, les berges. Elle est attachée au monde, donc elle défile. */
function texture(a: string, b: string): THREE.CanvasTexture {
  const t = document.createElement('canvas');
  t.width = 128;
  t.height = 128;
  const c = t.getContext('2d')!;
  c.fillStyle = a;
  c.fillRect(0, 0, 128, 128);
  c.fillStyle = b;
  for (let i = 0; i < 70; i++) c.fillRect(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 14, 2 + Math.random() * 5);
  const tex = new THREE.CanvasTexture(t);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const mat = (couleur: number | string, autres: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: couleur, flatShading: true, roughness: 0.85, ...autres });

/** Un minerai (bloc ou pépite), ou la TNT, prêt à poser dans la scène. */
export function modeleObjet(o: Objet): THREE.Group {
  const g = new THREE.Group();
  // Assez gros pour les reconnaître de loin.
  g.scale.setScalar(1.35);
  if (o.sorte === 'tnt') {
    const corps = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(0xd63a2f));
    const bande = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.72), mat(0xfff8ee));
    const meche = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), mat(0x4a3833));
    meche.position.y = 0.48;
    g.add(corps, bande, meche);
    return g;
  }
  const [a, b] = COULEURS[o.matiere];
  const brillant = o.matiere === 'diamant' || o.matiere === 'emeraude' || o.matiere === 'or' || o.matiere === 'pierreRouge';
  const matiere = mat(a, { emissive: new THREE.Color(a), emissiveIntensity: brillant ? 0.35 : 0.12, roughness: brillant ? 0.4 : 0.85 });
  if (o.forme === 'bloc') {
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), matiere));
    // Des éclats en petits cubes sur les faces : chaque matière a les siens.
    const eclat = mat(b);
    for (const [x, y, z] of [
      [0.37, 0.15, -0.1],
      [-0.37, -0.12, 0.15],
      [0.1, 0.37, 0.12],
      [-0.15, -0.37, -0.1],
      [0.12, 0.1, 0.37],
      [-0.1, -0.15, -0.37],
    ] as const) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), eclat);
      p.position.set(x, y, z);
      g.add(p);
    }
  } else {
    // La pépite : un caillou à facettes, plus petit et tout en angles.
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), matiere);
    p.scale.set(1.15, 0.85, 1);
    g.add(p);
  }
  return g;
}

/** La barque, et le golem de pierre moussue assis dedans. */
function modeleBarque(): THREE.Group {
  const g = new THREE.Group();
  const bois = mat(0x8a5a33);
  const clair = mat(0xc49a62);
  const coque = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.7), bois);
  coque.position.y = 0.2;
  // La proue en pointe, devant (vers -z).
  const proue = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 3), bois);
  proue.rotation.y = Math.PI / 2;
  proue.scale.set(1, 1, 1.4);
  proue.position.set(0, 0.2, -0.95);
  const bord = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.08, 1.78), clair);
  bord.position.y = 0.42;
  const pierre = mat(0x9a9a8e);
  const mousse = mat(0x6fa35a);
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.48), pierre);
  corps.position.set(0, 0.75, 0.1);
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.42), pierre);
  tete.position.set(0, 1.28, 0.05);
  const chapeau = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.46), mousse);
  chapeau.position.set(0, 1.52, 0.05);
  const epaules = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.5), mousse);
  epaules.position.set(0, 1.08, 0.1);
  g.add(coque, proue, bord, corps, tete, chapeau, epaules);
  for (const s of [-1, 1]) {
    const bras = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.2), pierre);
    bras.position.set(s * 0.42, 0.8, 0.05);
    g.add(bras);
  }
  return g;
}

/** La petite barque d'un golem égaré qu'on a ramené. */
function modeleBarquette(i: number): THREE.Group {
  const g = new THREE.Group();
  const couleur = [0x6aa8ef, 0x8acb52, 0xffc94a, 0xc58ce8][i % 4]!;
  const coque = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 1.1), mat(couleur));
  coque.position.y = 0.15;
  const proue = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 3), mat(couleur));
  proue.rotation.y = Math.PI / 2;
  proue.position.set(0, 0.15, -0.6);
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), mat(0x9a9a8e));
  tete.position.y = 0.5;
  const mousse = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.3), mat(0x6fa35a));
  mousse.position.y = 0.67;
  g.add(coque, proue, tete, mousse);
  return g;
}

/** Une porte dorée : deux piliers plantés dans l'eau, une barre, et le passage qui brille. */
function modelePorte(e: Epreuve, demi: number): THREE.Group {
  const g = new THREE.Group();
  const l = e.largeur * demi;
  const or = mat(0xf2c14e, { emissive: new THREE.Color(0xc48d1d), emissiveIntensity: 0.3, roughness: 0.5 });
  for (const s of [-1, 1]) {
    const pilier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.8, 8), or);
    pilier.position.set(s * (l + 0.12), 1.2, 0);
    g.add(pilier);
  }
  const barre = new THREE.Mesh(new THREE.BoxGeometry(2 * l + 0.5, 0.22, 0.22), or);
  barre.position.y = 2.6;
  const passage = new THREE.Mesh(new THREE.PlaneGeometry(2 * l, 3), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.45, depthWrite: false }));
  passage.rotation.x = -Math.PI / 2;
  passage.position.y = 0.04;
  g.add(barre, passage);
  return g;
}

function modeleRocher(e: Epreuve, demi: number, couleur: number): THREE.Group {
  const g = new THREE.Group();
  const r = e.largeur * demi;
  const p = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(couleur));
  p.scale.set(1, 0.85, 0.9);
  p.position.y = r * 0.45;
  p.rotation.set(Math.random(), Math.random(), Math.random());
  g.add(p);
  return g;
}

/** Une grande forme au loin, loin de l'eau : on ne peut pas la prendre pour une cible. */
function modeleLointain(sorte: NonNullable<Decor['lointain']>['sorte'], couleur: number): THREE.Object3D {
  const taille = 6 + Math.random() * 8;
  if (sorte === 'colline') {
    const c = new THREE.Mesh(new THREE.SphereGeometry(taille, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(couleur));
    c.scale.y = 0.45;
    return c;
  }
  if (sorte === 'montagne') {
    const c = new THREE.Mesh(new THREE.ConeGeometry(taille, taille * 1.6, 6), mat(couleur));
    c.position.y = taille * 0.8;
    const g = new THREE.Group();
    g.add(c);
    return g;
  }
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(2.6 - i * 0.6, 3.5, 7), mat(couleur));
    c.position.y = 2 + i * 2.2;
    g.add(c);
  }
  return g;
}

/** Une bande qui suit la rivière : des colonnes (côté, écart au bord de l'eau, hauteur), une
 *  rangée tous les PAS mètres, recalculées à chaque image autour de la barque. */
const PAS = 2.5;
const RANGEES = Math.ceil((PORTEE_VUE + 40) / PAS);
function ruban(colonnes: Array<[-1 | 1, number, number]>, matiere: THREE.Material, repetition: number): { maillage: THREE.Mesh; suivre(d: number, r: Riviere): void } {
  const n = colonnes.length;
  const positions = new Float32Array(RANGEES * n * 3);
  const uvs = new Float32Array(RANGEES * n * 2);
  const indices: number[] = [];
  for (let j = 0; j < RANGEES - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      indices.push(a, a + 1, a + n, a + 1, a + n + 1, a + n);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const maillage = new THREE.Mesh(geo, matiere);
  maillage.frustumCulled = false;
  return {
    maillage,
    suivre(d, r) {
      const debut = Math.floor((d - 25) / PAS) * PAS;
      for (let j = 0; j < RANGEES; j++) {
        const dist = debut + j * PAS;
        const c = r.centre(dist);
        const w = r.demi(dist);
        colonnes.forEach(([cote, ecart, y], i) => {
          const k = (j * n + i) * 3;
          positions[k] = c + cote * (w + ecart);
          positions[k + 1] = y;
          positions[k + 2] = -dist;
          uvs[(j * n + i) * 2] = (i / (n - 1)) * repetition;
          uvs[(j * n + i) * 2 + 1] = dist / 8;
        });
      }
      geo.attributes.position!.needsUpdate = true;
      geo.attributes.uv!.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

export interface Scene {
  poserEpreuve(e: Epreuve, distance: number): number;
  marquerEpreuve(id: number, reussie: boolean): void;
  /** Un minerai lancé vers le golem : il vole en l'air, d'un côté (1 : à droite, -1 : à gauche),
   *  jamais sur l'eau devant la barque. */
  poserObjet(o: Objet, distance: number, cote: 1 | -1): number;
  deplacerObjet(id: number, distance: number): void;
  /** Le golem tire : un trait part vers l'objet ; le bon minerai vole en éclats, un piège fait
   *  « pschitt » (un petit nuage gris, jamais d'explosion). */
  attraper(id: number, bon: boolean): void;
  /** Un minerai qu'on peut encore viser brille un peu. */
  aPortee(id: number, oui: boolean): void;
  /** Une image : la barque est à la distance d et en x (rivière), penchée de « virage ». */
  image(dt: number, d: number, x: number, virage: number): void;
  /** Une petite secousse (une berge frottée). */
  secouer(): void;
  liberer(): void;
}

interface Pose {
  objet: THREE.Object3D;
  distance: number;
  sorte: 'epreuve' | 'objet';
  etat: '' | 'pris' | 'pschitt' | 'ratee' | 'reussie';
  depuis: number;
}

const LONGUEUR_LOINTAIN = 260;

export function creerScene(toile: HTMLCanvasElement, lieu: IdLieu, wagons: number, riviere: Riviere): Scene {
  const decor = DECORS[lieu];
  const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(decor.ciel);
  scene.fog = new THREE.Fog(decor.ciel, decor.brume[0], decor.brume[1]);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(decor.berge[0]), lieu === 'mine' || lieu === 'volcan' ? 2.2 : 2.4));
  const soleil = new THREE.DirectionalLight(0xffffff, lieu === 'mine' ? 1.3 : 1.6);
  scene.add(soleil, soleil.target);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 300);

  // L'eau, les berges (et la voûte sous terre) : des bandes qui suivent la rivière.
  const texEau = texture(decor.eau[0], decor.eau[1]);
  const eau = ruban(
    [
      [-1, 0.4, -0.02],
      [1, 0.4, -0.02],
    ],
    decor.lave ? new THREE.MeshBasicMaterial({ map: texEau }) : new THREE.MeshStandardMaterial({ map: texEau, roughness: 0.25, metalness: 0.1 }),
    2,
  );
  const texBerge = texture(decor.berge[0], decor.berge[1]);
  const matBerge = new THREE.MeshStandardMaterial({ map: texBerge, roughness: 0.95, side: THREE.DoubleSide });
  const v = decor.voute;
  const bandes = [eau];
  for (const s of [-1, 1] as const) {
    // Sous terre, la paroi monte jusqu'à la voûte ; dehors, une berge basse puis la plaine.
    const profil: Array<[-1 | 1, number, number]> =
      v !== undefined
        ? [
            [s, 0, -0.1],
            [s, 0.6, 0.4],
            [s, 2.5, 0.5],
            [s, 4.5, v],
          ]
        : [
            [s, 0, -0.1],
            [s, 0.5, 0.7],
            [s, 2, 0.8],
            [s, 60, 0.8],
          ];
    bandes.push(ruban(profil, matBerge, v !== undefined ? 3 : 8));
  }
  if (v !== undefined)
    bandes.push(
      ruban(
        [
          [-1, 4.5, v],
          [1, 4.5, v],
        ],
        new THREE.MeshStandardMaterial({ color: 0x3a2d22, roughness: 1, side: THREE.DoubleSide }),
        1,
      ),
    );
  for (const b of bandes) scene.add(b.maillage);

  // Les formes lointaines, recyclées devant la barque.
  const lointains: Array<{ objet: THREE.Object3D; distance: number; cote: number; ecart: number }> = [];
  if (decor.lointain)
    for (let dist = 0; dist < LONGUEUR_LOINTAIN; dist += 9 + Math.random() * 12) {
      const objet = modeleLointain(decor.lointain.sorte, decor.lointain.couleur);
      scene.add(objet);
      lointains.push({ objet, distance: dist, cote: Math.random() < 0.5 ? -1 : 1, ecart: 18 + Math.random() * 40 });
    }
  const placer = (l: (typeof lointains)[number]): void => {
    l.objet.position.set(riviere.centre(l.distance) + l.cote * (riviere.demi(l.distance) + l.ecart), 0.6, -l.distance);
  };
  lointains.forEach(placer);

  const barque = modeleBarque();
  scene.add(barque);
  const suite = Array.from({ length: Math.min(3, wagons) }, (_, i) => {
    const b = modeleBarquette(i);
    scene.add(b);
    return b;
  });
  const passe: Array<{ d: number; x: number }> = [];

  /** Le point du monde à la distance dist, en x (en largeurs de rivière). */
  const monde = (dist: number, x: number): number => riviere.centre(dist) + x * riviere.demi(dist);
  /** La direction de la rivière (angle à donner à ce qui la suit). */
  const direction = (dist: number): number => -Math.atan((riviere.centre(dist + 1) - riviere.centre(dist - 1)) / 2);

  let compteur = 0;
  const poses = new Map<number, Pose>();
  let secousse = 0;
  let temps = 0;
  let xBarque = 0;

  const taille = (): void => {
    const r = toile.getBoundingClientRect();
    if (!r.width || !r.height) return;
    rendu.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  taille();
  const observateur = new ResizeObserver(taille);
  observateur.observe(toile);

  const liberer = (o: THREE.Object3D): void => {
    o.traverse((x) => {
      if (x instanceof THREE.Mesh) {
        x.geometry.dispose();
        const m = x.material as THREE.Material | THREE.Material[];
        for (const y of Array.isArray(m) ? m : [m]) y.dispose();
      }
    });
  };
  const effets: Array<{ objet: THREE.Line; depuis: number; duree: number }> = [];
  const retirer = (id: number): void => {
    const p = poses.get(id);
    if (!p) return;
    scene.remove(p.objet);
    liberer(p.objet);
    poses.delete(id);
  };

  return {
    poserEpreuve(e, distance) {
      const w = riviere.demi(distance);
      const objet = e.sorte === 'porte' ? modelePorte(e, w) : modeleRocher(e, w, decor.rocher);
      objet.position.set(monde(distance, e.x), 0, -distance);
      objet.rotation.y = direction(distance);
      scene.add(objet);
      poses.set(++compteur, { objet, distance, sorte: 'epreuve', etat: '', depuis: 0 });
      return compteur;
    },
    marquerEpreuve(id, reussie) {
      const p = poses.get(id);
      if (!p) return;
      p.etat = reussie ? 'reussie' : 'ratee';
      p.depuis = temps;
      if (!reussie)
        p.objet.traverse((x) => {
          if (x instanceof THREE.Mesh && x.material instanceof THREE.MeshStandardMaterial) {
            x.material.color.set(0x9a948a);
            x.material.emissiveIntensity = 0;
          }
        });
    },
    poserObjet(o, distance, cote) {
      const objet = modeleObjet(o);
      objet.userData.cote = cote;
      objet.userData.couleur = o.sorte === 'tnt' ? '#d63a2f' : COULEURS[o.matiere][0];
      objet.position.set(0, 8, -distance);
      scene.add(objet);
      poses.set(++compteur, { objet, distance, sorte: 'objet', etat: '', depuis: 0 });
      return compteur;
    },
    deplacerObjet(id, distance) {
      const p = poses.get(id);
      if (p && !p.etat) p.distance = distance;
    },
    attraper(id, bon) {
      const p = poses.get(id);
      if (!p) return;
      p.etat = bon ? 'pris' : 'pschitt';
      p.depuis = temps;
      // Le tir : un trait lumineux du golem jusqu'à l'objet, qui s'efface aussitôt.
      const depart = barque.position.clone().add(new THREE.Vector3(0, 1.9, 0));
      const trait = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([depart, p.objet.position.clone()]),
        new THREE.LineBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 1 }),
      );
      scene.add(trait);
      effets.push({ objet: trait, depuis: temps, duree: 0.15 });
      scene.remove(p.objet);
      liberer(p.objet);
      if (bon) {
        // Des éclats de sa couleur, projetés tout autour.
        const eclats = new THREE.Group();
        eclats.position.copy(p.objet.position);
        const m = new THREE.MeshBasicMaterial({ color: p.objet.userData.couleur as string, transparent: true });
        for (let i = 0; i < 10; i++) {
          const e = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), m);
          e.userData.dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
          eclats.add(e);
        }
        p.objet = eclats;
      } else {
        // Pas d'explosion : un petit nuage gris remplace le piège.
        const nuage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshBasicMaterial({ color: 0xbdbdbd, transparent: true, opacity: 0.8 }));
        nuage.position.copy(p.objet.position);
        p.objet = nuage;
      }
      scene.add(p.objet);
    },
    aPortee(id, oui) {
      const p = poses.get(id);
      if (p && !p.etat) p.objet.userData.aPortee = oui;
    },
    secouer() {
      secousse = 0.25;
    },
    image(dt, d, x, virage) {
      temps += dt;
      xBarque = x;
      const z = -d;
      const X = monde(d, x);
      const dir = direction(d);
      // La barque se balance un peu sur l'eau, et penche dans les virages.
      barque.position.set(X, Math.sin(temps * 3) * 0.04, z);
      barque.rotation.z = -virage * 0.2 + Math.sin(temps * 2.3) * 0.03;
      barque.rotation.y = dir - virage * 0.15;
      // Les petites barques suivent, sur la trace de la nôtre.
      passe.push({ d, x });
      while (passe.length > 2 && passe[0]!.d < d - 12) passe.shift();
      suite.forEach((b, i) => {
        const cible = d - 2.4 * (i + 1);
        const p = passe.find((q) => q.d >= cible) ?? passe[0]!;
        b.position.set(monde(cible, p.x), Math.sin(temps * 3 + i) * 0.04, -cible);
        b.rotation.y = direction(cible);
      });
      // La caméra, derrière et au-dessus, qui regarde où va la rivière.
      const sec = secousse > 0 ? (Math.random() - 0.5) * secousse * 0.6 : 0;
      secousse = Math.max(0, secousse - dt);
      const dc = d - 7.8;
      const dv = d + 16;
      camera.position.set(riviere.centre(dc) + x * riviere.demi(dc) * 0.55 + sec, 4.1, -dc);
      camera.lookAt(riviere.centre(dv) + x * riviere.demi(dv) * 0.6, 1.2, -dv);
      camera.rotation.z += -virage * 0.06;
      soleil.position.set(X - 4, 10, z + 6);
      soleil.target.position.set(X, 0, z - 10);
      // L'eau, les berges, et les formes lointaines suivent.
      for (const b of bandes) b.suivre(d, riviere);
      texEau.offset.y -= dt * 0.4;
      for (const l of lointains)
        if (l.distance < d - 30) {
          l.distance += LONGUEUR_LOINTAIN;
          placer(l);
        }
      for (const e of [...effets]) {
        const k = (temps - e.depuis) / e.duree;
        (e.objet.material as THREE.LineBasicMaterial).opacity = Math.max(0, 1 - k);
        if (k >= 1) {
          scene.remove(e.objet);
          e.objet.geometry.dispose();
          (e.objet.material as THREE.Material).dispose();
          effets.splice(effets.indexOf(e), 1);
        }
      }
      // Les minerais en vol, les éclats, les nuages, et les épreuves réussies.
      for (const [id, p] of poses) {
        const age = temps - p.depuis;
        if (p.sorte === 'objet') {
          if (p.etat === 'pris') {
            const k = Math.min(1, age / 0.45);
            for (const e of p.objet.children) {
              e.position.copy((e.userData.dir as THREE.Vector3).clone().multiplyScalar(k * 2.2));
              e.rotation.x += dt * 9;
            }
            ((p.objet.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - k;
            if (k >= 1) retirer(id);
            continue;
          }
          if (p.etat === 'pschitt') {
            const k = age / 0.6;
            p.objet.scale.setScalar(1 + k * 1.5);
            ((p.objet as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
            if (k >= 1) retirer(id);
            continue;
          }
          // En vol : il arrive de loin, en haut d'un côté, et passe au-dessus de l'épaule du golem.
          // Il tourne vite, comme un objet lancé.
          const loin = Math.max(0, p.distance - d);
          const cote = p.objet.userData.cote as number;
          p.objet.position.set(monde(p.distance, xBarque) + cote * (2.1 + loin * 0.05), 3.1 + loin * 0.06, -p.distance);
          p.objet.rotation.x += dt * 5;
          p.objet.rotation.y += dt * 7;
          const s = p.objet.userData.aPortee ? 1.15 + Math.sin(temps * 12) * 0.06 : 1;
          p.objet.scale.setScalar(1.35 * s);
        } else if (p.etat === 'reussie') {
          const k = Math.min(1, age / 0.5);
          p.objet.scale.setScalar(1 + k * 0.25);
        }
        if (p.distance < d - 12) retirer(id);
      }
      rendu.render(scene, camera);
    },
    liberer() {
      observateur.disconnect();
      for (const id of [...poses.keys()]) retirer(id);
      scene.traverse((x) => {
        if (x instanceof THREE.Mesh) {
          x.geometry.dispose();
          const m = x.material as THREE.Material | THREE.Material[];
          for (const y of Array.isArray(m) ? m : [m]) {
            (y as THREE.MeshStandardMaterial).map?.dispose();
            y.dispose();
          }
        }
      });
      rendu.dispose();
    },
  };
}
