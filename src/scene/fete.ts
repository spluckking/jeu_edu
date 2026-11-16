// La place de la fête foraine : décor, stands, chantier, personnage et visiteurs.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AMPOULES, Atelier, COULEURS, type Peinture, type Vec3 } from './atelier.ts';
import { creerPersonne, type Accessoires, type Allure, type Personne } from './personne.ts';

export type IdStand = 'chamboule' | 'confiserie' | 'chantier' | 'horloge' | 'peche';
/** Les stands de détente : jeu libre seulement, sans forain à nommer. */
export type IdDetente = 'autos' | 'trampoline' | 'glaces';
export type IdLieu = IdStand | IdDetente;

export interface Stand {
  id: IdLieu;
  /** Boîte invisible que l'on touche pour aller au stand. */
  zone: THREE.Mesh;
  /** Où le personnage se place devant le stand, et vers où il regarde. */
  approche: THREE.Vector3;
  regard: number;
}

export interface PoseCamera {
  position: THREE.Vector3;
  cible: THREE.Vector3;
}

export interface Fete {
  racine: THREE.Group;
  stands: Stand[];
  /** place : l'entrée de la fête ; fond : l'allée de derrière. */
  vues: Record<'place' | 'fond' | IdStand, PoseCamera>;
  /** Bonne réponse à la pêche : un canard sort de l'eau. */
  pecher(): void;
  /** La grande roue montre n pièces construites sur « sur ». */
  construireRoue(n: number, sur: number): void;
  /** Le personnage de l'enfant change de tenue (0 à 3) ou de maillot. */
  habiller(accessoires: Accessoires): void;
  /** Le personnage de l'enfant (pour le piloter au joystick). */
  heros(): THREE.Group;
  /** Pilotage libre : allure de marche de 0 (arrêté) à 1, quand aucun trajet n'est en cours. */
  marcheLibre(allure: number): void;
  /** Les plans de la cinématique : vue d'ensemble, chaque forain, vue de fin. */
  vuesCinema: Record<'survol' | 'fin' | IdStand, PoseCamera>;
  /** Le forain de ce stand salue un instant. */
  saluerForain(id: IdStand): void;
  /** Allume ou éteint le repère au-dessus du chamboule-tout. */
  allumer(id: IdStand, allume: boolean): void;
  /** Décor calme pendant l'exercice : visiteurs, ballons et confettis s'effacent. */
  calme(actif: boolean): void;
  /** Le personnage marche jusqu'au stand. La promesse se résout à l'arrivée. */
  allerAuStand(stand: Stand): Promise<void>;
  /** Bonne réponse : la balle part et la pyramide tombe. */
  lancer(): void;
  /** Bonne réponse à la confiserie : une sucette géante sort du comptoir. */
  sucette(): void;
  /** Le personnage salue un instant. */
  saluer(): void;
  mettreAJour(temps: number, delta: number): void;
  liberer(): void;
}

const VITESSE_MARCHE = 3.2;
/** Au-delà (vers l'arrière), on est dans l'allée du fond de la fête. */
const LIMITE_FOND = -11;

