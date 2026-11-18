import { describe, expect, it } from 'vitest';
import { addition, buissonsCharges, cueillirBuisson, muresParBuisson, pecheDuJour, peutPecher, riviereNeuve } from './riviere.ts';

describe('rivière et bois', () => {
  it('une pêche par jour, avec des groupes de 2 à 5', () => {
    const e = { ...riviereNeuve(), peche: '2026-11-18' };
    expect(peutPecher(e, '2026-11-18')).toBe(false);
    expect(peutPecher(e, '2026-11-19')).toBe(true);
    for (const jour of ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']) {
      const p = pecheDuJour(jour);
      expect(p.seaux).toBeGreaterThanOrEqual(2);
      expect(p.seaux).toBeLessThanOrEqual(4);
      expect([2, 3, 4, 5]).toContain(p.parSeau);
      expect([2, 3, 4, 5]).toContain(muresParBuisson(jour));
    }
    // La taille des groupes change d'un jour à l'autre.
    expect(muresParBuisson('2026-11-18')).not.toBe(muresParBuisson('2026-11-19'));
  });

  it('chaque buisson se cueille une fois par jour, puis repousse', () => {
    let e = riviereNeuve();
    e = cueillirBuisson(e, 1, '2026-11-18') ?? e;
    expect(buissonsCharges(e, '2026-11-18')).toEqual([0, 2]);
    expect(cueillirBuisson(e, 1, '2026-11-18')).toBeNull();
    expect(buissonsCharges(e, '2026-11-19')).toEqual([0, 1, 2]);
  });

  it('écrit l’addition répétée', () => {
    expect(addition(3, 4)).toBe('4 + 4 + 4 = 12');
  });
});
