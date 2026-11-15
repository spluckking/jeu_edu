// L'atelier fabrique les formes de la fête dans le style « Jouet tout doux ».
// Toutes les formes partagent un seul matériau : leur couleur est peinte sur leurs sommets.
// Ainsi, une fois la scène construite, tout ce qui ne bouge pas peut être fusionné
// en quelques maillages, ce qui garde la tablette fluide.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Vec3 = [number, number, number];

/** Forme ronde à la place du bloc arrondi par défaut. */
export type Forme = 'boule' | 'tube' | 'disque';

export interface Options {
  forme?: Forme;
  rx?: number;
  ry?: number;
  rz?: number;
  /** Forme qui brille par elle-même (ampoule), sans ombre ni lumière. */
  lumineux?: boolean;
}

/** Palette du style « Jouet tout doux ». */
export const COULEURS = {
  sol: 0x6fd05a,
  allee: 0xf6dc9c,
  bois: 0xd99a5b,
  comptoir: 0xff8552,
  toileA: 0xff5a6e,
  toileB: 0xfffaf0,
  enseigne: 0xffd447,
  boite: 0xc9d6e6,
  bonbon1: 0xff7ac0,
  bonbon2: 0x4cc4ff,
  bonbon3: 0x93e052,
  barriereA: 0xffd447,
  barriereB: 0x6a70a8,
  fantome: 0x8a96e8,
  peau: 0xffd2a8,
  maillot: 0x4cb0ff,
  pantalon: 0x5a64c8,
  casquette: 0xff5a6e,
  poteau: 0xb9793f,
  sombre: 0x2b2233,
  blanc: 0xffffff,
  or: 0xffcf3a,
  rouge: 0xe0424b,
  cheveux: 0x5a3a22,
} as const;

export type Peinture = keyof typeof COULEURS | number;

export const AMPOULES = [0xffd447, 0xff5a6e, 0x4cc4ff, 0x93e052];

function teinte(peinture: Peinture): THREE.Color {
  return new THREE.Color(typeof peinture === 'number' ? peinture : COULEURS[peinture]);
}

/** Une couleur plus sombre, pour détacher un détail de son support. */
export function ombree(peinture: Peinture, facteur = 0.72): number {
  return teinte(peinture).multiplyScalar(facteur).getHex();
}

