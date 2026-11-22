// Le Golem Express en 3D, vu de derrière : le wagonnet du golem file dans l'écran, au milieu d'un
// lieu (la mine, la rivière, la forêt, la montagne, le volcan). Ce module ne fait que dessiner :
// les règles et le temps sont dans golem-express-vue.ts. Le monde avance vers -z ; la galerie va
// de x = -1 à x = 1 (DEMI_GALERIE mètres de chaque côté).

import * as THREE from 'three';
import { DEMI_WAGONNET, type Epreuve, type IdLieu, type Matiere, type Objet } from './golem-express.ts';

export const DEMI_GALERIE = 3;
/** Jusqu'où on voit devant (les objets apparaissent dans la brume). */
export const PORTEE_VUE = 110;
const LONGUEUR_DECOR = 150;

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
  sol: [string, string];
  bords: number;
  plafond?: number;
  rocher: number;
  /** Ce qui borde la route : des éléments posés de chaque côté. */
  elements: Array<{ sorte: 'cristal' | 'arbre' | 'sapin' | 'bloc' | 'poutre' | 'lanterne' | 'lave' | 'champignon'; couleur: number; tous: number }>;
}

const DECORS: Record<IdLieu, Decor> = {
  mine: {
    ciel: 0x2b2018,
    brume: [25, PORTEE_VUE],
    sol: ['#6b5240', '#5a4434'],
    bords: 0x6a5240,
    plafond: 0x3a2d22,
    rocher: 0x8a7a6a,
    elements: [
      { sorte: 'poutre', couleur: 0x8b5a2b, tous: 16 },
      { sorte: 'lanterne', couleur: 0xffc04a, tous: 16 },
      { sorte: 'cristal', couleur: 0x6fd6ff, tous: 7 },
      { sorte: 'cristal', couleur: 0xc58ce8, tous: 11 },
    ],
  },
  riviere: {
    ciel: 0xbfe6ff,
    brume: [40, PORTEE_VUE + 10],
    sol: ['#4fa6d8', '#62b8e6'],
    bords: 0x7cc35a,
    rocher: 0x9c9c92,
    elements: [
      { sorte: 'arbre', couleur: 0x4f9e3a, tous: 6 },
      { sorte: 'bloc', couleur: 0xa0a094, tous: 9 },
    ],
  },
  foret: {
    ciel: 0xd6efd0,
    brume: [30, PORTEE_VUE],
    sol: ['#8a6b45', '#7b5e3c'],
    bords: 0x4e8a3a,
    rocher: 0x8f8a7c,
    elements: [
      { sorte: 'arbre', couleur: 0x3f8a32, tous: 4 },
      { sorte: 'sapin', couleur: 0x2f6e3a, tous: 5 },
      { sorte: 'champignon', couleur: 0xe0443a, tous: 13 },
    ],
  },
  montagne: {
    ciel: 0xe6f2ff,
    brume: [35, PORTEE_VUE],
    sol: ['#eef4fb', '#dbe7f3'],
    bords: 0xcfdced,
    rocher: 0x7f8c99,
    elements: [
      { sorte: 'sapin', couleur: 0x2f6e4a, tous: 5 },
      { sorte: 'cristal', couleur: 0x9fd8ff, tous: 7 },
    ],
  },
  volcan: {
    ciel: 0x4a2a2a,
    brume: [25, PORTEE_VUE],
    sol: ['#3e3634', '#332c2a'],
    bords: 0x2a2220,
    rocher: 0x5a4f4a,
    elements: [
      { sorte: 'lave', couleur: 0xff6a1a, tous: 6 },
      { sorte: 'bloc', couleur: 0x4a403c, tous: 8 },
      { sorte: 'cristal', couleur: 0xff9a4a, tous: 12 },
    ],
  },
};

