// Une personne de la fête : le personnage de l'enfant, le forain ou un visiteur.

import * as THREE from 'three';
import { COULEURS, ombree, type Atelier, type Forme, type Options, type Peinture, type Vec3 } from './atelier.ts';

export interface Allure {
  maillot: Peinture;
  pantalon: Peinture;
  cheveux: number;
  /** 0 casquette et sac, 1 chapeau haut et ballon, 2 couronne et cape, 3 bonnet et écharpe. */
  tenue: number;
  /** Objet tenu en main (ballon, baguette, sucette) selon la tenue. */
  objets: boolean;
  moustache?: boolean;
}

export interface Personne {
  /** Le groupe à déplacer et tourner. */
  racine: THREE.Group;
  /** pas : 0 immobile, 1 en marche. salut : 0 bras baissé, 1 salut de la main. */
  animer(temps: number, pas: number, salut: number): void;
  /** Position de la main droite, dans le repère de la personne. */
  main: THREE.Vector3;
}

let compteur = 0;

export function creerPersonne(atelier: Atelier, parent: THREE.Object3D, allure: Allure): Personne {
  const rang = compteur++;
  const { blanc, sombre, or, rouge } = COULEURS;
  const fin = (forme?: Forme): Options => ({ forme });

  const racine = atelier.mobile(parent);
  const ombre = new THREE.Mesh(
    atelier.suivre(new THREE.CircleGeometry(0.62, 20)),
    atelier.materiau(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })),
  );
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = 0.02;
  racine.add(ombre);
  // Tout le corps est dans ce groupe, qui sautille quand la personne marche.
  const corps = atelier.mobile(racine);
  const pose = (taille: Vec3, position: Vec3, peinture: Peinture, options: Options = {}): THREE.Mesh =>
    atelier.forme(corps, taille, position, peinture, options);

  /** Profondeur du visage à cet endroit, pour y poser les yeux et la bouche. */
  const profondeur = (x: number, y: number): number =>
    0.44 * Math.sqrt(Math.max(0.05, 1 - (x / 0.48) ** 2 - ((y - 2) / 0.44) ** 2));
  const calotte = (taille: Vec3, base: number, peinture: Peinture, dz = 0): void => {
    pose([taille[0], taille[1] * 2, taille[2]], [0, base, dz], peinture, { forme: 'boule' });
  };

  // Jambes : chacune pivote à la hanche.
  const jambe = (cote: number): THREE.Group => {
    const membre = atelier.mobile(corps, [cote * 0.19, 0.75, 0]);
    atelier.forme(membre, [0.3, 0.5, 0.3], [0, -0.25, 0], allure.pantalon, { forme: 'tube' });
    atelier.forme(membre, [0.34, 0.24, 0.5], [0, -0.61, 0.07], blanc, { forme: 'boule' });
    atelier.forme(membre, [0.36, 0.08, 0.52], [0, -0.7, 0.07], rouge, fin('tube'));
    return membre;
  };
  const jambeG = jambe(-1);
  const jambeD = jambe(1);

  pose([0.8, 0.78, 0.5], [0, 1.13, 0], allure.maillot);
  pose([0.82, 0.14, 0.52], [0, 1.24, 0], ombree(allure.maillot));
  pose([0.82, 0.1, 0.52], [0, 0.79, 0], sombre);
  pose([0.14, 0.12, 0.06], [0, 0.79, 0.27], or);

  // Bras : chacun pivote à l'épaule.
  const bras = (cote: number): THREE.Group => {
    const membre = atelier.mobile(corps, [cote * 0.5, 1.46, 0]);
    membre.rotation.z = cote * 0.2;
    atelier.forme(membre, [0.22, 0.56, 0.22], [0, -0.26, 0], allure.maillot, { forme: 'tube' });
    atelier.forme(membre, [0.25, 0.25, 0.25], [0, -0.6, 0], 'peau', { forme: 'boule' });
    return membre;
  };
  const brasG = bras(-1);
  const brasD = bras(1);

  // Tête et visage. Les yeux et la bouche bougent : ils restent à part.
  pose([0.96, 0.88, 0.88], [0, 2.0, 0], 'peau', { forme: 'boule' });
  const visage = atelier.mobile(corps);
  const yeux: THREE.Object3D[] = [];
  for (const cote of [-1, 1]) {
    pose([0.16, 0.2, 0.14], [cote * 0.48, 1.98, 0], 'peau', fin('boule'));
    const x = cote * 0.19;
    const z = profondeur(x, 1.95);
    const oeil = atelier.mobile(visage, [x, 1.95, z]);
    atelier.forme(oeil, [0.13, 0.2, 0.08], [0, 0, 0], sombre, fin('boule'));
    atelier.forme(oeil, [0.05, 0.06, 0.04], [0.025, 0.05, 0.035], blanc, fin('boule'));
    yeux.push(oeil);
    pose([0.15, 0.1, 0.04], [cote * 0.3, 1.8, profondeur(cote * 0.3, 1.8)], 0xff9aa8, fin('disque'));
    if (allure.moustache) {
      pose([0.2, 0.08, 0.07], [cote * 0.1, 1.8, profondeur(cote * 0.1, 1.8) + 0.02], allure.cheveux, {
        forme: 'boule',
        rz: cote * -0.3,
      });
    }
  }
  const hauteurBouche = allure.moustache ? 1.71 : 1.75;
  const bouche = atelier.mobile(visage, [0, hauteurBouche, profondeur(0, hauteurBouche)]);
  atelier.forme(bouche, [0.18, 0.07, 0.06], [0, 0, 0], 0xb8444e, fin('boule'));
  pose([0.9, 0.46, 0.3], [0, 2.02, -0.34], allure.cheveux, { forme: 'boule' });
  const cheveuxDessus = (): void => calotte([0.98, 0.26, 0.92], 2.26, allure.cheveux, -0.02);

  // Tenues. Un bras qui tient un objet ne se balance pas.
  let tientG = false;
  let tientD = false;
  switch (allure.tenue) {
    case 1: {
      cheveuxDessus();
      pose([1.06, 0.07, 1.06], [0, 2.53, 0], sombre, { forme: 'tube' });
      pose([0.6, 0.5, 0.6], [0, 2.8, 0], sombre, { forme: 'tube' });
      pose([0.63, 0.12, 0.63], [0, 2.63, 0], rouge, fin('tube'));
      for (const cote of [-1, 1]) pose([0.18, 0.15, 0.08], [cote * 0.11, 1.5, 0.27], rouge, fin('boule'));
      pose([0.08, 0.08, 0.1], [0, 1.5, 0.28], or, fin('boule'));
      if (allure.objets) {
        tientD = true;
        atelier.ligne(corps, [new THREE.Vector3(0.6, 0.86, 0), new THREE.Vector3(0.82, 3.25, 0)]);
        pose([0.55, 0.66, 0.55], [0.82, 3.55, 0], 'bonbon1', { forme: 'boule' });
      }
      break;
    }
    case 2: {
      cheveuxDessus();
      pose([0.66, 0.16, 0.66], [0, 2.5, 0], or, { forme: 'tube' });
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        pose([0.12, 0.2, 0.12], [Math.sin(angle) * 0.27, 2.66, Math.cos(angle) * 0.27], or);
      }
      pose([0.1, 0.1, 0.06], [0, 2.5, 0.33], rouge, fin('boule'));
      pose([0.92, 1.15, 0.08], [0, 0.98, -0.36], rouge, { rx: 0.14 });
      pose([0.9, 0.14, 0.58], [0, 1.5, 0], rouge);
      pose([0.12, 0.12, 0.08], [0, 1.5, 0.3], or, fin('boule'));
      if (allure.objets) {
        tientG = true;
        pose([0.05, 0.75, 0.05], [-0.6, 1.2, 0.1], blanc, fin('tube'));
        pose([0.2, 0.2, 0.07], [-0.6, 1.62, 0.1], or, { rz: Math.PI / 4 });
      }
      break;
    }
    case 3: {
      calotte([1.02, 0.36, 0.98], 2.26, 0x3f8fe0);
      pose([1.05, 0.16, 1.01], [0, 2.3, 0], blanc, { forme: 'tube' });
      pose([0.26, 0.26, 0.26], [0, 2.72, 0], blanc, { forme: 'boule' });
      pose([0.62, 0.18, 0.6], [0, 1.56, 0], 0xff8a3a, { forme: 'tube' });
      pose([0.2, 0.5, 0.08], [0.2, 1.3, 0.29], 0xff8a3a);
      if (allure.objets) {
        tientD = true;
        pose([0.05, 0.6, 0.05], [0.6, 1.15, 0.12], blanc, fin('tube'));
        pose([0.34, 0.34, 0.08], [0.6, 1.55, 0.12], 'bonbon1', { forme: 'disque' });
      }
      break;
    }
    case 4: {
      // Chignon et lunettes rondes (l'horlogère).
      cheveuxDessus();
      pose([0.42, 0.42, 0.42], [0, 2.5, -0.28], allure.cheveux, { forme: 'boule' });
      // Montures carrées autour des yeux, sans les cacher.
      for (const cote of [-1, 1]) {
        const x = cote * 0.19;
        for (const y of [2.09, 1.82]) pose([0.3, 0.035, 0.04], [x, y, profondeur(x, y) + 0.04], sombre);
        for (const dx of [-0.15, 0.15]) pose([0.035, 0.3, 0.04], [x + dx, 1.955, profondeur(x + dx, 1.955) + 0.04], sombre);
      }
      pose([0.1, 0.035, 0.04], [0, 2.0, profondeur(0, 2.0) + 0.06], sombre);
      break;
    }
    default: {
      calotte([1.02, 0.34, 0.98], 2.26, 'casquette');
      pose([0.56, 0.07, 0.38], [0, 2.3, 0.58], ombree('casquette'), { forme: 'tube' });
      pose([0.12, 0.1, 0.12], [0, 2.61, 0], blanc, fin('boule'));
      pose([0.56, 0.62, 0.26], [0, 1.14, -0.38], 'bonbon3');
      pose([0.36, 0.26, 0.08], [0, 1.02, -0.53], ombree('bonbon3'));
      for (const cote of [-1, 1]) pose([0.1, 0.74, 0.05], [cote * 0.25, 1.16, 0.26], 'bonbon3');
      break;
    }
  }

  return {
    racine,
    main: new THREE.Vector3(0.6, 0.9, 0.1),
    animer(temps: number, pas: number, salut: number): void {
      const phase = temps * 7 + rang * 1.3;
      const balancement = Math.sin(phase) * 0.55 * pas;
      jambeG.rotation.x = balancement;
      jambeD.rotation.x = -balancement;
      brasG.rotation.set(tientG ? 0 : -balancement * 0.9, 0, -0.2);
      brasD.rotation.set(tientD ? 0 : balancement * 0.9, 0, 0.2);
      if (salut > 0) {
        // Salut de la main, avec le bras qui ne tient rien.
        const levee = 0.2 + salut * (2.3 + Math.sin(temps * 9) * 0.35);
        if (tientG) brasD.rotation.set(0, 0, levee);
        else brasG.rotation.set(0, 0, -levee);
      }
      corps.position.y = Math.abs(Math.sin(phase)) * 0.05 * pas;
      // Clin d'œil régulier, et sourire plus grand pendant le salut.
      const clin = (temps + rang * 0.7) % 3.4 < 0.13;
      for (const oeil of yeux) oeil.scale.y = clin ? 0.12 : 1;
      bouche.scale.set(1 + salut * 0.5, 1 + salut * 1.2, 1);
    },
  };
}