export function construireFete(depart?: Accessoires): Fete {
  const atelier = new Atelier();
  const racine = new THREE.Group();
  const animations: Array<(temps: number, delta: number) => void> = [];
  const decorVivant: THREE.Object3D[] = [];
  let graine = 23;
  const hasard = (): number => {
    graine = (graine * 16807) % 2147483647;
    return graine / 2147483647;
  };
  const f = atelier.forme.bind(atelier);

  // --- Guirlandes et fanions -------------------------------------------------
  let ampoules = 0;
  const ampoule = (parent: THREE.Object3D, position: Vec3): void => {
    const couleur = AMPOULES[ampoules++ % AMPOULES.length] ?? 0xffffff;
    f(parent, [0.26, 0.26, 0.26], position, couleur, { forme: 'boule', lumineux: true });
  };

  const chainette = (de: THREE.Vector3, a: THREE.Vector3, nombre: number, creux: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= nombre; i++) {
      const t = i / nombre;
      const point = de.clone().lerp(a, t);
      point.y -= creux * 4 * t * (1 - t);
      points.push(point);
    }
    return points;
  };

  const guirlande = (de: THREE.Vector3, a: THREE.Vector3, nombre: number, creux: number): void => {
    const points = chainette(de, a, nombre, creux);
    points.slice(1, -1).forEach((p) => ampoule(racine, [p.x, p.y - 0.14, p.z]));
    atelier.ligne(racine, points);
  };

  const fanions = (de: THREE.Vector3, a: THREE.Vector3, nombre: number, creux: number): void => {
    const points = chainette(de, a, nombre, creux);
    const cap = -Math.atan2(a.z - de.z, a.x - de.x);
    const couleurs: Peinture[] = ['bonbon1', 'enseigne', 'bonbon2', 'bonbon3', 'toileA'];
    points.slice(1, -1).forEach((p, i) => {
      const fanion = atelier.mobile(racine, [p.x, p.y - 0.24, p.z]);
      fanion.rotation.y = cap;
      f(fanion, [0.36, 0.36, 0.03], [0, 0, 0], couleurs[i % couleurs.length] ?? 'enseigne', { rz: Math.PI / 4 });
      animations.push((temps) => {
        fanion.rotation.x = Math.sin(temps * 2.4 + i * 0.9) * 0.28;
      });
    });
    atelier.ligne(racine, points);
  };

  // --- Sol et allées -------------------------------------------------------
  atelier.sol(racine, 140, 140, 0, 0, 0, 'herbe');
  atelier.sol(racine, 3.4, 14, 0, 0.03, 5, 'dalles');
  atelier.sol(racine, 34, 3.6, 0, 0.035, -1, 'dalles');
  // L'allée vers le fond de la fête, à droite du chamboule-tout, puis celle du fond.
  for (const x of [-5.5, 5.5]) atelier.sol(racine, 3, 22, x, 0.033, -12, 'dalles');
  atelier.sol(racine, 30, 3.4, 0, 0.034, -22.5, 'dalles');

  // --- Stand générique -----------------------------------------------------
  const stands: Stand[] = [];
  const zoneMateriau = atelier.materiau(new THREE.MeshBasicMaterial());

  function stand(id: IdLieu, x: number, z: number, ry: number, garnir: (g: THREE.Group) => void): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    racine.add(g);

    f(g, [4.2, 1, 1], [0, 0.5, 1.3], 'comptoir');
    f(g, [4.5, 0.16, 1.3], [0, 1.08, 1.3], 'bois');
    for (const sx of [-2, 2]) for (const sz of [-1.3, 1.3]) f(g, [0.28, 3.3, 0.28], [sx, 1.65, sz], 'poteau', { forme: 'tube' });
    f(g, [4.2, 2.7, 0.2], [0, 1.55, -1.4], 'bois');
    const toit = new THREE.Group();
    toit.position.set(0, 3.45, 0.1);
    toit.rotation.x = 0.16;
    g.add(toit);
    for (let i = 0; i < 9; i++) {
      const p: Peinture = i % 2 === 0 ? 'toileA' : 'toileB';
      f(toit, [0.5, 0.14, 3.6], [-2 + i * 0.5, 0, 0], p);
      f(toit, [0.5, 0.42, 0.12], [-2 + i * 0.5, -0.24, 1.8], p);
    }
    for (const sx of [-1, 1]) f(g, [0.16, 0.8, 0.16], [sx, 3.7, 0.6], 'poteau', { forme: 'tube' });
    f(g, [2.8, 0.9, 0.22], [0, 4.45, 0.6], 'enseigne');
    for (let i = 0; i < 7; i++) {
      ampoule(g, [-1.35 + i * 0.45, 5.03, 0.6]);
      ampoule(g, [-1.35 + i * 0.45, 3.87, 0.74]);
    }
    garnir(g);
    ajouterZone(id, g, [5, 6, 4.5], [0, 3, 0.3], [-0.9, 0, 3.4]);
    return g;
  }

  /** approcheLocale : où se place le personnage, dans le repère du stand. */
  function ajouterZone(id: IdLieu, g: THREE.Group, taille: Vec3, centre: Vec3, approcheLocale: Vec3): void {
    const zone = new THREE.Mesh(atelier.suivre(new THREE.BoxGeometry(...taille)), zoneMateriau);
    zone.position.set(...centre);
    g.add(zone);
    zone.userData.garder = true;
    zone.visible = false;
    g.updateMatrixWorld(true);
    const approche = new THREE.Vector3(...approcheLocale).applyMatrix4(g.matrixWorld);
    stands.push({ id, zone, approche, regard: g.rotation.y + Math.PI });
  }

  // --- Forains ---------------------------------------------------------------
  const finsDeSalut = new Map<IdStand, number>();
  const DUREE_SALUT = 2.4;
  /** Un forain à son stand. periodique : il salue de lui-même, régulièrement. */
  function forain(id: IdStand, g: THREE.Group, allure: Allure, position: Vec3, ry: number, periodique = false): void {
    const p = creerPersonne(atelier, g, allure);
    p.racine.position.set(...position);
    p.racine.rotation.y = ry;
    p.racine.scale.setScalar(1.12);
    finsDeSalut.set(id, -99);
    animations.push((temps) => {
      const auto = periodique ? Math.min(1, Math.max(0, Math.sin(temps * 0.7) * 2)) : 0;
      const reste = (finsDeSalut.get(id) ?? -99) - temps;
      const demande = reste > 0 ? Math.min(1, reste / 0.3, (DUREE_SALUT - reste) / 0.3) : 0;
      p.animer(temps, 0, Math.max(auto, demande));
    });
  }

  /** Une vue de caméra donnée dans le repère d'un groupe (un stand). */
  const vuesForain: Partial<Record<IdStand, PoseCamera>> = {};
  function vueLocale(id: IdStand, g: THREE.Group, position: Vec3, cible: Vec3): void {
    g.updateMatrixWorld(true);
    vuesForain[id] = {
      position: new THREE.Vector3(...position).applyMatrix4(g.matrixWorld),
      cible: new THREE.Vector3(...cible).applyMatrix4(g.matrixWorld),
    };
  }

  // --- Peluche : un lot à gagner ------------------------------------------
  function peluche(parent: THREE.Object3D, position: Vec3, peinture: Peinture, taille = 1, suspendue = 0): void {
    const pivot = suspendue > 0 ? atelier.mobile(parent, position) : new THREE.Group();
    if (suspendue === 0) {
      pivot.position.set(...position);
      parent.add(pivot);
    }
    const jouet = new THREE.Group();
    jouet.position.y = -suspendue;
    jouet.scale.setScalar(taille);
    pivot.add(jouet);
    f(jouet, [0.36, 0.4, 0.3], [0, 0.2, 0], peinture, { forme: 'boule' });
    f(jouet, [0.3, 0.28, 0.28], [0, 0.5, 0], peinture, { forme: 'boule' });
    for (const c of [-1, 1]) {
      f(jouet, [0.12, 0.12, 0.08], [c * 0.12, 0.66, 0], peinture, { forme: 'boule' });
      f(jouet, [0.12, 0.2, 0.12], [c * 0.2, 0.26, 0.04], peinture, { forme: 'boule' });
      f(jouet, [0.14, 0.14, 0.2], [c * 0.11, 0.05, 0.1], peinture, { forme: 'boule' });
      f(jouet, [0.04, 0.05, 0.04], [c * 0.07, 0.54, 0.13], 'sombre', { forme: 'boule' });
    }
    f(jouet, [0.14, 0.1, 0.08], [0, 0.46, 0.13], 'blanc', { forme: 'boule' });
    if (suspendue > 0) {
      atelier.ligne(pivot, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -suspendue + 0.7 * taille, 0)]);
      animations.push((temps) => {
        pivot.rotation.z = Math.sin(temps * 1.4 + position[0] * 2) * 0.14;
      });
    }
  }

  // --- Chamboule-tout --------------------------------------------------------
  const boites: Array<{ objet: THREE.Group; depart: THREE.Vector3; vitesse: THREE.Vector3; rotation: THREE.Vector3 }> = [];
  let balle: THREE.Group | null = null;
  let eclats: { points: THREE.Points; vitesses: Float32Array; age: number } | null = null;
  let standChamboule: THREE.Group | null = null;
  const reperes = new Map<IdStand, THREE.Group>();
  const vuesStand: Partial<Record<IdStand, PoseCamera>> = {};

  /** Repère du stand allumé : une grosse étoile qui tourne et rebondit au-dessus de l'enseigne. */
  function repere(id: IdStand, g: THREE.Group, hauteur = 6.3): void {
    const r = atelier.mobile(g, [0, hauteur, 0.6]);
    f(r, [0.9, 0.9, 0.2], [0, 0, 0], 'or', { lumineux: true });
    f(r, [0.9, 0.9, 0.2], [0, 0, 0.01], 'or', { rz: Math.PI / 4, lumineux: true });
    f(r, [0.5, 0.5, 0.3], [0, 0, 0], 0xfff6c8, { forme: 'boule', lumineux: true });
    r.visible = false;
    reperes.set(id, r);
    const decalage = reperes.size * 0.7;
    animations.push((temps) => {
      r.rotation.y = temps * 1.6 + decalage;
      r.position.y = hauteur + Math.abs(Math.sin(temps * 2.4 + decalage)) * 0.35;
    });
  }

  // --- Sucette qui sort du comptoir de la confiserie (bonne réponse) -------------------
  let debutSucette = -99;

  function garnirChamboule(g: THREE.Group): void {
    standChamboule = g;
    for (let i = 0; i < 5; i++) {
      f(g, [0.16, 1.7, 0.03], [0, 2.75, -1.27], i % 2 === 0 ? 'toileA' : 'enseigne', { rz: (i * Math.PI) / 5 });
    }
    f(g, [0.5, 0.5, 0.05], [0, 2.75, -1.25], 'blanc', { forme: 'disque' });

    f(g, [2.6, 0.12, 0.7], [0, 1.75, -0.95], 'bois');
    for (const sx of [-1.1, 1.1]) f(g, [0.16, 1.7, 0.16], [sx, 0.85, -0.95], 'poteau', { forme: 'tube' });
    [3, 2, 1].forEach((nombre, rangee) => {
      for (let i = 0; i < nombre; i++) {
        const depart = new THREE.Vector3((i - (nombre - 1) / 2) * 0.44, 2.04 + rangee * 0.47, -0.95);
        const boite = atelier.mobile(g, [depart.x, depart.y, depart.z]);
        f(boite, [0.38, 0.46, 0.38], [0, 0, 0], 'boite', { forme: 'tube' });
        f(boite, [0.4, 0.18, 0.4], [0, 0, 0], (i + rangee) % 2 === 0 ? 'toileA' : 'bonbon2', { forme: 'tube' });
        boites.push({ objet: boite, depart, vitesse: new THREE.Vector3(), rotation: new THREE.Vector3() });
      }
    });

    const lots: Peinture[] = [0xc98a5a, 'bonbon1', 'bonbon2', 0xf2e2c4];
    for (const c of [-1, 1]) {
      f(g, [0.9, 0.08, 0.4], [c * 1.55, 2.3, -1.1], 'bois');
      peluche(g, [c * 1.75, 2.34, -1.1], lots[c < 0 ? 0 : 1] ?? 'bonbon1', 0.75);
      peluche(g, [c * 1.35, 2.34, -1.1], lots[c < 0 ? 2 : 3] ?? 'bonbon2', 0.75);
    }
    f(g, [0.07, 3.9, 0.07], [0, 3.02, 1.3], 'poteau', { forme: 'tube', rz: Math.PI / 2 });
    [-1.75, 1.15, 1.7].forEach((x, i) => peluche(g, [x, 3.0, 1.3], lots[(i + 1) % lots.length] ?? 'bonbon1', 0.8, 0.85));

    for (let i = 0; i < 8; i++) f(g, [0.525, 0.98, 0.05], [-1.84 + i * 0.525, 0.5, 1.83], i % 2 === 0 ? 'toileA' : 'toileB');
    f(g, [4.6, 0.05, 1.2], [0, 0.07, 2.7], 'comptoir');

    f(g, [0.56, 0.2, 0.56], [-1.3, 1.26, 1.3], 0x9a6a3a, { forme: 'tube' });
    const balles: Array<[number, number, Peinture]> = [
      [-0.13, -0.08, 'bonbon1'],
      [0.12, -0.1, 'bonbon3'],
      [0, 0.12, 'enseigne'],
      [-0.02, -0.02, 'bonbon2'],
    ];
    balles.forEach(([dx, dz, p], i) => f(g, [0.24, 0.24, 0.24], [-1.3 + dx, i === 3 ? 1.56 : 1.4, 1.3 + dz], p, { forme: 'boule' }));
    f(g, [0.32, 0.32, 0.14], [-0.35, 1.32, 1.4], 'rouge', { forme: 'disque' });
    f(g, [0.14, 0.14, 0.16], [-0.35, 1.32, 1.4], 'blanc', { forme: 'disque' });
    f(g, [0.34, 0.05, 0.34], [0.35, 1.19, 1.45], 'sombre', { forme: 'tube' });
    f(g, [0.28, 0.3, 0.28], [0.35, 1.22, 1.45], 'or', { forme: 'boule' });
    peluche(g, [1.5, 1.16, 1.3], 0xc98a5a, 1.5);

    f(g, [0.74, 0.74, 0.05], [0, 4.45, 0.73], 'rouge', { forme: 'disque' });
    f(g, [0.5, 0.5, 0.05], [0, 4.45, 0.76], 'blanc', { forme: 'disque' });
    f(g, [0.26, 0.26, 0.05], [0, 4.45, 0.79], 'rouge', { forme: 'disque' });
    for (const c of [-1, 1]) {
      const etoile = atelier.mobile(g, [c * 0.98, 4.45, 0.74]);
      f(etoile, [0.3, 0.3, 0.05], [0, 0, 0], 'blanc');
      f(etoile, [0.3, 0.3, 0.05], [0, 0, 0.01], 'blanc', { rz: Math.PI / 4 });
      animations.push((temps) => {
        etoile.rotation.z = temps * 0.8 * c;
      });
    }
    [-2, 2].forEach((x, i) => {
      f(g, [0.07, 1.2, 0.07], [x, 3.9, 1.3], 'poteau', { forme: 'tube' });
      const drapeau = atelier.mobile(g, [x, 4.3, 1.3]);
      f(drapeau, [0.6, 0.34, 0.03], [0.32, 0, 0], i === 0 ? 'bonbon2' : 'bonbon1');
      animations.push((temps) => {
        drapeau.rotation.y = Math.sin(temps * 3 + i * 2) * 0.5;
      });
    });
    f(g, [0.62, 0.8, 0.62], [-2.85, 0.4, 1.5], 'bois', { forme: 'tube' });
    for (const y of [0.2, 0.6]) f(g, [0.66, 0.07, 0.66], [-2.85, y, 1.5], 'sombre', { forme: 'tube' });
    f(g, [0.7, 0.6, 0.7], [-2.9, 0.3, 0.5], 'poteau');
    f(g, [0.45, 0.4, 0.45], [-2.9, 0.8, 0.5], 'bois', { ry: 0.4 });

    const ballons: Array<[Vec3, Peinture]> = [
      [[2.3, 4.7, 1.3], 'bonbon1'],
      [[2.75, 5.3, 1.05], 'bonbon2'],
      [[1.95, 5.6, 1.5], 'enseigne'],
    ];
    ballons.forEach(([position, p], i) => {
      const ballon = atelier.mobile(g, position);
      f(ballon, [0.55, 0.65, 0.55], [0, 0, 0], p, { forme: 'boule' });
      atelier.ligne(g, [new THREE.Vector3(2.1, 1.2, 1.3), new THREE.Vector3(...position)]);
      animations.push((temps) => {
        ballon.position.y = position[1] + Math.sin(temps * 1.3 + i * 2) * 0.07;
      });
    });

    // Sur le côté, pour ne jamais cacher la pyramide de boîtes.
    forain(
      'chamboule',
      g,
      { maillot: 0xf2f2f2, pantalon: 'sombre', cheveux: 0x3a2a1c, tenue: 1, objets: false, moustache: true },
      [-1.65, 0, -0.45],
      0.35,
      true,
    );

    vueLocale('chamboule', g, [-0.4, 2.9, 6.4], [-0.8, 2.4, 0]);

    // La balle lancée, cachée au repos.
    balle = atelier.mobile(g);
    f(balle, [0.3, 0.3, 0.3], [0, 0, 0], 'enseigne', { forme: 'boule' });
    balle.visible = false;

    repere('chamboule', g);

    // Éclats de couleur quand la pyramide tombe.
    const nombre = 60;
    const geometrie = atelier.suivre(new THREE.BufferGeometry());
    geometrie.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nombre * 3), 3));
    const couleurs = new Float32Array(nombre * 3);
    const palette = [COULEURS.bonbon1, COULEURS.bonbon2, COULEURS.bonbon3, COULEURS.enseigne];
    for (let i = 0; i < nombre; i++) {
      const c = new THREE.Color(palette[i % palette.length]);
      couleurs.set([c.r, c.g, c.b], i * 3);
    }
    geometrie.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
    const points = new THREE.Points(
      geometrie,
      atelier.materiau(new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, vertexColors: true })),
    );
    points.visible = false;
    points.userData.garder = true;
    points.frustumCulled = false;
    g.add(points);
    eclats = { points, vitesses: new Float32Array(nombre * 3), age: 99 };
  }

  // --- Confiserie (sa garniture viendra avec l'étape des mots) ------------------
  function garnirConfiserie(g: THREE.Group): void {
    const bonbons: Peinture[] = ['bonbon1', 'bonbon2', 'bonbon3'];
    bonbons.forEach((p, i) => {
      const x = -1.4 + i * 0.7;
      f(g, [0.5, 0.62, 0.5], [x, 1.47, 1.3], p, { forme: 'tube' });
      f(g, [0.56, 0.1, 0.56], [x, 1.83, 1.3], 'bois', { forme: 'tube' });
    });
    [-1.35, -0.45, 0.45, 1.35].forEach((x, i) => {
      f(g, [0.08, 0.9, 0.08], [x, 1.9, -1.2], 'toileB', { forme: 'tube' });
      f(g, [0.6, 0.6, 0.14], [x, 2.55, -1.2], bonbons[i % bonbons.length] ?? 'bonbon1', { forme: 'disque' });
    });
    f(g, [0.08, 0.8, 0.08], [1.45, 1.55, 1.3], 'toileB', { forme: 'tube' });
    f(g, [0.62, 0.46, 0.62], [1.45, 2.05, 1.3], 'bonbon1', { forme: 'boule' });
    f(g, [0.46, 0.36, 0.46], [1.45, 2.44, 1.3], 'bonbon1', { forme: 'boule' });
    forain('confiserie', g, { maillot: 0xff8fb8, pantalon: 0x7a5c9a, cheveux: 0x8a4a2a, tenue: 3, objets: false }, [0.6, 0, -0.3], -0.15);
    vueLocale('confiserie', g, [0.6, 2.3, 5.8], [0.5, 2.3, 0]);
    repere('confiserie', g);
    g.updateMatrixWorld(true);
    vuesStand.confiserie = {
      position: new THREE.Vector3(2.9, 3.9, 10.5).applyMatrix4(g.matrixWorld),
      cible: new THREE.Vector3(2.5, 2.1, 0.2).applyMatrix4(g.matrixWorld),
    };

    // La sucette géante, cachée au repos.
    const s = atelier.mobile(g, [-0.5, 1.2, 1.5]);
    f(s, [0.08, 1.1, 0.08], [0, 0.55, 0], 'blanc', { forme: 'tube' });
    f(s, [0.9, 0.9, 0.16], [0, 1.4, 0], 'bonbon1', { forme: 'disque' });
    f(s, [0.6, 0.6, 0.18], [0, 1.4, 0], 'blanc', { forme: 'disque' });
    f(s, [0.32, 0.32, 0.2], [0, 1.4, 0], 'bonbon2', { forme: 'disque' });
    s.visible = false;
    animations.push((temps) => {
      const t = temps - debutSucette;
      s.visible = t >= 0 && t < 1.8;
      if (!s.visible) return;
      const monte = Math.min(1, t / 0.45);
      const rebond = 1 + Math.sin(Math.min(1, t / 0.6) * Math.PI) * 0.25;
      const fin = t > 1.5 ? Math.max(0.01, (1.8 - t) / 0.3) : 1;
      s.scale.setScalar(monte * rebond * fin * 1.6);
      s.position.y = 1.2 + monte * 0.6;
      s.rotation.y = t * 5;
    });
  }

  // --- L'horloge : lire l'heure et se repérer dans la journée --------------------------
  /** Un cadran à aiguilles ; si vraie, il montre l'heure réelle de la tablette. */
  function cadran(parent: THREE.Object3D, position: Vec3, rayon: number, vraie: boolean): void {
    f(parent, [rayon * 2.2, rayon * 2.2, 0.16], position, 'enseigne', { forme: 'disque' });
    f(parent, [rayon * 2, rayon * 2, 0.2], position, 'blanc', { forme: 'disque' });
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const long = i % 3 === 0 ? 0.22 : 0.12;
      f(parent, [0.05 * rayon * 2, long * rayon, 0.05], [position[0] + Math.sin(a) * rayon * 0.8, position[1] + Math.cos(a) * rayon * 0.8, position[2] + 0.11], 'sombre', { rz: -a });
    }
    const petite = atelier.mobile(parent, [position[0], position[1], position[2] + 0.14]);
    f(petite, [0.09 * rayon * 1.6, rayon * 0.5, 0.04], [0, rayon * 0.22, 0], 'sombre');
    const grande = atelier.mobile(parent, [position[0], position[1], position[2] + 0.17]);
    f(grande, [0.06 * rayon * 1.6, rayon * 0.78, 0.04], [0, rayon * 0.36, 0], 'rouge');
    f(parent, [rayon * 0.16, rayon * 0.16, 0.08], [position[0], position[1], position[2] + 0.2], 'or', { forme: 'disque' });
    const decalage = vraie ? 0 : 2.6;
    animations.push(() => {
      const d = new Date();
      const minutes = d.getMinutes() + d.getSeconds() / 60;
      const heures = (d.getHours() % 12) + minutes / 60 + decalage;
      grande.rotation.z = -(minutes / 60) * Math.PI * 2;
      petite.rotation.z = -(heures / 12) * Math.PI * 2;
    });
  }

  function garnirHorloge(g: THREE.Group): void {
    // La grande horloge de la fête, au-dessus de l'enseigne : elle donne l'heure vraie.
    for (const sx of [-0.5, 0.5]) f(g, [0.14, 1.2, 0.14], [sx, 5.1, 0.6], 'poteau', { forme: 'tube' });
    cadran(g, [0, 5.75, 0.62], 0.75, true);
    // Au fond, des réveils sur une étagère, et un sablier sur le comptoir.
    f(g, [3.2, 0.12, 0.5], [0, 2.3, -1.15], 'bois');
    [-1.1, 0, 1.1].forEach((x, i) => {
      f(g, [0.62, 0.62, 0.3], [x, 2.72, -1.1], (['bonbon1', 'bonbon2', 'bonbon3'] as const)[i] ?? 'bonbon1', { forme: 'tube', rx: Math.PI / 2 });
      f(g, [0.5, 0.5, 0.05], [x, 2.72, -0.94], 'blanc', { forme: 'disque' });
      for (const c of [-1, 1]) f(g, [0.16, 0.16, 0.16], [x + c * 0.2, 3.08, -1.1], 'or', { forme: 'boule' });
    });
    f(g, [0.34, 0.06, 0.34], [1.3, 1.19, 1.3], 'bois', { forme: 'tube' });
    f(g, [0.26, 0.3, 0.26], [1.3, 1.38, 1.3], 0xffe8a0, { forme: 'boule' });
    f(g, [0.26, 0.3, 0.26], [1.3, 1.66, 1.3], 0xdff4ff, { forme: 'boule' });
    f(g, [0.34, 0.06, 0.34], [1.3, 1.85, 1.3], 'bois', { forme: 'tube' });
    forain('horloge', g, { maillot: 0x6fc7c0, pantalon: 0x5b4a7a, cheveux: 0xb9b2c8, tenue: 4, objets: false }, [-0.4, 0, -0.35], 0.15);
    vueLocale('horloge', g, [-0.2, 2.6, 6.2], [-0.3, 2.4, 0]);
    repere('horloge', g, 7.3);
    g.updateMatrixWorld(true);
    vuesStand.horloge = {
      position: new THREE.Vector3(2.9, 3.9, 10.5).applyMatrix4(g.matrixWorld),
      cible: new THREE.Vector3(2.5, 2.4, 0.2).applyMatrix4(g.matrixWorld),
    };
  }

  // --- Pêche aux canards : un ruisseau sur le comptoir, des canards qui tournent ----------
  let debutPeche = -99;
  function garnirPeche(g: THREE.Group): void {
    f(g, [3.9, 0.22, 0.9], [0, 1.2, 1.3], 0x5cc4f0);
    f(g, [4.1, 0.1, 1.05], [0, 1.08, 1.3], 'bois');
    const canards: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const c = atelier.mobile(g, [0, 1.34, 1.3]);
      f(c, [0.36, 0.26, 0.28], [0, 0.06, 0], 'enseigne', { forme: 'boule' });
      f(c, [0.22, 0.22, 0.22], [0.13, 0.24, 0], 'enseigne', { forme: 'boule' });
      f(c, [0.12, 0.05, 0.08], [0.27, 0.22, 0], 0xff8a3a, { forme: 'boule' });
      for (const cote of [-1, 1]) f(c, [0.04, 0.05, 0.03], [0.18, 0.28, cote * 0.09], 'sombre', { forme: 'boule' });
      canards.push(c);
    }
    // Les canards glissent le long du ruisseau ; le premier saute quand on pêche juste.
    animations.push((temps) => {
      canards.forEach((c, i) => {
        const x = (((temps * 0.35 + i / canards.length) % 1) - 0.5) * 3.5;
        c.position.x = x;
        c.position.y = 1.34 + Math.sin(temps * 3 + i) * 0.02;
        c.rotation.set(0, 0, 0);
      });
      const t = temps - debutPeche;
      const premier = canards[0];
      if (premier && t >= 0 && t < 1.2) {
        const saut = Math.sin((t / 1.2) * Math.PI);
        premier.position.y = 1.34 + saut * 1.3;
        premier.rotation.y = t * 9;
      }
    });
    // Les cannes à pêche, sur le côté, et les lots au fond.
    for (const x of [1.6, 1.85]) {
      f(g, [0.05, 2.2, 0.05], [x, 2.0, 0.6], 'bois', { forme: 'tube', rz: -0.25 });
    }
    for (const [x, p] of [[-1.2, 'bonbon1'], [0, 'bonbon2'], [1.2, 'enseigne']] as const) {
      peluche(g, [x, 2.34, -1.1], p, 0.7);
      f(g, [0.9, 0.08, 0.4], [x, 2.3, -1.1], 'bois');
    }
    forain('peche', g, { maillot: 0xffd447, pantalon: 0x3f6fa0, cheveux: 0x6b3a1c, tenue: 0, objets: false }, [-1.55, 0, -0.4], 0.3);
    vueLocale('peche', g, [-0.6, 2.8, 6.4], [-0.8, 2.3, 0]);
    repere('peche', g);
    g.updateMatrixWorld(true);
    vuesStand.peche = {
      position: new THREE.Vector3(2.0, 3.4, 7).applyMatrix4(g.matrixWorld),
      cible: new THREE.Vector3(1.6, 2.1, 0.2).applyMatrix4(g.matrixWorld),
    };
  }

  // --- Stands de détente ----------------------------------------------------------------
  function garnirAutos(g: THREE.Group): void {
    f(g, [3.8, 0.08, 2.4], [0, 1.1, 0], 0x4a4f6a);
    const couleurs: Peinture[] = ['bonbon1', 'bonbon2', 'enseigne', 'bonbon3'];
    couleurs.forEach((p, i) => {
      const auto = atelier.mobile(g, [-1.3 + i * 0.85, 1.32, 0]);
      f(auto, [0.6, 0.26, 0.42], [0, 0, 0], p);
      f(auto, [0.68, 0.12, 0.5], [0, -0.12, 0], 'sombre', { forme: 'tube' });
      f(auto, [0.06, 0.6, 0.06], [-0.18, 0.35, 0], 'poteau', { forme: 'tube' });
      animations.push((temps) => {
        auto.position.z = Math.sin(temps * 0.9 + i * 1.7) * 0.8;
        auto.position.x = -1.3 + i * 0.85 + Math.cos(temps * 0.7 + i) * 0.2;
        auto.rotation.y = Math.sin(temps * 0.9 + i * 1.7) * 0.6;
      });
    });
  }

  function garnirTrampoline(g: THREE.Group): void {
    f(g, [2.6, 0.2, 2.6], [0, 1.2, 0], 0x4c9cff, { forme: 'tube' });
    f(g, [2.4, 0.22, 2.4], [0, 1.22, 0], 'sombre', { forme: 'tube' });
    const sauteur = atelier.mobile(g, [0, 1.4, 0]);
    f(sauteur, [0.5, 0.5, 0.5], [0, 0.25, 0], 'bonbon1', { forme: 'boule' });
    f(sauteur, [0.36, 0.36, 0.36], [0, 0.7, 0], 'peau', { forme: 'boule' });
    animations.push((temps) => {
      sauteur.position.y = 1.4 + Math.abs(Math.sin(temps * 2.2)) * 1.4;
      sauteur.rotation.y = temps;
    });
  }

  function garnirGlaces(g: THREE.Group): void {
    const miroir = atelier.materiau(new THREE.MeshStandardMaterial({ color: 0xcfefff, metalness: 0.4, roughness: 0.1 }));
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(atelier.suivre(new THREE.BoxGeometry(0.75, 2.2, 0.08)), miroir);
      m.position.set(-1.6 + i * 0.8, 2.2, -0.9 + (i % 2) * 0.5);
      m.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.5;
      g.add(m);
    }
  }

  // --- Chantier : la grande roue à venir ----------------------------------------
  const piecesRoue: Array<{ parent: THREE.Object3D; geometrie: THREE.BufferGeometry }> = [];
  const maillagesRoue: THREE.Mesh[] = [];
  const roueFantome = atelier.materiau(
    new THREE.MeshBasicMaterial({ color: COULEURS.fantome, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  const roueConstruite = atelier.materiau(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  let roueFinie = false;
  let vitesseRoue = 0.15;
  /** n pièces sur 10 : les montants, puis les rayons, puis les cabines. */
  function construireRoue(n: number, sur: number): void {
    for (const m of maillagesRoue) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    maillagesRoue.length = 0;
    const visibles = Math.round((piecesRoue.length * Math.max(0, Math.min(n, sur))) / sur);
    // Un maillage par groupe (montants fixes, roue qui tourne) et par état.
    const paquets = new Map<string, { parent: THREE.Object3D; construite: boolean; geometries: THREE.BufferGeometry[] }>();
    piecesRoue.forEach((p, i) => {
      const construite = i < visibles;
      const cle = `${p.parent.id}-${construite}`;
      const paquet = paquets.get(cle) ?? { parent: p.parent, construite, geometries: [] };
      paquet.geometries.push(p.geometrie);
      paquets.set(cle, paquet);
    });
    for (const { parent, construite, geometries } of paquets.values()) {
      const fusion = mergeGeometries(geometries);
      if (!fusion) continue;
      const m = new THREE.Mesh(fusion, construite ? roueConstruite : roueFantome);
      m.userData.garder = true;
      parent.add(m);
      maillagesRoue.push(m);
    }
    roueFinie = n >= sur;
  }
  function chantier(x: number, z: number, ry: number): void {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    racine.add(g);
    for (let i = 0; i < 10; i++) f(g, [0.5, 1.7, 0.12], [-2.7 + i * 0.6, 0.85, 2], i % 2 === 0 ? 'barriereA' : 'barriereB');
    for (let i = 0; i < 6; i++) {
      for (const sx of [-3, 3]) f(g, [0.12, 1.7, 0.5], [sx, 0.85, 1.6 - i * 0.6], i % 2 === 0 ? 'barriereB' : 'barriereA');
    }
    f(g, [5.9, 0.14, 0.16], [0, 1.25, 2.1], 'bois');
    f(g, [0.2, 2.8, 0.2], [-2.2, 1.4, 2.3], 'poteau');
    f(g, [1.7, 1.05, 0.16], [-2.2, 3.1, 2.3], 'enseigne');
    f(g, [0.95, 0.46, 0.08], [-2.2, 3.1, 2.42], 'toileA', { rz: 0.16 });
    ampoule(g, [-2.95, 3.72, 2.3]);
    ampoule(g, [-1.45, 3.72, 2.3]);

    // Les pièces sont gardées comme géométries ; construireRoue les regroupe en quelques
    // maillages (fantômes / construites) pour rester sous le budget d'appels de dessin.
    const couleursCabines = [COULEURS.bonbon1, COULEURS.bonbon2, COULEURS.enseigne, COULEURS.bonbon3];
    const piece = (parent: THREE.Object3D, taille: Vec3, position: Vec3, couleur: number, rz = 0): void => {
      const geometrie = new THREE.BoxGeometry(...taille);
      geometrie.rotateZ(rz);
      geometrie.translate(...position);
      const c = new THREE.Color(couleur);
      const nombre = geometrie.getAttribute('position').count;
      geometrie.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: nombre }, () => [c.r, c.g, c.b]).flat(), 3));
      piecesRoue.push({ parent, geometrie: atelier.suivre(geometrie) });
    };
    const metal = 0xe8e2f2;
    piece(g, [0.26, 4.5, 0.26], [0.75, 2.1, -0.5], metal, 0.343);
    piece(g, [0.26, 4.5, 0.26], [-0.75, 2.1, -0.5], metal, -0.343);
    const roue = atelier.mobile(g, [0, 4.2, -0.5]);
    for (let i = 0; i < 6; i++) piece(roue, [5.8, 0.12, 0.12], [0, 0, 0], metal, (i * Math.PI) / 6);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      piece(roue, [0.62, 0.62, 0.5], [Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0], couleursCabines[i % 4] ?? 0xffffff);
    }
    animations.push((temps, delta) => {
      // Elle tourne doucement en chantier, franchement une fois finie.
      vitesseRoue += ((roueFinie ? 0.6 : 0.15) - vitesseRoue) * Math.min(1, delta);
      roue.rotation.z += vitesseRoue * delta;
      void temps;
    });
    repere('chantier', g, 8.1);
    g.updateMatrixWorld(true);
    vuesStand.chantier = {
      position: new THREE.Vector3(5.6, 5.4, 16).applyMatrix4(g.matrixWorld),
      cible: new THREE.Vector3(3.6, 3.4, 0).applyMatrix4(g.matrixWorld),
    };
    ajouterZone('chantier', g, [6.5, 7, 5], [0, 3, 0], [0, 0, 4.2]);
    forain('chantier', g, { maillot: 0xffa53a, pantalon: 0x4a6fa5, cheveux: 0x2b2233, tenue: 0, objets: false }, [1.8, 0.06, 3.1], -0.2);
    vueLocale('chantier', g, [1.0, 4.2, 12], [0.8, 2.8, 0]);
  }

  // --- Décor -----------------------------------------------------------------
  function arbre(x: number, z: number, t: number): void {
    f(racine, [0.5 * t, 1.6 * t, 0.5 * t], [x, 0.8 * t, z], 'poteau', { forme: 'tube' });
    f(racine, [2.6 * t, 2.4 * t, 2.6 * t], [x, 2.6 * t, z], 'bonbon3', { forme: 'boule' });
    f(racine, [1.8 * t, 1.7 * t, 1.8 * t], [x + 0.7 * t, 3.7 * t, z + 0.2], 'bonbon3', { forme: 'boule' });
  }

  function nuage(x: number, y: number, z: number): void {
    const morceaux: Array<[Vec3, Vec3]> = [
      [[5, 2.2, 2.6], [0, 0, 0]],
      [[3.2, 2.4, 2.4], [-1.2, 1, 0]],
      [[2.8, 1.8, 2.2], [1.6, 0.7, 0]],
    ];
    for (const [taille, d] of morceaux) f(racine, taille, [x + d[0], y + d[1], z + d[2]], 'blanc', { forme: 'boule' });
  }

  function chapiteau(x: number, z: number): void {
    f(racine, [5.2, 2.2, 5.2], [x, 1.1, z], 'toileB', { forme: 'tube' });
    for (let i = 0; i < 5; i++) {
      const cote = 6 - i * 1.2;
      f(racine, [cote, 0.9, cote], [x, 2.65 + i * 0.9, z], i % 2 === 0 ? 'toileA' : 'toileB', { forme: 'tube' });
    }
    ampoule(racine, [x, 7.0, z]);
  }

  function ballonsLaches(): void {
    const couleurs: Peinture[] = ['bonbon1', 'bonbon2', 'enseigne', 'bonbon3', 'toileA'];
    couleurs.forEach((p, i) => {
      const x = -13 + hasard() * 26;
      const z = -14 + hasard() * 9;
      const ballon = atelier.mobile(racine);
      f(ballon, [0.6, 0.72, 0.6], [0, 0, 0], p, { forme: 'boule' });
      decorVivant.push(ballon);
      animations.push((temps) => {
        const h = (temps * 0.7 + i * 3.6) % 18;
        ballon.position.set(x + Math.sin(temps * 0.6 + i) * 0.5, 2 + h, z);
        ballon.scale.setScalar(Math.max(0.01, Math.min(1, h, (18 - h) / 2)));
      });
    });
  }

  function visiteurs(): void {
    const allures: Allure[] = [
      { maillot: 0xffb347, pantalon: 0x4a6fa5, cheveux: 0x2b2233, tenue: 3, objets: true },
      { maillot: 0x7bd389, pantalon: 0x7a5c9a, cheveux: 0xc98a3a, tenue: 1, objets: true },
      { maillot: 0xb48cf2, pantalon: 0x5b6b7a, cheveux: 0xe2c06a, tenue: 2, objets: true },
    ];
    const longueur = 28;
    allures.forEach((allure, i) => {
      const v = creerPersonne(atelier, racine, allure);
      decorVivant.push(v.racine);
      const z = -1.6 + i * 0.6;
      const vitesse = 0.9 + i * 0.2;
      const decalage = i * 11.3;
      v.racine.scale.setScalar(0.92 + (i % 3) * 0.1);
      animations.push((temps) => {
        const d = (temps * vitesse + decalage) % (longueur * 2);
        const aller = d < longueur;
        v.racine.position.set(-longueur / 2 + (aller ? d : longueur * 2 - d), 0.06, z);
        v.racine.rotation.y = aller ? Math.PI / 2 : -Math.PI / 2;
        v.animer(temps, 1, 0);
      });
    });
  }

  // --- Assemblage -------------------------------------------------------------
  stand('confiserie', -10.5, -3.5, 0.5, garnirConfiserie);
  stand('chamboule', 0, -9, 0, garnirChamboule);
  stand('horloge', -17.5, 3.5, 0.9, garnirHorloge);
  // Le fond de la fête.
  stand('peche', -12.5, -19, 0.9, garnirPeche);
  stand('autos', 12.5, -18.5, -0.6, garnirAutos);
  stand('trampoline', -5.5, -30, 0.1, garnirTrampoline);
  stand('glaces', 5.5, -30, -0.1, garnirGlaces);
  chantier(11, -3.5, -0.5);
  chapiteau(-21, -28);
  chapiteau(0, -38);
  chapiteau(21, -28);
  arbre(-19, -10, 1.1);
  arbre(19.5, -11, 1.2);
  arbre(-22, 9, 1);
  arbre(20, 4, 0.9);
  arbre(-17, -36, 1.3);
  arbre(17, -37, 1.15);
  nuage(-20, 17, -34);
  nuage(4, 21, -40);
  nuage(24, 15, -32);

  const coins: Vec3[] = [
    [-15, 0, 6],
    [15, 0, 6],
    [-15, 0, -14],
    [15, 0, -14],
  ];
  for (const [x, , z] of coins) f(racine, [0.3, 5.6, 0.3], [x, 2.8, z], 'poteau', { forme: 'tube' });
  f(racine, [0.34, 8, 0.34], [0, 4, -15.5], 'poteau', { forme: 'tube' });
  const haut = (i: number): THREE.Vector3 => {
    const c = coins[i] ?? [0, 0, 0];
    return new THREE.Vector3(c[0], 5.6, c[2]);
  };
  const mat = new THREE.Vector3(0, 8, -15.5);
  guirlande(haut(0), haut(2), 12, 0.7);
  guirlande(haut(1), haut(3), 12, 0.7);
  guirlande(haut(2), mat, 10, 0.6);
  guirlande(mat, haut(3), 10, 0.6);
  guirlande(haut(0), mat, 16, 0.9);
  guirlande(haut(1), mat, 16, 0.9);
  fanions(new THREE.Vector3(-15, 4.6, 6), new THREE.Vector3(-2.5, 4.5, -7.5), 18, 0.9);
  fanions(new THREE.Vector3(15, 4.6, 6), new THREE.Vector3(2.5, 4.5, -7.5), 18, 0.9);
  ballonsLaches();
  visiteurs();

  // --- Le personnage de l'enfant ------------------------------------------------
  const allureHeros = (accessoires?: Accessoires): Allure => ({
    maillot: 'maillot',
    pantalon: 0xc79a6b,
    cheveux: 0xe08a3c,
    tenue: 0,
    objets: true,
    accessoires,
    peau: 0xfadcc6,
  });
  let heros: Personne = creerPersonne(atelier, racine, allureHeros(depart));
  heros.racine.position.set(0, 0.06, 5.5);
  heros.racine.rotation.y = Math.PI;
  /** Le personnage change d'accessoires : on le refait au même endroit. */
  function habiller(accessoires: Accessoires): void {
    const ancien = heros.racine;
    heros = creerPersonne(atelier, racine, allureHeros(accessoires));
    heros.racine.position.copy(ancien.position);
    heros.racine.rotation.copy(ancien.rotation);
    ancien.removeFromParent();
  }
  /** Le trajet du personnage : des points de passage, puis l'arrivée devant le stand. */
  let cible: { points: THREE.Vector3[]; regard: number; arrivee: () => void } | null = null;
  let finSalut = 0;
  let maintenant = 0;
  let allureLibre = 0;

  animations.push((temps, delta) => {
    let pas = cible ? 0 : allureLibre;
    const point = cible?.points[0];
    if (cible && point) {
      const ecart = point.clone().sub(heros.racine.position).setY(0);
      const distance = ecart.length();
      if (distance < 0.05) {
        cible.points.shift();
        if (cible.points.length > 0) return;
        heros.racine.rotation.y = cible.regard;
        const fini = cible.arrivee;
        cible = null;
        fini();
      } else {
        pas = 1;
        heros.racine.position.addScaledVector(ecart.normalize(), Math.min(distance, VITESSE_MARCHE * delta));
        heros.racine.rotation.y = Math.atan2(ecart.x, ecart.z);
      }
    }
    const salut = temps < finSalut ? Math.min(1, (finSalut - temps) / 0.3, (temps - (finSalut - 1.6)) / 0.3) : 0;
    heros.animer(temps, pas, Math.max(0, salut));
  });

  // --- Lancer -------------------------------------------------------------------
  let debutLancer = -99;
  let impactFait = true;
  animations.push((temps, delta) => {
    if (!standChamboule || !balle) return;
    const t = temps - debutLancer;
    const impact = t >= 0.42 && !impactFait;
    if (impact) impactFait = true;
    const depart = new THREE.Vector3(-0.9, 1.6, 3.2);
    const arrivee = new THREE.Vector3(0, 2.3, -0.95);
    if (t >= 0 && t < 0.42) {
      const u = t / 0.42;
      balle.visible = true;
      balle.position.lerpVectors(depart, arrivee, u);
      balle.position.y += Math.sin(u * Math.PI) * 0.9;
    } else if (t >= 0.42 && t < 0.5) {
      balle.visible = false;
    }
    // Les boîtes tombent, puis la pyramide se remonte toute seule.
    const touche = t >= 0.42;
    for (const b of boites) {
      if (!touche || t > 2.2) {
        b.objet.position.copy(b.depart);
        b.objet.rotation.set(0, 0, 0);
        b.objet.visible = !(t > 2.2 && t < 2.5);
        continue;
      }
      if (impact) {
        b.vitesse.set((b.depart.x + (hasard() - 0.5) * 0.6) * 3, 2 + hasard() * 2, -1.5 - hasard());
        b.rotation.set(hasard() * 8 - 4, hasard() * 4, hasard() * 8 - 4);
      }
      b.vitesse.y -= 12 * delta;
      b.objet.position.addScaledVector(b.vitesse, delta);
      if (b.objet.position.y < 0.2) {
        b.objet.position.y = 0.2;
        b.vitesse.multiplyScalar(0.4);
        b.vitesse.y = Math.abs(b.vitesse.y) * 0.3;
      }
      b.objet.rotation.x += b.rotation.x * delta;
      b.objet.rotation.z += b.rotation.z * delta;
    }
    if (eclats) {
      const position = eclats.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      if (impact) {
        eclats.age = 0;
        for (let i = 0; i < position.count; i++) {
          position.setXYZ(i, arrivee.x, arrivee.y + 0.3, arrivee.z);
          const angle = hasard() * Math.PI * 2;
          const force = 2 + hasard() * 3;
          eclats.vitesses.set([Math.cos(angle) * force, 3 + hasard() * 4, Math.sin(angle) * force * 0.5 + 1.5], i * 3);
        }
      }
      eclats.age += delta;
      eclats.points.visible = eclats.age < 1.3;
      if (eclats.points.visible) {
        for (let i = 0; i < position.count; i++) {
          eclats.vitesses[i * 3 + 1] = (eclats.vitesses[i * 3 + 1] ?? 0) - 9 * delta;
          position.setXYZ(
            i,
            position.getX(i) + (eclats.vitesses[i * 3] ?? 0) * delta,
            position.getY(i) + (eclats.vitesses[i * 3 + 1] ?? 0) * delta,
            position.getZ(i) + (eclats.vitesses[i * 3 + 2] ?? 0) * delta,
          );
        }
        position.needsUpdate = true;
      }
    }
  });

  atelier.fusionner(racine);

  return {
    racine,
    stands,
    vues: {
      // Assez large pour voir les quatre stands, horloge comprise.
      place: { position: new THREE.Vector3(-2, 12, 30), cible: new THREE.Vector3(-1, 2.2, -6) },
      // Assez bas pour voir la pyramide sous la toile du stand.
      chamboule: { position: new THREE.Vector3(3.1, 2.9, 1.2), cible: new THREE.Vector3(1.4, 2.5, -8.8) },
      confiserie: vuesStand.confiserie ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      chantier: vuesStand.chantier ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      horloge: vuesStand.horloge ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      peche: vuesStand.peche ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      fond: { position: new THREE.Vector3(-1.5, 14, 0.5), cible: new THREE.Vector3(0, 0.5, -13.5) },
    },
    pecher() {
      debutPeche = maintenant;
    },
    construireRoue,
    habiller,
    heros: () => heros.racine,
    marcheLibre(allure) {
      allureLibre = Math.max(0, Math.min(1, allure));
    },
    sucette() {
      debutSucette = maintenant;
    },
    vuesCinema: {
      survol: { position: new THREE.Vector3(-4, 19, 30), cible: new THREE.Vector3(0, 1.5, -9) },
      fin: { position: new THREE.Vector3(3, 12, 26), cible: new THREE.Vector3(3, 3, -7) },
      chamboule: vuesForain.chamboule ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      confiserie: vuesForain.confiserie ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      chantier: vuesForain.chantier ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      horloge: vuesForain.horloge ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
      peche: vuesForain.peche ?? { position: new THREE.Vector3(), cible: new THREE.Vector3() },
    },
    saluerForain(id) {
      if (finsDeSalut.has(id)) finsDeSalut.set(id, maintenant + DUREE_SALUT);
    },
    allumer(id, allume) {
      const r = reperes.get(id);
      if (r) r.visible = allume;
    },
    calme(actif) {
      for (const objet of decorVivant) objet.visible = !actif;
    },
    allerAuStand(stand) {
      return new Promise((resoudre) => {
        // Entre l'entrée et le fond de la fête, on passe par l'allée à droite du chamboule-tout.
        const fond = (z: number): boolean => z < LIMITE_FOND;
        const points: THREE.Vector3[] = [];
        if (fond(stand.approche.z) !== fond(heros.racine.position.z)) {
          const devant = new THREE.Vector3(5.5, 0.06, -1);
          const derriere = new THREE.Vector3(5.5, 0.06, -15);
          points.push(...(fond(stand.approche.z) ? [devant, derriere] : [derriere, devant]));
        }
        points.push(stand.approche.clone().setY(0.06));
        cible = { points, regard: stand.regard, arrivee: resoudre };
      });
    },
    lancer() {
      debutLancer = maintenant;
      impactFait = false;
    },
    saluer() {
      finSalut = maintenant + 1.6;
    },
    mettreAJour(temps, delta) {
      maintenant = temps;
      for (const animer of animations) animer(temps, delta);
    },
    liberer() {
      atelier.liberer();
    },
  };
}