/** Une texture de sol en petites taches, qu'on fait défiler pour donner la vitesse. */
function textureSol(a: string, b: string): THREE.CanvasTexture {
  const t = document.createElement('canvas');
  t.width = 128;
  t.height = 128;
  const c = t.getContext('2d')!;
  c.fillStyle = a;
  c.fillRect(0, 0, 128, 128);
  c.fillStyle = b;
  for (let i = 0; i < 70; i++) c.fillRect(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 10, 3 + Math.random() * 6);
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

/** Le wagonnet qui flotte, et le golem de pierre moussue dedans. */
function modeleWagonnet(): THREE.Group {
  const g = new THREE.Group();
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(DEMI_WAGONNET * 2 * DEMI_GALERIE, 0.55, 1.5), mat(0x6b4a33));
  caisse.position.y = 0.45;
  const bord = new THREE.Mesh(new THREE.BoxGeometry(DEMI_WAGONNET * 2 * DEMI_GALERIE + 0.1, 0.1, 1.6), mat(0xb08a5a));
  bord.position.y = 0.76;
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.45 }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.05;
  const pierre = mat(0x9a9a8e);
  const mousse = mat(0x6fa35a);
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.48), pierre);
  corps.position.set(0, 1.05, 0.1);
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.42), pierre);
  tete.position.set(0, 1.58, 0.05);
  const chapeau = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.46), mousse);
  chapeau.position.set(0, 1.82, 0.05);
  const epaules = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.1, 0.5), mousse);
  epaules.position.set(0, 1.38, 0.1);
  g.add(caisse, bord, halo, corps, tete, chapeau, epaules);
  for (const s of [-1, 1]) {
    const bras = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.2), pierre);
    bras.position.set(s * 0.42, 1.1, 0.05);
    bras.name = s < 0 ? 'bras-gauche' : 'bras-droit';
    g.add(bras);
  }
  return g;
}

function modeleWagon(i: number): THREE.Group {
  const g = new THREE.Group();
  const couleur = [0x6aa8ef, 0x8acb52, 0xffc94a, 0xc58ce8][i % 4]!;
  const caisse = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 1.1), mat(couleur));
  caisse.position.y = 0.4;
  // Le petit golem égaré qu'on a ramené : une tête qui dépasse.
  const tete = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), mat(0x9a9a8e));
  tete.position.y = 0.78;
  const mousse = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.3), mat(0x6fa35a));
  mousse.position.y = 0.95;
  g.add(caisse, tete, mousse);
  return g;
}

/** Une porte dorée : deux piliers, une barre, et le passage qui brille au sol. */
function modelePorte(e: Epreuve): THREE.Group {
  const g = new THREE.Group();
  const l = e.largeur * DEMI_GALERIE;
  const or = mat(0xf2c14e, { emissive: new THREE.Color(0xc48d1d), emissiveIntensity: 0.3, roughness: 0.5 });
  for (const s of [-1, 1]) {
    const pilier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8), or);
    pilier.position.set(s * (l + 0.12), 1.3, 0);
    g.add(pilier);
  }
  const barre = new THREE.Mesh(new THREE.BoxGeometry(2 * l + 0.5, 0.22, 0.22), or);
  barre.position.y = 2.6;
  const passage = new THREE.Mesh(new THREE.PlaneGeometry(2 * l, 3), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.4, depthWrite: false }));
  passage.rotation.x = -Math.PI / 2;
  passage.position.y = 0.03;
  passage.name = 'passage';
  g.add(barre, passage);
  return g;
}

function modeleRocher(e: Epreuve, couleur: number): THREE.Group {
  const g = new THREE.Group();
  const r = e.largeur * DEMI_GALERIE;
  const p = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(couleur));
  p.scale.set(1, 0.85, 0.9);
  p.position.y = r * 0.7;
  p.rotation.set(Math.random(), Math.random(), Math.random());
  g.add(p);
  return g;
}

