import { describe, expect, it } from 'vitest';
import { elementsFragiles, lisible, minutesParJour, bilanDepuis } from '../parent/bilan.ts';
import { etatNeuf } from '../memoire/moteur.ts';
import { lirePreparation, ordonner } from './preparation.ts';

describe('préparation reçue du rêve', () => {
  it('lit une préparation correcte', () => {
    const p = lirePreparation({ jour: '2026-11-16', resume: 'Bonne séance.', niveaux: { defis: 3 }, focus: ['x-6-7'], feuilleton: [] });
    expect(p).toMatchObject({ jour: '2026-11-16', niveaux: { defis: 3 }, focus: ['x-6-7'] });
  });

  it('refuse une préparation sans jour, et ignore les valeurs hors limites', () => {
    expect(lirePreparation({ resume: 'x' })).toBeNull();
    expect(lirePreparation('<script>')).toBeNull();
    const p = lirePreparation({ jour: '2026-11-16', niveaux: { defis: 9, peche: 2, autre: 3 }, focus: ['x-6-7', 42, '<b>'] });
    expect(p?.niveaux).toEqual({ peche: 2 });
    expect(p?.focus).toEqual(['x-6-7']);
  });

  it('le focus passe devant sans rien ajouter ni perdre', () => {
    expect(ordonner(['a', 'b', 'c', 'd'], ['c', 'z'])).toEqual(['c', 'a', 'b', 'd']);
  });
});

describe('bilan du parent', () => {
  it('compte les réponses par stand depuis un jour', () => {
    const e = (instant: string, stand: string, reussi: boolean) => ({
      instant,
      stand,
      manche: 'semaine' as const,
      element: 'x',
      reponse: '',
      reussi,
      aide: false,
      duree: 1,
    });
    const journal = [e('2026-11-10T10:00:00', 'chamboule', true), e('2026-11-16T10:00:00', 'chamboule', false), e('2026-11-16T10:01:00', 'chamboule', true)];
    expect(bilanDepuis(journal, '2026-11-15')).toEqual([{ stand: 'chamboule', reponses: 2, justes: 1, aides: 0 }]);
  });

  it('les éléments fragiles : deux échecs au moins, sangsue à quatre', () => {
    const etats = { 'x-6-7': { ...etatNeuf(), echecs: 5 }, 'x-3-4': { ...etatNeuf(), echecs: 1 }, 'm-école': { ...etatNeuf(), echecs: 2 } };
    expect(elementsFragiles(etats).map((f) => [f.id, f.sangsue])).toEqual([
      ['x-6-7', true],
      ['m-école', false],
    ]);
    expect(lisible('x-6-7')).toBe('6 × 7');
    expect(lisible('m-école')).toBe('école');
  });

  it('minutes de jeu par jour', () => {
    expect(minutesParJour({ '2026-11-16': { defis: 0, ticketsGagnes: 0, finie: false, lotChoisi: false, secondes: 610 } }, ['2026-11-15', '2026-11-16'])).toEqual([0, 10]);
  });
});

describe('les cadeaux des manèges proposés par le rêve', () => {
  it('garde les codes lisibles, ignore le reste', () => {
    const p = lirePreparation({ jour: '2026-11-18', recompenses: { autos: 'ballons-bleu', glaces: '<script>', trampoline: 7, cirque: 'coupe' } });
    expect(p?.recompenses).toEqual({ autos: 'ballons-bleu' });
    expect(lirePreparation({ jour: '2026-11-18' })?.recompenses).toBeUndefined();
  });
});
