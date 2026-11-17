import { describe, expect, it } from 'vitest';
import { LOTS_DES_MANEGES } from '../detente/objectifs.ts';
import { accesManege, LOTS_VITRINE, choisirLot, PRIX_MANEGE, convertirGarderobe, garderobeNeuve, LOTS, peutConstruire, porter, PRIX_PIECE, PIECES_ROUE, retirer, semaineDe } from './recompenses.ts';

describe('lots', () => {
  it('un lot choisi est possédé et porté', () => {
    const g = choisirLot(garderobeNeuve(), 'chapeau-couronne');
    expect(g.possedes).toContain('chapeau-couronne');
    expect(g.porte.chapeau).toBe('chapeau-couronne');
    expect(g.porte.haut).toBe('haut-corail');
  });

  it('on ne porte qu’un lot possédé, et on peut tout enlever', () => {
    const g = garderobeNeuve();
    expect(porter(g, 'haut-menthe')).toEqual(g);
    const avec = choisirLot(g, 'haut-menthe');
    expect(porter(porter(avec, 'haut-corail'), 'haut-menthe').porte.haut).toBe('haut-menthe');
    expect(retirer(avec, 'chapeau').porte.chapeau).toBe('rien');
  });

  it('les anciens lots deviennent des accessoires, sans rien perdre', () => {
    const g = convertirGarderobe({ possedes: ['tenue-casquette', 'maillot-rouge', 'tenue-couronne', 'maillot-vert'], porte: { tenue: 'tenue-couronne', maillot: 'maillot-vert' } });
    expect(g.possedes).toEqual(expect.arrayContaining(['chapeau-couronne', 'objet-baguette', 'haut-menthe', 'haut-corail', 'chapeau-casquette']));
    expect(g.porte.chapeau).toBe('chapeau-couronne');
    expect(g.porte.haut).toBe('haut-menthe');
    expect(convertirGarderobe(undefined)).toEqual(garderobeNeuve());
  });

  it('chaque lot de départ existe', () => {
    for (const id of garderobeNeuve().possedes) expect(LOTS.some((l) => l.id === id)).toBe(true);
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

describe('manèges', () => {
  it('en tickets avant la fin de la séance, gratuits ensuite', () => {
    expect(accesManege(PRIX_MANEGE - 1, false)).toBe('manque');
    expect(accesManege(PRIX_MANEGE, false)).toBe('payant');
    expect(accesManege(0, true)).toBe('gratuit');
  });
});

describe('les lots des manèges', () => {
  it('existent, et ne sont jamais dans la vitrine', () => {
    for (const id of Object.values(LOTS_DES_MANEGES).flat()) {
      expect(LOTS.find((l) => l.id === id)?.manege).toBe(true);
      expect(LOTS_VITRINE.some((l) => l.id === id)).toBe(false);
    }
    expect(LOTS_VITRINE.length).toBe(LOTS.length - 6);
  });
});