export class Atelier {
  readonly mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.75,
    metalness: 0,
    // Le reflet de velours éclaircit le bord des formes, comme sur une peluche.
    sheen: 0.8,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xffffff),
  });
  readonly lumiere = new THREE.MeshBasicMaterial({ vertexColors: true });
  readonly fil = new THREE.LineBasicMaterial({ color: COULEURS.poteau });
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materiaux: THREE.Material[] = [this.mat, this.lumiere, this.fil];

  suivre<T extends THREE.BufferGeometry>(geometrie: T): T {
    this.geometries.push(geometrie);
    return geometrie;
  }

  materiau<T extends THREE.Material>(materiau: T): T {
    this.materiaux.push(materiau);
    return materiau;
  }

  private geometrie([l, h, p]: Vec3, forme: Forme | undefined): THREE.BufferGeometry {
    switch (forme) {
      case 'boule':
        return new THREE.SphereGeometry(0.5, 18, 12).scale(l, h, p);
      case 'tube':
        return new THREE.CylinderGeometry(l / 2, l / 2, h, 18).scale(1, 1, p / l);
      case 'disque':
        return new THREE.CylinderGeometry(l / 2, l / 2, p, 18).rotateX(Math.PI / 2).scale(1, h / l, 1);
      case undefined:
        return new RoundedBoxGeometry(l, h, p, 2, Math.min(Math.min(l, h, p) * 0.4, 0.28));
    }
  }

  /** Pose une forme colorée. */
  forme(parent: THREE.Object3D, taille: Vec3, position: Vec3, peinture: Peinture, options: Options = {}): THREE.Mesh {
    const brute = this.geometrie(taille, options.forme);
    const geometrie = this.suivre(brute.index ? brute.toNonIndexed() : brute);
    if (geometrie !== brute) brute.dispose();
    const couleur = teinte(peinture);
    const compte = geometrie.getAttribute('position').count;
    const couleurs = new Float32Array(compte * 3);
    for (let i = 0; i < compte; i++) couleurs.set([couleur.r, couleur.g, couleur.b], i * 3);
    geometrie.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));

    const maillage = new THREE.Mesh(geometrie, options.lumineux ? this.lumiere : this.mat);
    maillage.position.set(...position);
    maillage.rotation.set(options.rx ?? 0, options.ry ?? 0, options.rz ?? 0);
    parent.add(maillage);
    return maillage;
  }

  /** Un fil entre plusieurs points. */
  ligne(parent: THREE.Object3D, points: THREE.Vector3[]): THREE.Line {
    const ligne = new THREE.Line(this.suivre(new THREE.BufferGeometry().setFromPoints(points)), this.fil);
    parent.add(ligne);
    return ligne;
  }

  /** Un groupe dont la position, la rotation ou la taille changent : il n'est pas fusionné avec son parent. */
  mobile(parent: THREE.Object3D, position: Vec3 = [0, 0, 0]): THREE.Group {
    const groupe = new THREE.Group();
    groupe.position.set(...position);
    groupe.userData.mobile = true;
    parent.add(groupe);
    return groupe;
  }

  /**
   * Fusionne tout ce qui ne bouge pas sous ce groupe en un maillage par matériau,
   * puis recommence dans chaque groupe mobile.
   */
  fusionner(groupe: THREE.Object3D): void {
    groupe.updateMatrixWorld(true);
    const inverse = groupe.matrixWorld.clone().invert();
    const formes = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const segments = new Map<THREE.Material, number[]>();
    const retirer: THREE.Object3D[] = [];
    const mobiles: THREE.Object3D[] = [];
    const passage = new THREE.Matrix4();

    const visiter = (objet: THREE.Object3D): void => {
      for (const enfant of objet.children) {
        if (enfant.userData.mobile || enfant.userData.garder) {
          if (enfant.userData.mobile) mobiles.push(enfant);
          continue;
        }
        if (enfant.children.length > 0) visiter(enfant);
        if (!enfant.visible) continue;
        passage.multiplyMatrices(inverse, enfant.matrixWorld);
        if (enfant instanceof THREE.Mesh && enfant.geometry instanceof THREE.BufferGeometry) {
          const materiau = enfant.material as THREE.Material;
          const liste = formes.get(materiau) ?? [];
          liste.push(enfant.geometry.clone().applyMatrix4(passage));
          formes.set(materiau, liste);
          retirer.push(enfant);
        } else if (enfant instanceof THREE.Line && !(enfant instanceof THREE.LineSegments)) {
          const materiau = enfant.material as THREE.Material;
          const liste = segments.get(materiau) ?? [];
          const position = enfant.geometry.getAttribute('position');
          const point = new THREE.Vector3();
          for (let i = 0; i < position.count - 1; i++) {
            for (const j of [i, i + 1]) {
              point.fromBufferAttribute(position, j).applyMatrix4(passage);
              liste.push(point.x, point.y, point.z);
            }
          }
          segments.set(materiau, liste);
          retirer.push(enfant);
        }
      }
    };
    visiter(groupe);

    for (const objet of retirer) objet.removeFromParent();
    for (const [materiau, liste] of formes) {
      const fusion = mergeGeometries(liste);
      for (const morceau of liste) morceau.dispose();
      if (!fusion) continue;
      groupe.add(new THREE.Mesh(this.suivre(fusion), materiau));
    }
    for (const [materiau, liste] of segments) {
      const geometrie = this.suivre(new THREE.BufferGeometry());
      geometrie.setAttribute('position', new THREE.Float32BufferAttribute(liste, 3));
      groupe.add(new THREE.LineSegments(geometrie, materiau));
    }
    for (const mobile of mobiles) this.fusionner(mobile);
  }

  liberer(): void {
    for (const geometrie of this.geometries) geometrie.dispose();
    for (const materiau of this.materiaux) materiau.dispose();
  }
}
