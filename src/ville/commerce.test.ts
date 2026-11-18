import { describe, expect, it } from 'vitest';
import { total } from './argent.ts';
import { acheter, cueillir, enlever, mettre, pommierDuJour, rachatsRestants, vendre } from './commerce.ts';

describe('pommier', () => {
  it('donne 3 pommes, puis repousse 2 jours après la dernière', () => {
    let p = { restantes: 3, repousse: null as string | null };
    for (let i = 0; i < 3; i++) p = cueillir(p, '2026-11-18') ?? p;
    expect(p).toEqual({ restantes: 0, repousse: '2026-11-20' });
    expect(cueillir(p, '2026-11-19')).toBeNull();
    expect(pommierDuJour(p, '2026-11-20')).toEqual({ restantes: 3, repousse: null });
    expect(cueillir(p, '2026-11-21')).toEqual({ restantes: 2, repousse: null });
  });
});

describe('panier', () => {
  it('met et enlève des produits', () => {
    const p = mettre(mettre({}, 'pomme'), 'pomme');
    expect(p).toEqual({ pomme: 2 });
    expect(enlever(p, 'pomme', 2)).toEqual({});
    expect(enlever(p, 'pain')).toBeNull();
  });
});

describe('épicerie', () => {
  it('rachète au plus 5 récoltes par jour', () => {
    expect(rachatsRestants({ jour: '2026-11-18', nombre: 4 }, '2026-11-18', 5)).toBe(1);
    expect(rachatsRestants({ jour: '2026-11-17', nombre: 5 }, '2026-11-18', 5)).toBe(5);
    const v = vendre({ pomme: 3 }, {}, { jour: '2026-11-18', nombre: 3 }, 'pomme', 100, '2026-11-18', 5);
    expect(v?.nombre).toBe(2);
    expect(v?.panier).toEqual({ pomme: 1 });
    expect(total(v?.porteMonnaie ?? {})).toBe(200);
    expect(v?.ventes).toEqual({ jour: '2026-11-18', nombre: 5 });
    expect(vendre({ pomme: 1 }, {}, v?.ventes ?? { jour: '', nombre: 0 }, 'pomme', 100, '2026-11-18', 5)).toBeNull();
  });

  it('un achat sort les pièces données et rentre la monnaie', () => {
    const r = acheter({}, { 500: 1, 100: 1 }, 'pain', [500], [200]);
    expect(r).toEqual({ panier: { pain: 1 }, porteMonnaie: { 100: 1, 200: 1 } });
    expect(acheter({}, { 100: 1 }, 'pain', [500], [])).toBeNull();
  });
});
