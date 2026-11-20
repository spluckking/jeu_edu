import { describe, expect, it } from 'vitest';
import { curseur, ESPECES, poissonQuiMord, total, verifierRelache, zoneVerte, type Poisson } from './peche-canne.ts';

const p = (poids: number): Poisson => ({ espece: 'gardon', nom: 'un gardon', poids });

describe('la pêche à la canne', () => {
  it('un poisson a un poids de son espèce, en multiples de 5 g', () => {
    for (let i = 0; i < 200; i++) {
      const { espece, poids } = poissonQuiMord(Math.random);
      expect(poids % 5).toBe(0);
      expect(poids).toBeGreaterThanOrEqual(espece.min);
      expect(poids).toBeLessThanOrEqual(espece.max);
    }
  });

  it('les poissons rares mordent moins souvent', () => {
    let perches = 0;
    for (let i = 0; i < 2000; i++) if (poissonQuiMord(Math.random).espece.id === 'perche') perches++;
    expect(perches).toBeLessThan(2000 / ESPECES.length);
  });

  it('le total, et ce qu’il garde après avoir relâché', () => {
    const peche = [p(35), p(20), p(45), p(15)];
    expect(total(peche)).toBe(115);
    expect(verifierRelache(peche, new Set())).toEqual({ tropLourd: true, garde: 115 });
    expect(verifierRelache(peche, new Set([1]))).toEqual({ tropLourd: false, garde: 95 });
    expect(verifierRelache(peche, new Set([3]))).toEqual({ tropLourd: false, garde: 100 });
  });

  it('le curseur va et vient entre 0 et 1', () => {
    expect(curseur(0, 1)).toBe(0);
    expect(curseur(0.5, 1)).toBe(0.5);
    expect(curseur(1.25, 1)).toBe(0.75);
    expect(curseur(2, 1)).toBe(0);
  });

  it('la zone verte reste dans la jauge', () => {
    for (let i = 0; i < 100; i++) {
      const z = zoneVerte(0.26, Math.random);
      expect(z.debut).toBeGreaterThanOrEqual(0.08);
      expect(z.fin).toBeLessThanOrEqual(0.92);
    }
  });
});
