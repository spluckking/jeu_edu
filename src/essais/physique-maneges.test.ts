import { describe, expect, it } from 'vitest';
import { balancer, dansLeVert, ecartAngle, hauteurSaut, PENDULE_MAX, pousser, rouler, sommets, tourner, WAGON, type Pendule } from './physique-maneges.ts';

describe('la physique des manèges', () => {
  it('le bateau, poussé au bon moment, monte de plus en plus haut', () => {
    let p: Pendule = { angle: 0.25, vitesse: 0 };
    let max = 0;
    for (let i = 0; i < 60 * 30; i++) {
      p = balancer(p, 1 / 60);
      if (Math.abs(p.vitesse) < 0.3 && Math.abs(p.angle) > 0.1) p = pousser(p).pendule;
      if (i > 60 * 25) max = Math.max(max, Math.abs(p.angle));
    }
    expect(max).toBeGreaterThan(1.2);
    expect(max).toBeLessThanOrEqual(PENDULE_MAX);
  });

  it('le bateau laissé seul ralentit', () => {
    let p: Pendule = { angle: 1, vitesse: 0 };
    for (let i = 0; i < 60 * 30; i++) p = balancer(p, 1 / 60);
    expect(Math.abs(p.angle)).toBeLessThan(1);
  });

  it('pousser au milieu ne compte pas', () => {
    expect(pousser({ angle: 0.01, vitesse: 2 }).bonMoment).toBe(false);
    expect(pousser({ angle: 0.9, vitesse: 0.1 }).bonMoment).toBe(true);
  });

  it('la tasse suit le doigt, puis ralentit', () => {
    expect(ecartAngle(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    let w = 0;
    for (let i = 0; i < 60; i++) w = tourner(w, 1 / 60, 6);
    expect(dansLeVert(w)).toBe(true);
    for (let i = 0; i < 60 * 5; i++) w = tourner(w, 1 / 60, null);
    expect(dansLeVert(w)).toBe(false);
  });

  it('le wagon ne s’arrête jamais, et freiner fait sauter moins haut', () => {
    let v = 300;
    for (let x = 0; x < 5000; x += 5) {
      v = rouler(v, x, 1 / 60, true);
      expect(v).toBeGreaterThan(0);
    }
    expect(hauteurSaut(WAGON.min)).toBe(0);
    expect(hauteurSaut(400)).toBeGreaterThan(hauteurSaut(250));
    expect(sommets(0, 3000).length).toBeGreaterThan(3);
  });
});