function modeleElement(sorte: Decor['elements'][number]['sorte'], couleur: number): THREE.Object3D {
  const g = new THREE.Group();
  switch (sorte) {
    case 'cristal': {
      for (let i = 0; i < 3; i++) {
        const h = 0.8 + Math.random() * 1.4;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, h, 5), mat(couleur, { emissive: new THREE.Color(couleur), emissiveIntensity: 0.5, roughness: 0.3 }));
        c.position.set((Math.random() - 0.5) * 0.8, h / 2, (Math.random() - 0.5) * 0.8);
        c.rotation.z = (Math.random() - 0.5) * 0.5;
        g.add(c);
      }
      break;
    }
    case 'arbre': {
      const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 6), mat(0x7a5a3a));
      tronc.position.y = 0.7;
      const feuilles = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), mat(couleur));
      feuilles.position.y = 2;
      g.add(tronc, feuilles);
      break;
    }
    case 'sapin': {
      const tronc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.8, 6), mat(0x6a4a30));
      tronc.position.y = 0.4;
      g.add(tronc);
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(1 - i * 0.25, 1.2, 7), mat(couleur));
        c.position.y = 1.1 + i * 0.7;
        g.add(c);
      }
      break;
    }
    case 'bloc': {
      const s = 0.6 + Math.random() * 1.2;
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(couleur));
      b.position.y = s * 0.5;
      g.add(b);
      break;
    }
    case 'champignon': {
      const pied = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 6), mat(0xfff3dc));
      pied.position.y = 0.2;
      const chapeau = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(couleur));
      chapeau.position.y = 0.38;
      g.add(pied, chapeau);
      break;
    }
    case 'lave': {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 2.4), new THREE.MeshBasicMaterial({ color: couleur }));
      l.position.y = 0.04;
      g.add(l);
      break;
    }
    case 'lanterne': {
      const poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), mat(0x5a3a22));
      poteau.position.y = 1.1;
      const lumiere = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: couleur }));
      lumiere.position.y = 2.25;
      g.add(poteau, lumiere);
      break;
    }
    case 'poutre':
      // Les poutres de la mine sont construites à part (elles enjambent la galerie).
      break;
  }
  return g;
}

/** Une arche de bois qui enjambe la galerie de la mine. */
function modelePoutre(couleur: number): THREE.Group {
  const g = new THREE.Group();
  const bois = mat(couleur);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 5, 0.35), bois);
    p.position.set(s * (DEMI_GALERIE + 0.6), 2.5, 0);
    g.add(p);
  }
  const b = new THREE.Mesh(new THREE.BoxGeometry(2 * DEMI_GALERIE + 1.6, 0.4, 0.4), bois);
  b.position.y = 5;
  g.add(b);
  return g;
}

