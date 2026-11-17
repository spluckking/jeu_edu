// La caméra de promenade : haute et toujours dans le même axe, comme dans les jeux de vie
// « douillets ». Elle suit le personnage sans tourner, et quand il arrive devant un stand,
// elle descend se placer de trois quarts pour montrer le comptoir et le forain.

import * as THREE from 'three';

/** Distance, hauteur (angle) et champ de vision de la vue haute. */
export const DISTANCE = 18;
export const TANGAGE = 0.56;
export const CHAMP_HAUT = 34;
/** Champ de vision pendant le zoom sur un stand. */
export const CHAMP_STAND = 42;

/** Ce qu'il faut savoir d'un stand pour le cadrer : où l'on se tient, et vers où l'on regarde. */
export interface Cadrage {
  approche: THREE.Vector3;
  regard: number;
}

export class CameraHaute {
  /** 0 : vue haute ; 1 : zoom sur le stand. */
  zoom = 0;
  private stand: Cadrage | null = null;
  private readonly position = new THREE.Vector3();
  private readonly cible = new THREE.Vector3();
  private readonly zoomPos = new THREE.Vector3();
  private readonly zoomCible = new THREE.Vector3();

  /** Le joystick va toujours dans le sens de l'écran : vers le haut = vers le fond de la fête. */
  axes(): { avant: { x: number; z: number }; droite: { x: number; z: number } } {
    return { avant: { x: 0, z: -1 }, droite: { x: 1, z: 0 } };
  }

  /** Le stand à cadrer (ou aucun). */
  viser(stand: Cadrage | null): void {
    this.stand = stand;
  }

  /** Pose voulue pour ce personnage. Avec dt = 0, la pose est prise d'un coup. */
  pose(heros: THREE.Object3D, dt: number): { position: THREE.Vector3; cible: THREE.Vector3; champ: number } {
    const p = heros.position;
    const voulu = this.stand ? 1 : 0;
    this.zoom = dt <= 0 ? voulu : this.zoom + (voulu - this.zoom) * Math.min(1, dt * 2.5);
    this.position.set(p.x, 0.8 + Math.sin(TANGAGE) * DISTANCE, p.z + Math.cos(TANGAGE) * DISTANCE);
    // Sur l'allée d'arrivée, on regarde plus loin devant : la grande porte reste dans l'image.
    const avance = 1.2 + Math.min(1, Math.max(0, (p.z - 11) / 8)) * 4.2;
    this.cible.set(p.x, 0.8 + (avance - 1.2) * 0.3, p.z - avance);
    if (this.stand && this.zoom > 0.001) {
      // Le comptoir est devant l'approche ; la caméra se met en retrait, en hauteur et sur le côté.
      const sx = Math.sin(this.stand.regard);
      const sz = Math.cos(this.stand.regard);
      const a = this.stand.approche;
      this.zoomCible.set(a.x + sx * 2.2, 1.3, a.z + sz * 2.2);
      this.zoomPos.set(a.x - sx * 6 + sz * 2.6, 4.6, a.z - sz * 6 - sx * 2.6);
      const u = this.zoom * this.zoom * (3 - 2 * this.zoom);
      this.position.lerp(this.zoomPos, u);
      this.cible.lerp(this.zoomCible, u);
    }
    return { position: this.position.clone(), cible: this.cible.clone(), champ: CHAMP_HAUT + (CHAMP_STAND - CHAMP_HAUT) * this.zoom };
  }
}
