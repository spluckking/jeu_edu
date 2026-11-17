// Prototype jetable : un personnage « douillet » (grosse tête, grands yeux, ombrage en aplats)
// et ses accessoires interchangeables. Tout est dessiné en code, sans image ni modèle extérieur.

import * as THREE from 'three';

// Ombrage en trois aplats doux : l'effet « jouet peint » plutôt que le dégradé réaliste.
const degrade = (() => {
  const t = new THREE.DataTexture(new Uint8Array([150, 205, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const materiaux = new Map<string, THREE.Material>();
export function peinture(couleur: number, texture?: THREE.Texture): THREE.Material {
  const cle = `${couleur}-${texture?.uuid ?? ''}`;
  let m = materiaux.get(cle);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color: couleur, gradientMap: degrade, map: texture ?? null });
    materiaux.set(cle, m);
  }
  return m;
}

type V3 = [number, number, number];
export function piece(parent: THREE.Object3D, geo: THREE.BufferGeometry, couleur: number | THREE.Material, pos: V3, echelle: V3 = [1, 1, 1], rot: V3 = [0, 0, 0]): THREE.Mesh {
  const m = new THREE.Mesh(geo, typeof couleur === 'number' ? peinture(couleur) : couleur);
  m.position.set(...pos);
  m.scale.set(...echelle);
  m.rotation.set(...rot);
  parent.add(m);
  return m;
}

const boule = new THREE.SphereGeometry(1, 28, 20);
const tube = (r: number, l: number): THREE.BufferGeometry => new THREE.CapsuleGeometry(r, l, 6, 14);

// --- Les accessoires ---------------------------------------------------------------------

export interface Accessoire {
  id: string;
  nom: string;
  construire(): THREE.Object3D;
}

const vide = (): THREE.Object3D => new THREE.Group();

function rayures(a: string, b: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? b : a;
      g.fillRect(0, i * 8, 16, 8);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 2);
  return t;
}
const mariniere = rayures('#fdf7ee', '#4f7fd9');

const TETE_Y = 1.18;

export const CHAPEAUX: Accessoire[] = [
  { id: 'rien', nom: 'Rien', construire: vide },
  {
    id: 'paille',
    nom: 'Chapeau de paille',
    construire: () => {
      const g = new THREE.Group();
      piece(g, new THREE.CylinderGeometry(0.66, 0.7, 0.04, 32), 0xf0c96a, [0, 0, 0]);
      piece(g, new THREE.CylinderGeometry(0.33, 0.4, 0.3, 28), 0xf3d27e, [0, 0.16, 0]);
      piece(g, new THREE.CylinderGeometry(0.405, 0.405, 0.08, 28), 0xe0645c, [0, 0.06, 0]);
      piece(g, boule, 0xfff4d6, [0.3, 0.1, 0.28], [0.08, 0.08, 0.08]);
      g.position.set(0, TETE_Y + 0.33, -0.02);
      g.rotation.x = -0.12;
      return g;
    },
  },
  {
    id: 'casquette',
    nom: 'Casquette',
    construire: () => {
      const g = new THREE.Group();
      piece(g, new THREE.SphereGeometry(0.45, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), 0x5b8def, [0, 0, 0]);
      piece(g, boule, 0x4a74c9, [0, 0.0, 0.45], [0.32, 0.035, 0.24]);
      piece(g, boule, 0xffffff, [0, 0.45, 0], [0.06, 0.04, 0.06]);
      g.position.set(0, TETE_Y + 0.12, 0);
      g.rotation.x = -0.15;
      return g;
    },
  },
  {
    id: 'bonnet',
    nom: 'Bonnet',
    construire: () => {
      const g = new THREE.Group();
      piece(g, new THREE.SphereGeometry(0.46, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), 0xf28fb3, [0, 0, 0]);
      piece(g, new THREE.TorusGeometry(0.44, 0.07, 10, 32), 0xfde3ec, [0, 0.02, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      piece(g, boule, 0xfde3ec, [0, 0.5, 0], [0.13, 0.13, 0.13]);
      g.position.set(0, TETE_Y + 0.1, -0.02);
      g.rotation.x = -0.18;
      return g;
    },
  },
  {
    id: 'magicien',
    nom: 'Chapeau de magicien',
    construire: () => {
      const g = new THREE.Group();
      piece(g, new THREE.CylinderGeometry(0.62, 0.62, 0.04, 32), 0x7a5cc9, [0, 0, 0]);
      const cone = piece(g, new THREE.ConeGeometry(0.36, 0.75, 28), 0x8c6ddb, [0, 0.38, 0]);
      cone.rotation.z = 0.15;
      piece(g, boule, 0xffd84d, [0.1, 0.42, 0.27], [0.07, 0.07, 0.03]);
      g.position.set(0, TETE_Y + 0.3, -0.02);
      g.rotation.x = -0.12;
      return g;
    },
  },
  {
    id: 'couronne',
    nom: 'Couronne',
    construire: () => {
      const g = new THREE.Group();
      piece(g, new THREE.CylinderGeometry(0.3, 0.3, 0.14, 24, 1, true), 0xffcf4a, [0, 0, 0]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        piece(g, new THREE.ConeGeometry(0.06, 0.16, 8), 0xffcf4a, [Math.sin(a) * 0.3, 0.14, Math.cos(a) * 0.3]);
        piece(g, boule, i % 2 ? 0xe2504f : 0x4cc4ff, [Math.sin(a) * 0.31, 0, Math.cos(a) * 0.31], [0.035, 0.035, 0.035]);
      }
      g.position.set(0, TETE_Y + 0.42, 0);
      return g;
    },
  },
];

function paireDeLunettes(couleur: number, verre: number | null, rayon = 0.105): THREE.Object3D {
  const g = new THREE.Group();
  for (const x of [-0.15, 0.15]) {
    piece(g, new THREE.TorusGeometry(rayon, 0.018, 8, 28), couleur, [x, 0, 0]);
    if (verre !== null) piece(g, new THREE.CircleGeometry(rayon, 24), verre, [x, 0, -0.005]);
  }
  piece(g, tube(0.012, 0.06), couleur, [0, 0.02, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  g.position.set(0, TETE_Y + 0.02, 0.4);
  return g;
}

export const LUNETTES: Accessoire[] = [
  { id: 'rien', nom: 'Rien', construire: vide },
  { id: 'rondes', nom: 'Lunettes rondes', construire: () => paireDeLunettes(0x6b4a3a, null) },
  { id: 'soleil', nom: 'Lunettes de soleil', construire: () => paireDeLunettes(0x2f2a3a, 0x3a3550) },
  { id: 'rouges', nom: 'Grosses lunettes rouges', construire: () => paireDeLunettes(0xe0504f, null, 0.125) },
];

export interface Haut {
  id: string;
  nom: string;
  couleur: number;
  texture?: THREE.Texture;
  bretelles?: number;
}
export const HAUTS: Haut[] = [
  { id: 'corail', nom: 'Pull corail', couleur: 0xf28a6b },
  { id: 'menthe', nom: 'T-shirt menthe', couleur: 0x8fd9b8 },
  { id: 'mariniere', nom: 'Marinière', couleur: 0xffffff, texture: mariniere },
  { id: 'salopette', nom: 'Salopette', couleur: 0xfdf3e3, bretelles: 0x5b8def },
  { id: 'lilas', nom: 'Sweat lilas', couleur: 0xb9a3ea },
];

export const CHAUSSURES: Haut[] = [
  { id: 'brunes', nom: 'Bottines', couleur: 0xa86b45 },
  { id: 'rouges', nom: 'Baskets rouges', couleur: 0xe0504f },
  { id: 'pluie', nom: 'Bottes de pluie', couleur: 0xffcf4a },
  { id: 'bleues', nom: 'Baskets bleues', couleur: 0x5b8def },
];

export const OBJETS: Accessoire[] = [
  { id: 'rien', nom: 'Rien', construire: vide },
  {
    id: 'epuisette',
    nom: 'Épuisette',
    construire: () => {
      const g = new THREE.Group();
      piece(g, tube(0.025, 1.1), 0x8a5a3c, [0, 0.45, 0]);
      const filet = new THREE.Group();
      filet.position.set(0, 1.1, 0);
      filet.rotation.x = Math.PI / 2;
      g.add(filet);
      piece(filet, new THREE.TorusGeometry(0.2, 0.02, 8, 24), 0xd8d2c4, [0, 0.0, 0.2]);
      const maille = new THREE.MeshBasicMaterial({ color: 0xf6f1e6, wireframe: true });
      piece(filet, new THREE.ConeGeometry(0.2, 0.3, 10, 3, true), maille, [0, -0.15, 0.2], [1, 1, 1], [Math.PI, 0, 0]);
      g.rotation.z = 0.5;
      return g;
    },
  },
  {
    id: 'ballon',
    nom: 'Ballon',
    construire: () => {
      const g = new THREE.Group();
      piece(g, boule, 0xf28fb3, [0, 1.25, 0], [0.26, 0.3, 0.26]);
      piece(g, tube(0.006, 1.1), 0xffffff, [0, 0.5, 0]);
      return g;
    },
  },
  {
    id: 'sucette',
    nom: 'Sucette',
    construire: () => {
      const g = new THREE.Group();
      piece(g, tube(0.02, 0.4), 0xffffff, [0, 0.2, 0]);
      piece(g, new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), 0xf2789a, [0, 0.52, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      piece(g, new THREE.TorusGeometry(0.09, 0.025, 8, 20), 0xfff4d6, [0, 0.52, 0.03]);
      return g;
    },
  },
  {
    id: 'baguette',
    nom: 'Baguette étoile',
    construire: () => {
      const g = new THREE.Group();
      piece(g, tube(0.02, 0.45), 0x8c6ddb, [0, 0.22, 0]);
      const etoile = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = i % 2 ? 0.07 : 0.16;
        if (i === 0) etoile.moveTo(Math.sin(a) * r, Math.cos(a) * r);
        else etoile.lineTo(Math.sin(a) * r, Math.cos(a) * r);
      }
      piece(g, new THREE.ExtrudeGeometry(etoile, { depth: 0.05, bevelEnabled: false }), 0xffd84d, [0, 0.58, -0.025]);
      return g;
    },
  },
];

export interface Choix {
  chapeau: string;
  lunettes: string;
  haut: string;
  chaussures: string;
  objet: string;
  cheveux: number;
  peau: number;
}

export interface Heros {
  racine: THREE.Group;
  habiller(c: Choix): void;
  animer(t: number, marche: number): void;
}

export function creerHeros(depart: Choix): Heros {
  const racine = new THREE.Group();
  const corps = new THREE.Group();
  racine.add(corps);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x3d5a2a, transparent: true, opacity: 0.22, depthWrite: false }));
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = 0.01;
  racine.add(ombre);

  let couches = new THREE.Group();
  corps.add(couches);
  const tete = new THREE.Group();
  tete.position.y = 0;
  corps.add(tete);
  let brasD: THREE.Group | null = null;
  let brasG: THREE.Group | null = null;
  let jambes: THREE.Group[] = [];

  function habiller(c: Choix): void {
    corps.remove(couches);
    couches = new THREE.Group();
    corps.add(couches);
    const haut = HAUTS.find((h) => h.id === c.haut) ?? HAUTS[0]!;
    const pieds = CHAUSSURES.find((h) => h.id === c.chaussures) ?? CHAUSSURES[0]!;
    const peau = c.peau;

    // Jambes courtes et grosses chaussures arrondies.
    jambes = [-1, 1].map((cote) => {
      const j = new THREE.Group();
      j.position.set(cote * 0.11, 0.4, 0);
      piece(j, tube(0.075, 0.16), haut.bretelles ? 0x5b8def : 0xfdf3e3, [0, -0.17, 0]);
      piece(j, boule, pieds.couleur, [0, -0.33, 0.04], [0.12, 0.09, 0.17]);
      piece(j, new THREE.CylinderGeometry(0.12, 0.12, 0.03, 18), 0xfdf7ee, [0, -0.4, 0.04], [1, 1, 1.35]);
      couches.add(j);
      return j;
    });

    // Corps : un petit tronc arrondi, et un short ou le bas de la salopette.
    const tissu = haut.texture ? peinture(haut.couleur, haut.texture) : peinture(haut.couleur);
    piece(couches, tube(0.2, 0.18), tissu, [0, 0.62, 0], [1, 1, 0.82]);
    piece(couches, new THREE.CylinderGeometry(0.2, 0.22, 0.14, 20), haut.bretelles ?? 0xc79a6b, [0, 0.43, 0], [1, 1, 0.85]);
    if (haut.bretelles) {
      piece(couches, boule, haut.bretelles, [0, 0.6, 0.11], [0.15, 0.13, 0.08]);
      for (const x of [-0.11, 0.11]) piece(couches, tube(0.025, 0.2), haut.bretelles, [x, 0.72, 0.13], [1, 1, 1], [-0.25, 0, 0]);
    }
    piece(couches, new THREE.TorusGeometry(0.13, 0.04, 8, 20), haut.bretelles ? 0xfdf3e3 : 0xfdf7ee, [0, 0.82, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);

    // Bras : ils partent des épaules et se balancent.
    const bras = (cote: number): THREE.Group => {
      const b = new THREE.Group();
      b.position.set(cote * 0.24, 0.77, 0);
      piece(b, tube(0.065, 0.2), tissu, [cote * 0.03, -0.14, 0], [1, 1, 1], [0, 0, cote * 0.18]);
      piece(b, boule, peau, [cote * 0.07, -0.33, 0.02], [0.075, 0.075, 0.075]);
      couches.add(b);
      return b;
    };
    brasG = bras(-1);
    brasD = bras(1);
    const objet = OBJETS.find((o) => o.id === c.objet)?.construire();
    if (objet && brasD) {
      objet.position.set(0.08, -0.36, 0.06);
      objet.scale.setScalar(0.8);
      brasD.add(objet);
    }

    // La tête : grosse, ronde, avec de grands yeux brillants.
    tete.clear();
    const T = TETE_Y;
    piece(tete, boule, peau, [0, T, 0], [0.42, 0.39, 0.38]);
    for (const x of [-1, 1]) piece(tete, boule, peau, [x * 0.41, T - 0.02, -0.02], [0.08, 0.1, 0.06]);
    for (const x of [-0.15, 0.15]) {
      piece(tete, boule, 0x3b2b30, [x, T + 0.0, 0.34], [0.075, 0.1, 0.05]);
      piece(tete, boule, 0xffffff, [x + 0.025, T + 0.04, 0.38], [0.025, 0.03, 0.02]);
      piece(tete, boule, 0xffa9a0, [x * 1.45, T - 0.11, 0.3], [0.07, 0.04, 0.03]);
    }
    piece(tete, boule, 0xc2645e, [0, T - 0.13, 0.36], [0.04, 0.02, 0.02]);
    // Cheveux : une calotte inclinée vers l'arrière, une frange en trois mèches.
    const cheveux = new THREE.SphereGeometry(0.45, 28, 16, 0, Math.PI * 2, 0, 1.85);
    piece(tete, cheveux, c.cheveux, [0, T + 0.02, -0.03], [1, 0.95, 0.95], [-0.5, 0, 0]);
    for (const [x, r] of [[-0.18, 0.4], [0, 0], [0.18, -0.4]] as const) piece(tete, boule, c.cheveux, [x, T + 0.25, 0.27], [0.15, 0.1, 0.1], [0.3, 0, r]);
    const chapeau = CHAPEAUX.find((h) => h.id === c.chapeau)?.construire();
    if (chapeau) tete.add(chapeau);
    const lunettes = LUNETTES.find((h) => h.id === c.lunettes)?.construire();
    if (lunettes) tete.add(lunettes);
  }

  habiller(depart);
  return {
    racine,
    habiller,
    animer(t, marche) {
      const balance = Math.sin(t * 9) * 0.6 * marche;
      corps.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * marche + Math.sin(t * 2) * 0.008;
      if (brasG) brasG.rotation.x = balance;
      if (brasD) brasD.rotation.x = -balance;
      jambes.forEach((j, i) => (j.rotation.x = (i ? 1 : -1) * balance));
      tete.rotation.z = Math.sin(t * 1.3) * 0.03;
    },
  };
}
