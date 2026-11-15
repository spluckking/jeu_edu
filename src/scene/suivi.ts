// La caméra de promenade : à l'épaule, derrière le personnage. Elle revient d'elle-même dans son
// dos quand il avance, et se rapproche si un stand ou l'entrée se met entre eux.

import * as THREE from 'three';
import type { Obstacle } from './obstacles.ts';

export const DISTANCE = 5.2;
export const TANGAGE = 0.2;
const HAUTEUR = 1.9;
const TANGAGE_MIN = 0.05;
const TANGAGE_MAX = 1.0;

export class CameraSuivie {
  lacet = 0;
  tangage = TANGAGE;
  private distance = DISTANCE;
  /** Temps pendant lequel la caméra reste où l'enfant l'a tournée. */
  private tirage = 0;
  private readonly cible = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly rayon = new THREE.Ray();

  constructor(private readonly obstacles: Obstacle[]) {}

  tourner(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    this.lacet -= dx * 0.006;
    this.tangage = Math.min(TANGAGE_MAX, Math.max(TANGAGE_MIN, this.tangage + dy * 0.004));
    this.tirage = 1.5;
  }

  /** Avant et droite au sol, pour orienter le joystick par rapport à la caméra. */
  axes(): { avant: { x: number; z: number }; droite: { x: number; z: number } } {
    const avant = { x: -Math.sin(this.lacet), z: -Math.cos(this.lacet) };
    return { avant, droite: { x: -avant.z, z: avant.x } };
  }

  /** Place la caméra derrière ce cap (au départ, ou après un stand). */
  placerDerriere(cap: number): void {
    this.lacet = cap + Math.PI;
    this.tangage = TANGAGE;
    this.distance = DISTANCE;
  }

  /** Pose voulue de la caméra pour ce personnage (position, point visé). */
  pose(heros: THREE.Object3D, cap: number, enMarche: number, dt: number): { position: THREE.Vector3; cible: THREE.Vector3 } {
    this.tirage -= dt;
    if (enMarche > 0.02 && this.tirage <= 0) {
      let ecart = cap + Math.PI - this.lacet;
      ecart = Math.atan2(Math.sin(ecart), Math.cos(ecart));
      this.lacet += ecart * Math.min(1, dt * 1.6 * enMarche);
    }
    this.cible.set(heros.position.x, heros.position.y + HAUTEUR, heros.position.z);
    const cp = Math.cos(this.tangage);
    this.direction.set(Math.sin(this.lacet) * cp, Math.sin(this.tangage), Math.cos(this.lacet) * cp);
    this.rayon.set(this.cible, this.direction);
    let proche = DISTANCE;
    for (const o of this.obstacles) {
      const d = o.distanceRayon(this.rayon);
      if (d !== null) proche = Math.min(proche, d);
    }
    const voulue = Math.max(1.5, proche - 0.4);
    this.distance = voulue < this.distance ? voulue : this.distance + (voulue - this.distance) * Math.min(1, dt * 3);
    return {
      position: this.cible.clone().addScaledVector(this.direction, this.distance),
      cible: this.cible.clone().setY(this.cible.y + 0.2),
    };
  }
}
