import { describe, expect, it } from 'vitest';
import { casiers, courrierDuJour, dansLOrdre, initiale, peutTrier, posteNeuve } from './poste.ts';

const NOMS = ['M. Arnaud', 'Mme Blanchard', 'M. Colin', 'Mme Dupont', 'M. Fabre', 'Mme Garnier', 'M. Lambert', 'Mme Moreau', 'M. Perrin', 'Mme Roux', 'M. Simon', 'Mme Élie'];

describe('poste', () => {
  it('la première lettre du nom de famille, sans accent', () => {
    expect(initiale('Mme Blanchard')).toBe('B');
    expect(initiale('Mme Élie')).toBe('E');
  });

  it('range dans l’ordre de l’alphabet, par nom de famille', () => {
    expect(dansLOrdre(['M. Simon', 'Mme Élie', 'M. Arnaud'])).toEqual(['M. Arnaud', 'Mme Élie', 'M. Simon']);
  });

  it('le courrier du jour : 5 noms aux initiales différentes, toujours les mêmes ce jour-là', () => {
    const c = courrierDuJour(NOMS, '2026-11-18');
    expect(c).toHaveLength(5);
    expect(new Set(c.map(initiale)).size).toBe(5);
    expect(courrierDuJour(NOMS, '2026-11-18')).toEqual(c);
    expect(courrierDuJour(NOMS, '2026-11-19')).not.toEqual(c);
  });

  it('les casiers : les initiales du courrier et une en trop, triés', () => {
    const c = courrierDuJour(NOMS, '2026-11-18');
    const k = casiers(c, '2026-11-18');
    expect(k).toHaveLength(6);
    expect(k).toEqual([...k].sort());
    for (const nom of c) expect(k).toContain(initiale(nom));
  });

  it('un tri par jour', () => {
    expect(peutTrier({ ...posteNeuve(), tri: '2026-11-18' }, '2026-11-18')).toBe(false);
    expect(peutTrier({ ...posteNeuve(), tri: '2026-11-18' }, '2026-11-19')).toBe(true);
  });
});
