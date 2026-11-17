import { describe, expect, it } from 'vitest';
import { migrer, sauvegardeNeuve, VERSION } from './format.ts';

describe('migrations de la sauvegarde', () => {
  it('une tablette sans sauvegarde démarre avec une sauvegarde neuve', () => {
    expect(migrer(undefined)).toEqual(sauvegardeNeuve());
  });

  it('une sauvegarde à jour est gardée telle quelle', () => {
    const sauvegarde = { ...sauvegardeNeuve(), arrivees: { essai: '2026-11-14' } };
    expect(migrer(structuredClone(sauvegarde))).toEqual(sauvegarde);
  });

  it('une sauvegarde de version 3 garde ses tickets et reçoit le niveau de l’horloge', () => {
    const { niveauHorloge: _, niveauPeche: __, reglages: ___, validations: ____, listesRapides: _____, synchro: ______, ...v3 } = {
      ...sauvegardeNeuve(),
      version: 3,
      tickets: 12,
      roue: 2,
    };
    expect(migrer(v3)).toEqual({ ...sauvegardeNeuve(), tickets: 12, roue: 2 });
  });

  it('une sauvegarde de version 2 garde prénoms et lectures, et démarre sans ticket', () => {
    const v2 = { version: 2, arrivees: {}, etats: {}, journal: [], forains: { chamboule: 'Léon' }, lectures: {} };
    expect(migrer(v2)).toEqual({ ...sauvegardeNeuve(), forains: { chamboule: 'Léon' } });
  });

  it('une sauvegarde de version 1 garde sa progression et reçoit les prénoms et lectures', () => {
    const v1 = { version: 1, arrivees: { essai: '2026-11-14' }, etats: {}, journal: [] };
    expect(migrer(v1)).toEqual({ ...sauvegardeNeuve(), arrivees: { essai: '2026-11-14' } });
  });

  it("refuse une version inconnue plutôt que de l'écraser", () => {
    expect(() => migrer({ version: VERSION + 1 })).toThrow();
  });
});

describe('migration 6 → 7', () => {
  it('les tenues et maillots gagnés deviennent des accessoires', () => {
    const v6 = { ...sauvegardeNeuve(), version: 6, garderobe: { possedes: ['tenue-casquette', 'maillot-rouge', 'tenue-bonnet'], porte: { tenue: 'tenue-bonnet', maillot: 'maillot-rouge' } } };
    const s = migrer(v6);
    expect(s.version).toBe(VERSION);
    expect(s.garderobe.possedes).toEqual(expect.arrayContaining(['chapeau-bonnet', 'objet-sucette', 'haut-corail']));
    expect(s.garderobe.porte.chapeau).toBe('chapeau-bonnet');
  });
});

describe('migration 7 → 8', () => {
  it('les jetons de manège arrivent à zéro, et rien d’autre ne change', () => {
    const { jetons: _j, maneges: _m, ...ancienne } = sauvegardeNeuve();
    const v7 = { ...ancienne, version: 7, tickets: 42, roue: 3 };
    const s = migrer(v7);
    expect(s.version).toBe(8);
    expect(s.jetons).toBe(0);
    expect(s.maneges.compte).toEqual({ autos: 0, trampoline: 0, glaces: 0 });
    expect(s.tickets).toBe(42);
    expect(s.roue).toBe(3);
  });
});
