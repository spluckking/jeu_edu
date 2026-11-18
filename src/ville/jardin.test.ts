import { describe, expect, it } from 'vitest';
import { arroser, etape, parcelleLibre, planter, recolter } from './jardin.ts';

const carotte = { id: 'graines-carotte', legume: 'carotte', jours: 3, recolte: 3 };

describe('potager', () => {
  it('pousse avec un arrosage par jour, puis se récolte', () => {
    let p = planter(parcelleLibre(), 'graines-carotte');
    expect(p && etape(p, carotte)).toBe('graine');
    p = p && arroser(p, carotte, '2026-11-18');
    expect(p && etape(p, carotte)).toBe('pousse');
    // Deux fois le même jour : non.
    expect(p && arroser(p, carotte, '2026-11-18')).toBeNull();
    // Un jour oublié ne fait rien perdre.
    p = p && arroser(p, carotte, '2026-11-20');
    p = p && arroser(p, carotte, '2026-11-21');
    expect(p && etape(p, carotte)).toBe('mure');
    expect(p && arroser(p, carotte, '2026-11-22')).toBeNull();
    expect(p && recolter(p, carotte)).toEqual({ parcelle: parcelleLibre(), legume: 'carotte', nombre: 3 });
  });

  it('on ne plante pas sur une parcelle occupée, on ne récolte pas trop tôt', () => {
    const p = planter(parcelleLibre(), 'graines-carotte');
    expect(p && planter(p, 'graines-tomate')).toBeNull();
    expect(p && recolter(p, carotte)).toBeNull();
    expect(etape(parcelleLibre(), carotte)).toBe('libre');
  });
});
