import { describe, expect, it } from 'vitest';
import { courbe, dansLEau, dansLEtang, distanceA, ETANG, LIEUX, occupe, surLePont, surUnChemin } from './monde.ts';

describe('le plan de la ville', () => {
  it('la courbe passe par tous les points', () => {
    const c = courbe([
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 10 },
    ]);
    for (const p of [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }]) expect(distanceA(c, p.x, p.z)).toBeLessThan(0.01);
  });

  it('on ne marche pas dans l’eau, sauf sur le pont', () => {
    expect(surLePont(LIEUX.pont.x, LIEUX.pont.z)).toBe(true);
    expect(dansLEau(LIEUX.pont.x, LIEUX.pont.z)).toBe(false);
    expect(dansLEau(LIEUX.pont.x, LIEUX.pont.z + 6)).toBe(true);
    expect(dansLEtang(ETANG.x, ETANG.z)).toBe(true);
    expect(dansLEau(0, 0)).toBe(false);
  });

  it('la route de la fête part de la place et arrive au portail, en passant le pont', () => {
    expect(surUnChemin(LIEUX.portailFete.x, LIEUX.portailFete.z)).toBe(true);
    expect(surUnChemin(LIEUX.pont.x, LIEUX.pont.z)).toBe(true);
  });

  it('rien ne pousse sur la place, les chemins ni dans l’eau', () => {
    expect(occupe(0, 0, [])).toBe(true);
    expect(occupe(LIEUX.pont.x, LIEUX.pont.z, [])).toBe(true);
    expect(occupe(-70, -40, [])).toBe(false);
    expect(occupe(-70, -40, [{ x: -70, z: -40, r: 3 }])).toBe(true);
  });

  it('les lieux ne sont pas dans l’eau', () => {
    for (const l of Object.values(LIEUX)) if (l !== LIEUX.pont && l !== LIEUX.ponton) expect(dansLEau(l.x, l.z)).toBe(false);
  });
});
