import { describe, expect, it } from 'vitest';
import { casesDuSac, casesPrises, nouveauJour, place, ranger } from './sac.ts';

describe('le sac à dos', () => {
  it('compte les cases : 10 objets d’une sorte par case, une lettre par case', () => {
    expect(casesPrises({ pomme: 10 })).toBe(1);
    expect(casesPrises({ pomme: 11 })).toBe(2);
    expect(casesPrises({ pomme: 3, lettre: 2 })).toBe(3);
    expect(casesPrises({})).toBe(0);
  });

  it('dit combien d’objets peuvent encore entrer', () => {
    expect(place({}, 'pomme')).toBe(80);
    expect(place({ pomme: 7 }, 'pomme')).toBe(3 + 7 * 10);
    expect(place({ a: 10, b: 10, c: 10, d: 10, e: 10, f: 10, g: 10, h: 4 }, 'h')).toBe(6);
    expect(place({ a: 10, b: 10, c: 10, d: 10, e: 10, f: 10, g: 10, h: 4 }, 'pomme')).toBe(0);
    expect(place({ a: 10, b: 10, c: 10, d: 10, e: 10, f: 10, g: 10 }, 'lettre')).toBe(1);
  });

  it('range ce qui rentre, et rend le reste', () => {
    const plein = { a: 10, b: 10, c: 10, d: 10, e: 10, f: 10, g: 10, pomme: 8 };
    const r = ranger(plein, 'pomme', 5);
    expect(r.sac.pomme).toBe(10);
    expect(r.reste).toBe(3);
    expect(ranger({}, 'mure', 4)).toEqual({ sac: { mure: 4 }, reste: 0 });
  });

  it('au nouveau jour : les objets de quête quittent le sac, le sol se vide', () => {
    const r = nouveauJour({ pomme: 3, colis: 1, crepes: 3, lettre: 2 }, [{ id: 'x', produit: 'pomme', nombre: 2, x: 0, z: 0, jour: '2026-11-20' }], '2026-11-21');
    expect(r.sac).toEqual({ pomme: 3 });
    expect(r.sol).toEqual([]);
  });

  it('montre les cases dans l’ordre', () => {
    expect(casesDuSac({ pomme: 12, lettre: 2 })).toEqual([
      ['pomme', 10],
      ['pomme', 2],
      ['lettre', 1],
      ['lettre', 1],
    ]);
  });
});
