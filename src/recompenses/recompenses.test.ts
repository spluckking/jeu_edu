import { describe, expect, it } from 'vitest';
import { choisirLot, garderobeNeuve, LOTS, peutConstruire, porter, PRIX_PIECE, PIECES_ROUE, semaineDe } from './recompenses.ts';

describe('lots', () => {
  it('un lot choisi est possédé et porté', () => {
    const g = choisirLot(garderobeNeuve(), 'tenue-couronne');
    expect(g.possedes).toContain('tenue-couronne');
    expect(g.porte.tenue).toBe('tenue-couronne');
    expect(g.porte.maillot).toBe('maillot-rouge');
  });

  it('on ne porte qu’un lot possédé', () => {
    const g = garderobeNeuve();
    expect(porter(g, 'maillot-vert')).toEqual(g);
    const avec = choisirLot(g, 'maillot-vert');
    expect(porter(porter(avec, 'maillot-rouge'), 'maillot-vert').porte.maillot).toBe('maillot-vert');
  });

  it('les identifiants de lots sont uniques', () => {
    expect(new Set(LOTS.map((l) => l.id)).size).toBe(LOTS.length);
  });
});

describe('grande roue', () => {
  it('une pièce coûte 8 tickets et la roue s’arrête à 10 pièces', () => {
    expect(peutConstruire(PRIX_PIECE - 1, 0)).toBe(false);
    expect(peutConstruire(PRIX_PIECE, 0)).toBe(true);
    expect(peutConstruire(100, PIECES_ROUE)).toBe(false);
  });
});

describe('calendrier', () => {
  it('la semaine va du lundi au dimanche', () => {
    // Le 15 novembre 2026 est un dimanche.
    expect(semaineDe('2026-11-15')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(semaineDe('2026-11-16')[0]).toBe('2026-11-16');
  });
});
