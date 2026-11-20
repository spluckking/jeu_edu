import { describe, expect, it } from 'vitest';
import { dicteeNeuve } from '../dictee/etat.ts';
import { attractionNeuve, passerEpreuve } from './attraction.ts';
import { editionDuJour, gazetteNeuve, lundiDe, questionnaire, quetesDeLaSemaine, remplir, type Monde } from './gazette.ts';

const monde = (m: Partial<Monde> = {}): Monde => ({
  jour: '2026-11-18',
  attraction: { ...attractionNeuve('grande-roue'), debut: '2026-11-16' },
  nomsAttractions: { 'grande-roue': 'La grande roue' },
  prenomsProposes: { 'grande-roue': ['Gustave', 'Firmin', 'Émile'] },
  dictee: { ...dicteeNeuve(), mots: [{ w: 'maison', phrase: '' }, { w: 'jardin', phrase: '' }] },
  hasard: () => 0.3,
  ...m,
});

describe('la Gazette', () => {
  it('trouve le lundi de la semaine', () => {
    expect(lundiDe('2026-11-20')).toBe('2026-11-16');
    expect(lundiDe('2026-11-16')).toBe('2026-11-16');
    expect(lundiDe('2026-11-22')).toBe('2026-11-16');
  });

  it('remplit les textes, avec une majuscule au début', () => {
    expect(remplir('{attraction} monte', { attraction: 'la grande roue' })).toBe('La grande roue monte');
    expect(remplir('{n+3}', { n: 12 })).toBe('15');
  });

  it('les quêtes de la semaine : l’attraction et les mots, pas encore finies', () => {
    const q = quetesDeLaSemaine(monde());
    expect(q.map((x) => [x.id, x.faite])).toEqual([
      ['attraction', false],
      ['mots', false],
    ]);
    expect(q[0]!.titre).toBe('La grande roue en construction');
    expect(q[1]!.phrases[0]).toContain('2 mots');
  });

  it('l’attraction est faite quand le grand défi est réussi cette semaine', () => {
    let a = { ...attractionNeuve('grande-roue'), debut: '2026-11-16', prenoms: { 'grande-roue': 'Firmin' } };
    a = passerEpreuve(a, '2026-11-20', 3, 3, null);
    const q = quetesDeLaSemaine(monde({ jour: '2026-11-21', attraction: a }));
    expect(q[0]!.faite).toBe(true);
    expect(q[0]!.bilan[1]!.choix[0]).toBe('Firmin');
    expect(q[0]!.bilan[1]!.choix).toEqual(['Firmin', 'Gustave', 'Émile']);
    // La semaine suivante, plus de quête d'attraction (la suivante n'existe pas).
    expect(quetesDeLaSemaine(monde({ jour: '2026-11-24', attraction: a })).map((x) => x.id)).toEqual(['mots']);
  });

  it('les mots sont faits quand le concours d’écriture est passé cette semaine', () => {
    const dictee = { ...dicteeNeuve(), mots: [{ w: 'maison', phrase: '' }], concours: [{ date: '2026-11-19', justes: 1, total: 1, rates: [] }] };
    const q = quetesDeLaSemaine(monde({ dictee }));
    expect(q.find((x) => x.id === 'mots')!.faite).toBe(true);
    expect(q.find((x) => x.id === 'mots')!.bilan[1]!.choix[0]).toBe('Maison');
  });

  it('le premier jour de la semaine : l’histoire, puis les quêtes ; tout fini : le bilan', () => {
    const quetes = quetesDeLaSemaine(monde());
    const e = editionDuJour(gazetteNeuve(), quetes, '2026-11-18', 'Zoé');
    expect(e.type).toBe('histoire');
    if (e.type === 'histoire') expect(e.histoire.phrases[0]).toContain('Zoé');
    const lue = { ...gazetteNeuve(), premiere: '2026-11-16', histoiresLues: ['2026-11-16'] };
    expect(editionDuJour(lue, quetes, '2026-11-19', 'Zoé').type).toBe('quetes');
    const sansPrenom = editionDuJour(gazetteNeuve(), quetes, '2026-11-18', '');
    if (sansPrenom.type === 'histoire') expect(sansPrenom.histoire.phrases[0]).toContain('c’est toi !');
    expect(editionDuJour(lue, quetes.map((q) => ({ ...q, faite: true })), '2026-11-20', 'Zoé').type).toBe('bilan');
  });

  it('trois questions, dont au moins deux sur l’histoire', () => {
    const e = editionDuJour(gazetteNeuve(), quetesDeLaSemaine(monde()), '2026-11-18', 'Zoé');
    const q = questionnaire(e, () => 0.5);
    expect(q).toHaveLength(3);
    if (e.type === 'histoire') expect(q.filter((x) => e.histoire.questions.includes(x)).length).toBeGreaterThanOrEqual(2);
  });
});
