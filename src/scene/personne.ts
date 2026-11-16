// Une personne de la fête : le personnage de l'enfant, le forain ou un visiteur. Style
// « douillet » : grosse tête ronde, grands yeux brillants, petit corps, accessoires séparés
// (chapeau, lunettes, haut, chaussures, objet tenu) que l'enfant gagne et choisit.

import * as THREE from 'three';
import { COULEURS, type Atelier, type Options, type Peinture, type Vec3 } from './atelier.ts';

/** Les accessoires portés. Chaque champ est l'identifiant d'un lot (voir recompenses.ts), ou « rien ». */
export interface Accessoires {
  chapeau: string;
  lunettes: string;
  haut: string;
  chaussures: string;
  objet: string;
}

export interface Allure {
  maillot: Peinture;
  pantalon: Peinture;
  cheveux: number;
  /** Anciennes tenues des forains et visiteurs : 0 casquette et sac, 1 chapeau haut et ballon,
   *  2 couronne et cape, 3 bonnet et écharpe, 4 chignon et lunettes. */
  tenue: number;
  /** Objet tenu en main (ballon, baguette, sucette) selon la tenue. */
  objets: boolean;
  moustache?: boolean;
  /** Si présent, remplace la tenue : c'est le cas du personnage de l'enfant. */
  accessoires?: Accessoires;
  peau?: number;
}

export interface Personne {
  /** Le groupe à déplacer et tourner. */
  racine: THREE.Group;
  /** pas : 0 immobile, 1 en marche. salut : 0 bras baissé, 1 salut de la main. */
  animer(temps: number, pas: number, salut: number): void;
  /** Position de la main droite, dans le repère de la personne. */
  main: THREE.Vector3;
}

/** Les personnages sont dessinés à l'échelle « jouet » (1,6 m) puis agrandis pour la fête. */
const ECHELLE = 1.6;
const TETE = 1.18;

/** Les couleurs des hauts et des chaussures, par identifiant de lot. */
export const COULEURS_HAUTS: Record<string, number> = {
  'haut-corail': 0xf28a6b,
  'haut-bleu': 0x6fa8ef,
  'haut-menthe': 0x8fd9b8,
  'haut-lilas': 0xb9a3ea,
  'haut-orange': 0xffa95a,
  'haut-jaune': 0xffd65c,
  'haut-mariniere': 0xfdf7ee,
  'haut-salopette': 0xfdf3e3,
};
export const COULEURS_CHAUSSURES: Record<string, number> = {
  'chaussures-bottines': 0xa86b45,
  'chaussures-rouges': 0xe0504f,
  'chaussures-pluie': 0xffcf4a,
  'chaussures-bleues': 0x5b8def,
};

/** Les anciennes tenues, traduites en accessoires (pour les forains et les visiteurs). */
function depuisTenue(a: Allure): Accessoires {
  const objet = a.objets ? ['objet-sac', 'objet-ballon', 'objet-baguette', 'objet-sucette', 'rien'][a.tenue] ?? 'rien' : a.tenue === 0 ? 'objet-sac' : 'rien';
  return {
    chapeau: ['chapeau-casquette', 'chapeau-haut', 'chapeau-couronne', 'chapeau-bonnet', 'chapeau-chignon'][a.tenue] ?? 'rien',
    lunettes: a.tenue === 4 ? 'lunettes-carrees' : 'rien',
    haut: 'rien',
    chaussures: 'chaussures-bottines',
    objet,
  };
}

let compteur = 0;

