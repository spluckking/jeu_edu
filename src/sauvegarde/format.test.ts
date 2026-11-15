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

  it('une sauvegarde de version 1 garde sa progression et reçoit les prénoms et lectures', () => {
    const v1 = { version: 1, arrivees: { essai: '2026-11-14' }, etats: {}, journal: [] };
    expect(migrer(v1)).toEqual({ ...sauvegardeNeuve(), arrivees: { essai: '2026-11-14' } });
  });

  it("refuse une version inconnue plutôt que de l'écraser", () => {
    expect(() => migrer({ version: VERSION + 1 })).toThrow();
  });
});
