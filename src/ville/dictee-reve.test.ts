import { describe, expect, it } from 'vitest';
import { lireRetourDictee } from './dictee-reve.ts';

describe('le retour du rêve pour la dictée', () => {
  it('lit les mots prioritaires et les lectures, ignore le reste', () => {
    const r = lireRetourDictee({
      jour: '2026-11-21',
      dictee: { prioritaires: ['bateau', 3], lectures: [{ id: 'a', mot: 'bateau', juste: false, lu: 'batô' }, { id: 'b', mot: 'x' }] },
    });
    expect(r).toEqual({ jour: '2026-11-21', prioritaires: ['bateau'], lectures: [{ id: 'a', mot: 'bateau', juste: false, lu: 'batô' }] });
  });
  it('rien pour la dictée : null', () => {
    expect(lireRetourDictee({ jour: '2026-11-21' })).toBeNull();
    expect(lireRetourDictee(null)).toBeNull();
  });
});