export function creerPersonne(atelier: Atelier, parent: THREE.Object3D, allure: Allure): Personne {
  const rang = compteur++;
  const { blanc, sombre, or, rouge } = COULEURS;
  const acc = allure.accessoires ?? depuisTenue(allure);
  const peau = allure.peau ?? COULEURS.peau;
  const tissu: Peinture = COULEURS_HAUTS[acc.haut] ?? allure.maillot;
  const souliers = COULEURS_CHAUSSURES[acc.chaussures] ?? 0xa86b45;
  const salopette = acc.haut === 'haut-salopette';

  const racine = atelier.mobile(parent);
  const ombre = new THREE.Mesh(
    atelier.suivre(new THREE.CircleGeometry(0.62, 20)),
    atelier.materiau(new THREE.MeshBasicMaterial({ color: 0x3d5a2a, transparent: true, opacity: 0.2, depthWrite: false })),
  );
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = 0.02;
  racine.add(ombre);
  // Tout le corps est dans ce groupe, qui sautille quand la personne marche.
  const corps = atelier.mobile(racine);
  corps.scale.setScalar(ECHELLE);
  const f = (parent2: THREE.Object3D, taille: Vec3, position: Vec3, p: Peinture, options: Options = {}): THREE.Mesh =>
    atelier.forme(parent2, taille, position, p, options);
  const pose = (taille: Vec3, position: Vec3, p: Peinture, options: Options = {}): THREE.Mesh => f(corps, taille, position, p, options);

  // Jambes courtes et grosses chaussures arrondies ; chacune pivote à la hanche.
  const jambe = (cote: number): THREE.Group => {
    const membre = atelier.mobile(corps, [cote * 0.11, 0.4, 0]);
    // Chaussettes crème sous un short court : des jambes de jouet.
    f(membre, [0.15, 0.3, 0.15], [0, -0.17, 0], salopette ? 0x5b8def : 0xfdf3e3, { forme: 'gelule' });
    f(membre, [0.24, 0.18, 0.34], [0, -0.33, 0.04], souliers, { forme: 'boule' });
    f(membre, [0.24, 0.03, 0.32], [0, -0.4, 0.04], 0xfdf7ee, { forme: 'tube' });
    return membre;
  };
  const jambeG = jambe(-1);
  const jambeD = jambe(1);

  // Tronc arrondi, short (ou bas de salopette), col.
  pose([0.4, 0.5, 0.33], [0, 0.62, 0], tissu, { forme: 'gelule' });
  if (acc.haut === 'haut-mariniere') for (const y of [0.52, 0.62, 0.72]) pose([0.41, 0.035, 0.34], [0, y, 0], 0x4f7fd9, { forme: 'tube' });
  pose([0.4, 0.14, 0.35], [0, 0.43, 0], salopette ? 0x5b8def : allure.pantalon, { forme: 'tube' });
  if (salopette) {
    pose([0.3, 0.26, 0.1], [0, 0.6, 0.14], 0x5b8def);
    for (const x of [-0.11, 0.11]) pose([0.05, 0.24, 0.04], [x, 0.74, 0.15], 0x5b8def, { rx: -0.25 });
  }
  pose([0.3, 0.3, 0.3], [0, 0.83, 0], 0xfdf7ee, { forme: 'anneau', rx: Math.PI / 2 });

  // Bras : ils partent des épaules et se balancent.
  const bras = (cote: number): THREE.Group => {
    const membre = atelier.mobile(corps, [cote * 0.24, 0.78, 0]);
    membre.rotation.z = cote * 0.18;
    f(membre, [0.13, 0.33, 0.13], [cote * 0.02, -0.15, 0], tissu, { forme: 'gelule' });
    f(membre, [0.15, 0.15, 0.15], [cote * 0.03, -0.33, 0.02], peau, { forme: 'boule' });
    return membre;
  };
  const brasG = bras(-1);
  const brasD = bras(1);

  // La tête : grosse, ronde, avec de grands yeux brillants et des joues roses.
  pose([0.84, 0.78, 0.76], [0, TETE, 0], peau, { forme: 'boule' });
  for (const x of [-1, 1]) pose([0.16, 0.2, 0.12], [x * 0.41, TETE - 0.02, -0.02], peau, { forme: 'boule' });
  const visage = atelier.mobile(corps);
  const yeux: THREE.Object3D[] = [];
  for (const x of [-0.15, 0.15]) {
    const oeil = atelier.mobile(visage, [x, TETE, 0.34]);
    f(oeil, [0.15, 0.2, 0.1], [0, 0, 0], sombre, { forme: 'boule' });
    f(oeil, [0.05, 0.06, 0.04], [0.025, 0.04, 0.04], blanc, { forme: 'boule' });
    yeux.push(oeil);
    pose([0.14, 0.08, 0.05], [x * 1.45, TETE - 0.11, 0.3], 0xffa9a0, { forme: 'boule' });
    if (allure.moustache) pose([0.16, 0.06, 0.06], [x * 0.55, TETE - 0.15, 0.36], allure.cheveux, { forme: 'boule', rz: x > 0 ? 0.3 : -0.3 });
  }
  const bouche = atelier.mobile(visage, [0, TETE - (allure.moustache ? 0.19 : 0.13), 0.36]);
  f(bouche, [0.08, 0.04, 0.04], [0, 0, 0], 0xc2645e, { forme: 'boule' });

  // Cheveux : calotte inclinée vers l'arrière et frange en trois mèches (sauf sous un bonnet).
  const chapeau = acc.chapeau;
  // Sous une casquette ou un bonnet, seuls les cheveux de derrière dépassent.
  const couvert = chapeau === 'chapeau-bonnet' || chapeau === 'chapeau-casquette';
  pose([0.8, 0.5, 0.5], [0, TETE + 0.02, -0.2], allure.cheveux, { forme: 'boule' });
  if (!couvert) {
    pose([0.9, 0.42, 0.86], [0, TETE + 0.06, -0.04], allure.cheveux, { forme: 'calotte', rx: -0.5 });
    for (const [x, r] of [[-0.18, 0.4], [0, 0], [0.18, -0.4]] as const) pose([0.3, 0.2, 0.2], [x, TETE + 0.25, 0.27], allure.cheveux, { forme: 'boule', rx: 0.3, rz: r });
  }

  // Chapeaux.
  const H = TETE + 0.3;
  switch (chapeau) {
    case 'chapeau-casquette':
      pose([0.94, 0.48, 0.92], [0, TETE + 0.06, -0.02], 'casquette', { forme: 'calotte', rx: -0.15 });
      pose([0.64, 0.07, 0.48], [0, TETE + 0.1, 0.44], ombreDe('casquette'), { forme: 'boule' });
      pose([0.12, 0.08, 0.12], [0, TETE + 0.52, -0.08], blanc, { forme: 'boule' });
      break;
    case 'chapeau-paille':
      pose([1.36, 0.05, 1.36], [0, H, -0.02], 0xf0c96a, { forme: 'tube', rx: -0.12 });
      pose([0.74, 0.3, 0.74], [0, H + 0.15, -0.04], 0xf3d27e, { forme: 'tube', rx: -0.12 });
      pose([0.8, 0.08, 0.8], [0, H + 0.05, -0.03], 0xe0645c, { forme: 'tube', rx: -0.12 });
      break;
    case 'chapeau-haut':
      pose([1.1, 0.05, 1.1], [0, H, -0.02], sombre, { forme: 'tube' });
      pose([0.62, 0.55, 0.62], [0, H + 0.28, -0.02], sombre, { forme: 'tube' });
      pose([0.64, 0.1, 0.64], [0, H + 0.08, -0.02], rouge, { forme: 'tube' });
      break;
    case 'chapeau-bonnet':
      pose([0.94, 0.46, 0.94], [0, TETE + 0.1, -0.02], 0xf28fb3, { forme: 'calotte', rx: -0.18 });
      pose([0.9, 0.9, 0.9], [0, TETE + 0.12, -0.02], 0xfde3ec, { forme: 'anneau', rx: Math.PI / 2 - 0.18 });
      pose([0.26, 0.26, 0.26], [0, TETE + 0.6, -0.1], 0xfde3ec, { forme: 'boule' });
      break;
    case 'chapeau-magicien':
      pose([1.24, 0.05, 1.24], [0, H, -0.02], 0x7a5cc9, { forme: 'tube', rx: -0.12 });
      pose([0.72, 0.8, 0.72], [0, H + 0.4, -0.06], 0x8c6ddb, { forme: 'cone', rx: -0.12, rz: 0.12 });
      pose([0.12, 0.12, 0.05], [0.1, H + 0.42, 0.24], 0xffd84d, { forme: 'boule' });
      break;
    case 'chapeau-couronne':
      pose([0.6, 0.15, 0.6], [0, TETE + 0.42, 0], or, { forme: 'tube' });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        pose([0.11, 0.16, 0.11], [Math.sin(a) * 0.28, TETE + 0.56, Math.cos(a) * 0.28], or, { forme: 'cone' });
        pose([0.07, 0.07, 0.07], [Math.sin(a) * 0.31, TETE + 0.42, Math.cos(a) * 0.31], i % 2 ? rouge : 0x4cc4ff, { forme: 'boule' });
      }
      break;
    case 'chapeau-chignon':
      pose([0.38, 0.38, 0.38], [0, TETE + 0.4, -0.22], allure.cheveux, { forme: 'boule' });
      break;
  }

  // Lunettes : deux anneaux et un pont, posés devant les yeux.
  const lunettes = (couleur: number, verre: number | null, taille = 0.24): void => {
    for (const x of [-0.15, 0.15]) {
      pose([taille, taille, 0.18], [x, TETE + 0.01, 0.4], couleur, { forme: 'anneau' });
      if (verre !== null) pose([taille * 0.9, taille * 0.9, 0.02], [x, TETE + 0.01, 0.39], verre, { forme: 'disque' });
    }
    pose([0.08, 0.025, 0.025], [0, TETE + 0.03, 0.41], couleur, { forme: 'tube', rz: Math.PI / 2 });
  };
  switch (acc.lunettes) {
    case 'lunettes-rondes':
      lunettes(0x6b4a3a, null);
      break;
    case 'lunettes-soleil':
      lunettes(0x2f2a3a, 0x3a3550);
      break;
    case 'lunettes-rouges':
      lunettes(0xe0504f, null, 0.29);
      break;
    case 'lunettes-carrees':
      lunettes(sombre, null, 0.26);
      break;
  }

  // Objet tenu dans la main droite (le sac se porte dans le dos).
  let tientD = false;
  const main = (): THREE.Group => {
    tientD = true;
    return atelier.mobile(brasD, [0.03, -0.36, 0.06]);
  };
  switch (acc.objet) {
    case 'objet-sac':
      pose([0.34, 0.36, 0.16], [0, 0.66, -0.24], 'bonbon3');
      pose([0.24, 0.16, 0.05], [0, 0.6, -0.33], ombreDe('bonbon3'));
      break;
    case 'objet-ballon': {
      const m = main();
      f(m, [0.012, 1.1, 0.012], [0, 0.55, 0], blanc, { forme: 'tube' });
      f(m, [0.5, 0.58, 0.5], [0, 1.25, 0], 'bonbon1', { forme: 'boule' });
      break;
    }
    case 'objet-sucette': {
      const m = main();
      f(m, [0.04, 0.4, 0.04], [0, 0.2, 0], blanc, { forme: 'tube' });
      f(m, [0.34, 0.34, 0.05], [0, 0.52, 0], 0xf2789a, { forme: 'disque' });
      f(m, [0.18, 0.18, 0.08], [0, 0.52, 0.02], 0xfff4d6, { forme: 'anneau' });
      break;
    }
    case 'objet-baguette': {
      const m = main();
      f(m, [0.04, 0.45, 0.04], [0, 0.22, 0], 0x8c6ddb, { forme: 'tube' });
      f(m, [0.2, 0.2, 0.05], [0, 0.5, 0], 0xffd84d, { rz: Math.PI / 4 });
      break;
    }
    case 'objet-epuisette': {
      const m = main();
      m.rotation.z = 0.4;
      f(m, [0.05, 1.1, 0.05], [0, 0.45, 0], 0x8a5a3c, { forme: 'tube' });
      f(m, [0.4, 0.4, 0.22], [0, 1.1, 0], 0xd8d2c4, { forme: 'anneau', rx: Math.PI / 2 });
      f(m, [0.36, 0.3, 0.36], [0, 0.98, 0], 0xf6f1e6, { forme: 'cone', rx: Math.PI });
      break;
    }
  }

  const s = ECHELLE;
  return {
    racine,
    main: new THREE.Vector3(0.3 * s, 0.44 * s, 0.08 * s),
    animer(temps: number, pas: number, salut: number): void {
      const phase = temps * 8 + rang * 1.3;
      const balancement = Math.sin(phase) * 0.6 * pas;
      jambeG.rotation.x = balancement;
      jambeD.rotation.x = -balancement;
      brasG.rotation.set(-balancement * 0.9, 0, -0.18);
      brasD.rotation.set(tientD ? 0 : balancement * 0.9, 0, 0.18);
      if (salut > 0) {
        // Salut de la main, avec le bras qui ne tient rien.
        const levee = 0.18 + salut * (2.3 + Math.sin(temps * 9) * 0.35);
        brasG.rotation.set(0, 0, -levee);
      }
      corps.position.y = Math.abs(Math.sin(phase)) * 0.08 * pas + Math.sin(temps * 2 + rang) * 0.01;
      // Clin d'œil régulier, et sourire plus grand pendant le salut.
      const clin = (temps + rang * 0.7) % 3.4 < 0.13;
      for (const oeil of yeux) oeil.scale.y = clin ? 0.12 : 1;
      bouche.scale.set(1 + salut * 0.6, 1 + salut * 1.4, 1);
    },
  };
}

function ombreDe(p: Peinture): number {
  return new THREE.Color(typeof p === 'number' ? p : COULEURS[p]).multiplyScalar(0.8).getHex();
}
