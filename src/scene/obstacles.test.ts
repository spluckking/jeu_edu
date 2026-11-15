import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Obstacle } from './obstacles.ts';

/** Un stand de 4 × 4, tourné de 45°, centré en (10, 0, 0). */
function standDeBiais(): Obstacle {
  const zone = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4));
  const groupe = new THREE.Group();
  groupe.position.set(10, 0, 0);
  groupe.rotation.y = Math.PI / 4;
  groupe.add(zone);
  groupe.updateMatrixWorld(true);
  return Obstacle.depuisMaillage(zone, 0);
}

describe('obstacles orientés', () => {
  it('un stand de biais ne déborde pas dans ses coins', () => {
    const o = standDeBiais();
    // Le coin de la boîte alignée (12, 2) est hors du stand tourné.
    expect(o.enfoncement(12, 2, 0.4)).toBeLessThan(0);
    expect(o.enfoncement(10, 0, 0.4)).toBeGreaterThan(0);
  });

  it('dedans, chaque pas vers le bord réduit l’enfoncement : on ne reste jamais coincé', () => {
    const o = standDeBiais();
    const centre = o.enfoncement(10, 0, 0.4);
    const versLeBord = o.enfoncement(10.5, 0.5, 0.4);
    expect(versLeBord).toBeLessThan(centre);
  });

  it('la caméra bute sur le stand tourné', () => {
    const o = standDeBiais();
    const rayon = new THREE.Ray(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    const d = o.distanceRayon(rayon);
    expect(d).not.toBeNull();
    expect(d ?? 0).toBeCloseTo(10 - Math.SQRT2 * 2, 1);
  });
});
