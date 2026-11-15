// Les obstacles de la promenade. Un stand tourné garde sa vraie forme (une boîte orientée) :
// une boîte alignée sur les axes autour d'un stand de biais déborde sur son devant, et le
// personnage pouvait s'y retrouver enfermé en sortant du stand.

import * as THREE from 'three';

export class Obstacle {
  private readonly local = new THREE.Vector3();
  private readonly rayonLocal = new THREE.Ray();

  private constructor(
    /** Du monde vers le repère de l'obstacle (déplacement et rotation seulement). */
    private readonly inverse: THREE.Matrix4,
    private readonly versMonde: THREE.Matrix4,
    private readonly boite: THREE.Box3,
  ) {}

  /** La boîte d'un maillage (la zone invisible d'un stand), dans son propre repère, élargie d'une marge. */
  static depuisMaillage(maillage: THREE.Mesh, marge: number): Obstacle {
    maillage.updateWorldMatrix(true, false);
    maillage.geometry.computeBoundingBox();
    const boite = (maillage.geometry.boundingBox ?? new THREE.Box3()).clone().expandByScalar(marge);
    return new Obstacle(maillage.matrixWorld.clone().invert(), maillage.matrixWorld.clone(), boite);
  }

  /** Une boîte déjà alignée sur les axes du monde (décor, entrée). */
  static boite(b: THREE.Box3): Obstacle {
    return new Obstacle(new THREE.Matrix4(), new THREE.Matrix4(), b.clone());
  }

  /**
   * De combien un personnage de ce rayon, en (x, z), s'enfonce dans l'obstacle. Positif : il
   * touche. À l'intérieur, la valeur grandit avec la profondeur : tout pas vers le bord la fait baisser.
   */
  enfoncement(x: number, z: number, rayon: number): number {
    const b = this.boite;
    const p = this.local.set(x, 0, z).applyMatrix4(this.inverse);
    const dedansX = p.x > b.min.x && p.x < b.max.x;
    const dedansZ = p.z > b.min.z && p.z < b.max.z;
    if (dedansX && dedansZ) {
      const profondeur = Math.min(p.x - b.min.x, b.max.x - p.x, p.z - b.min.z, b.max.z - p.z);
      return rayon + profondeur;
    }
    const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x);
    const dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z);
    return rayon - Math.hypot(dx, dz);
  }

  /** Distance le long du rayon jusqu'à l'obstacle (null : rien), si le départ est hors de lui. */
  distanceRayon(rayon: THREE.Ray): number | null {
    this.rayonLocal.copy(rayon).applyMatrix4(this.inverse);
    if (this.boite.containsPoint(this.rayonLocal.origin)) return null;
    const point = this.rayonLocal.intersectBox(this.boite, this.local);
    if (!point) return null;
    return point.applyMatrix4(this.versMonde).distanceTo(rayon.origin);
  }
}