export interface Scene {
  poserEpreuve(e: Epreuve, distance: number): number;
  marquerEpreuve(id: number, reussie: boolean): void;
  /** Un minerai lancé vers le golem : il vole en l'air, à droite, jamais sur la route. */
  poserObjet(o: Objet, distance: number): number;
  deplacerObjet(id: number, distance: number): void;
  /** Le minerai attrapé file vers le golem ; un piège attrapé fait « pschitt ». */
  attraper(id: number, bon: boolean): void;
  /** Un minerai à portée brille un peu. */
  aPortee(id: number, oui: boolean): void;
  /** Une image : le wagonnet est à la distance d et en x (galerie), penché de « virage ». */
  image(dt: number, d: number, x: number, virage: number): void;
  /** Une petite secousse (un mur frotté). */
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

export function creerScene(toile: HTMLCanvasElement, lieu: IdLieu, wagons: number): Scene {
  const decor = DECORS[lieu];
  const rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, powerPreference: 'high-performance' });
  rendu.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(decor.ciel);
  scene.fog = new THREE.Fog(decor.ciel, decor.brume[0], decor.brume[1]);
  scene.add(new THREE.HemisphereLight(0xffffff, decor.bords, lieu === 'mine' || lieu === 'volcan' ? 2.2 : 2.4));
  const soleil = new THREE.DirectionalLight(0xffffff, lieu === 'mine' ? 1.3 : 1.6);
  soleil.position.set(-4, 10, 6);
  scene.add(soleil, soleil.target);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 260);

  // Le sol et les bords suivent le wagonnet ; leur texture défile.
  const tex = textureSol(decor.sol[0], decor.sol[1]);
  tex.repeat.set(6, 40);
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(2 * DEMI_GALERIE + 1, 240), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  sol.rotation.x = -Math.PI / 2;
  const texBords = textureSol(`#${new THREE.Color(decor.bords).getHexString()}`, `#${new THREE.Color(decor.bords).multiplyScalar(0.8).getHexString()}`);
  texBords.repeat.set(4, 40);
  const bords = new THREE.Group();
  for (const s of [-1, 1]) {
    // Le bord de la galerie : un muret (mine, volcan) ou une berge (dehors).
    const haut = decor.plafond !== undefined ? 6 : 0.5;
    const b = new THREE.Mesh(new THREE.BoxGeometry(14, haut, 240), new THREE.MeshStandardMaterial({ map: texBords, roughness: 0.95 }));
    b.position.set(s * (DEMI_GALERIE + 0.5 + 7), haut / 2, 0);
    bords.add(b);
  }
  if (decor.plafond !== undefined) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2 * DEMI_GALERIE + 4, 240), mat(decor.plafond));
    p.rotation.x = Math.PI / 2;
    p.position.y = 6;
    bords.add(p);
  }
  // Le bord de la route, bien visible : une ligne claire de chaque côté.
  for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 240), new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.7 }));
    l.rotation.x = -Math.PI / 2;
    l.position.set(s * DEMI_GALERIE, 0.02, 0);
    bords.add(l);
  }
  scene.add(sol, bords);

  // Le décor des côtés, recyclé devant le wagonnet.
  const elements: Array<{ objet: THREE.Object3D; distance: number }> = [];
  for (const e of decor.elements) {
    for (let d = Math.random() * e.tous; d < LONGUEUR_DECOR; d += e.tous * (0.7 + Math.random() * 0.6)) {
      const objet = e.sorte === 'poutre' ? modelePoutre(e.couleur) : modeleElement(e.sorte, e.couleur);
      if (e.sorte !== 'poutre') {
        const cote = Math.random() < 0.5 ? -1 : 1;
        objet.position.x = cote * (DEMI_GALERIE + 1 + Math.random() * (e.sorte === 'lave' ? 1 : 4));
        // Dans la mine, entre la route et la paroi ; dehors, posé sur la berge.
        if (decor.plafond !== undefined && e.sorte !== 'lanterne') objet.position.x = cote * (DEMI_GALERIE + 0.15 + Math.random() * 0.3);
        if (decor.plafond === undefined) objet.position.y = 0.5;
        if (e.sorte === 'lanterne') objet.position.x = cote * (DEMI_GALERIE + 0.4);
      }
      scene.add(objet);
      elements.push({ objet, distance: d });
    }
  }

  const wagonnet = modeleWagonnet();
  scene.add(wagonnet);
  const trainee = Array.from({ length: Math.min(3, wagons) }, (_, i) => {
    const w = modeleWagon(i);
    scene.add(w);
    return w;
  });
  const passe: Array<{ d: number; x: number }> = [];

  let compteur = 0;
  const poses = new Map<number, Pose>();
  let secousse = 0;
  let temps = 0;

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
  const retirer = (id: number): void => {
    const p = poses.get(id);
    if (!p) return;
    scene.remove(p.objet);
    liberer(p.objet);
    poses.delete(id);
  };

  return {
    poserEpreuve(e, distance) {
      const objet = e.sorte === 'porte' ? modelePorte(e) : modeleRocher(e, decor.rocher);
      objet.position.set(e.x * DEMI_GALERIE, 0, -distance);
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
    poserObjet(o, distance) {
      const objet = modeleObjet(o);
      objet.position.set(0, 6, -distance);
      scene.add(objet);
      poses.set(++compteur, { objet, distance, sorte: 'objet', etat: '', depuis: 0 });
      return compteur;
    },
    deplacerObjet(id, distance) {
      const p = poses.get(id);
      if (p) p.distance = distance;
    },
    attraper(id, bon) {
      const p = poses.get(id);
      if (!p) return;
      p.etat = bon ? 'pris' : 'pschitt';
      p.depuis = temps;
      if (!bon) {
        // Pas d'explosion : un petit nuage gris remplace le piège.
        scene.remove(p.objet);
        liberer(p.objet);
        const nuage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshBasicMaterial({ color: 0xbdbdbd, transparent: true, opacity: 0.8 }));
        nuage.position.copy(p.objet.position);
        p.objet = nuage;
        scene.add(nuage);
      }
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
      const z = -d;
      const X = x * DEMI_GALERIE;
      // Le wagonnet flotte, et penche dans les virages.
      wagonnet.position.set(X, 0.12 + Math.sin(temps * 3) * 0.05, z);
      wagonnet.rotation.z = -virage * 0.25;
      wagonnet.rotation.y = -virage * 0.12;
      // Les wagons suivent, sur la trace du wagonnet.
      passe.push({ d, x: X });
      while (passe.length > 2 && passe[0]!.d < d - 8) passe.shift();
      trainee.forEach((w, i) => {
        const cible = d - 1.9 * (i + 1);
        const p = passe.find((q) => q.d >= cible) ?? passe[0]!;
        w.position.set(p.x, 0.1, -cible);
      });
      // La caméra, derrière et au-dessus.
      const sec = secousse > 0 ? (Math.random() - 0.5) * secousse * 0.6 : 0;
      secousse = Math.max(0, secousse - dt);
      camera.position.set(X * 0.55 + sec, 4.1, z + 7.8);
      camera.lookAt(X * 0.75, 1.2, z - 16);
      camera.rotation.z += -virage * 0.06;
      soleil.position.set(X - 4, 10, z + 6);
      soleil.target.position.set(X, 0, z - 10);
      // Le sol et les bords suivent ; la texture défile.
      sol.position.z = z - 100;
      bords.position.z = z - 100;
      tex.offset.y = d / 6;
      texBords.offset.y = d / 6;
      for (const e of elements) {
        if (e.distance < d - 12) e.distance += LONGUEUR_DECOR;
        e.objet.position.z = -e.distance;
      }
      // Les objets posés : les minerais tournent, les attrapés filent vers le golem.
      for (const [id, p] of poses) {
        const age = temps - p.depuis;
        if (p.sorte === 'objet') {
          if (p.etat === 'pris') {
            const k = Math.min(1, age / 0.45);
            p.objet.position.lerp(new THREE.Vector3(X, 1.6, z), k);
            p.objet.scale.setScalar(1.35 * (1 - 0.8 * k));
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
          // En vol : il arrive de loin, en haut à droite, et descend vers au-dessus de l’épaule droite du golem,
          // à côté du wagonnet. Il tourne vite, comme un objet lancé.
          const ecart = p.distance - d;
          const loin = Math.max(0, ecart);
          p.objet.position.set(X + 2.1 + loin * 0.05, 3.1 + loin * 0.06, -p.distance);
          p.objet.rotation.x += dt * 5;
          p.objet.rotation.y += dt * 7;
          const s = p.objet.userData.aPortee ? 1.15 + Math.sin(temps * 12) * 0.06 : 1;
          p.objet.scale.setScalar(1.35 * s);
        } else if (p.etat === 'reussie') {
          const k = Math.min(1, age / 0.5);
          p.objet.scale.setScalar(1 + k * 0.25);
        }
        if (p.distance < d - 10) retirer(id);
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
