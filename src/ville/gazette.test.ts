import { describe, expect, it } from 'vitest';
import { dicteeNeuve } from '../dictee/etat.ts';
import { attractionNeuve, passerEpreuve } from './attraction.ts';
import L from '../../content/ville/lecons.json';
import { editionDuJour, gazetteNeuve, leconDuJour, lundiDe, questionnaire, quetesDuJour, remplir, type Aventure, type Monde } from './gazette.ts';

const monde = (m: Partial<Monde> = {}): Monde => ({
  jour: '2026-11-18',
  attraction: { ...attractionNeuve('grande-roue'), debut: '2026-11-16' },
  nomsAttractions: { 'grande-roue': 'La grande roue' },
  prenomsProposes: { 'grande-roue': ['Gustave', 'Firmin', 'Émile'] },
  dictee: { ...dicteeNeuve(), mots: [{ w: 'maison', phrase: '' }, { w: 'jardin', phrase: '' }] },
  motsDuJour: { mots: ['maison', 'jardin'], fini: false },
  annonces: ['L’épicière'],
  hasard: () => 0.3,
  ...m,
});

const aventure: Aventure = {
  titre: 'Le colis sans adresse',
  sousTitre: 'Chapitre 1 sur 5 : Un colis mystérieux',
  phrases: ['Un colis est arrivé.', 'Il fait toc, toc.'],
  questions: [
    { question: 'Qu’est-il arrivé ?', choix: ['un colis', 'un chat', 'un train'], indice: 'Un colis est arrivé.' },
    { question: 'Quel bruit ?', choix: ['toc, toc', 'miaou', 'tchou'], indice: 'Il fait toc, toc.' },
  ],
};

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

  it('les quêtes du jour : l’attraction et son étape, les mots du jour, les annonces', () => {
    const q = quetesDuJour(monde());
    expect(q.map((x) => [x.id, x.faite])).toEqual([
      ['attraction', false],
      ['mots', false],
      ['annonces', false],
    ]);
    expect(q[0]!.titre).toBe('La grande roue en construction');
    expect(q[0]!.phrases[0]).toContain('étape 1 sur 5');
    expect(q[1]!.titre).toBe('Les mots du jour');
    expect(q[1]!.phrases[0]).toContain('2 mots');
    expect(q[1]!.phrases[1]).toMatch(/« (maison|jardin) »/);
    expect(q[2]!.phrases).toEqual(['L’épicière a besoin de toi.']);
    expect(q[2]!.questions[0]!.choix[0]).toBe('L’épicière');
  });

  it('les mots du jour changent avec la mémoire, et sont faits quand la révision l’est', () => {
    const un = quetesDuJour(monde({ motsDuJour: { mots: ['jardin'], fini: true } })).find((x) => x.id === 'mots')!;
    expect(un.faite).toBe(true);
    expect(un.phrases[0]).toContain('1 mot t’attend');
    expect(un.questions.every((q) => q.choix.length === 3)).toBe(true);
    const rien = quetesDuJour(monde({ motsDuJour: { mots: [], fini: true } })).find((x) => x.id === 'mots')!;
    expect(rien.phrases[0]).toContain('Pas de mots');
    expect(rien.questions).toEqual([]);
  });

  it('l’attraction est faite quand le grand défi est réussi cette semaine', () => {
    let a = { ...attractionNeuve('grande-roue'), debut: '2026-11-16', prenoms: { 'grande-roue': 'Firmin' } };
    a = passerEpreuve(a, '2026-11-20', 3, 3, null);
    const q = quetesDuJour(monde({ jour: '2026-11-21', attraction: a }));
    expect(q[0]!.faite).toBe(true);
    expect(q[0]!.phrases.join(' ')).not.toContain('étape');
    expect(q[0]!.bilan[1]!.choix).toEqual(['Firmin', 'Gustave', 'Émile']);
    // La semaine suivante, plus de quête d'attraction (la suivante n'existe pas).
    expect(quetesDuJour(monde({ jour: '2026-11-24', attraction: a })).map((x) => x.id)).toEqual(['mots', 'annonces']);
  });

  it('le premier jour de la semaine : l’histoire, puis les quêtes ; tout fini : le bilan', () => {
    const quetes = quetesDuJour(monde());
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
    const e = editionDuJour(gazetteNeuve(), quetesDuJour(monde()), '2026-11-18', 'Zoé');
    const q = questionnaire(e, () => 0.5);
    expect(q).toHaveLength(3);
    if (e.type === 'histoire') expect(q.filter((x) => e.histoire.questions.includes(x)).length).toBeGreaterThanOrEqual(2);
  });

  it('la grande aventure : deux questions sur le chapitre, une sur les quêtes', () => {
    const lue = { ...gazetteNeuve(), premiere: '2026-11-16', histoiresLues: ['2026-11-16'] };
    const e = editionDuJour(lue, quetesDuJour(monde()), '2026-11-19', 'Zoé', aventure);
    expect(e.aventure?.titre).toBe('Le colis sans adresse');
    const q = questionnaire(e, () => 0.5);
    expect(q).toHaveLength(3);
    expect(q.filter((x) => aventure.questions.includes(x))).toHaveLength(2);
  });

  it('la fin de l’aventure : la question pour réfléchir d’abord, puis la morale', () => {
    const fin: Aventure = { ...aventure, sousTitre: 'La fin', questions: [{ question: 'Et toi ?', choix: ['ensemble', 'seul', 'jamais'], indice: null }], morale: 'Ensemble, on trouve.' };
    const lue = { ...gazetteNeuve(), premiere: '2026-11-16', histoiresLues: ['2026-11-16'] };
    const q = questionnaire(editionDuJour(lue, quetesDuJour(monde()), '2026-11-19', 'Zoé', fin), () => 0.5);
    expect(q[0]!.question).toBe('Et toi ?');
  });

  it('la leçon du jour : la même toute la journée, puis la moins récemment lue', () => {
    const un = leconDuJour({}, '2026-11-23')!;
    expect(un.id).toBe(L.lecons[0]!.id);
    expect(leconDuJour({ [un.id]: '2026-11-23' }, '2026-11-23')!.id).toBe(un.id);
    const deux = leconDuJour({ [un.id]: '2026-11-23' }, '2026-11-24')!;
    expect(deux.id).toBe(L.lecons[1]!.id);
    // Toutes lues : on recommence par la plus ancienne.
    const toutes = Object.fromEntries(L.lecons.map((c, i) => [c.id, `2026-11-${10 + i}`]));
    expect(leconDuJour(toutes, '2026-12-01')!.id).toBe(L.lecons[0]!.id);
  });

  it('chaque carte de leçon est bien formée', () => {
    for (const c of L.lecons) {
      expect(c.phrases.length).toBeGreaterThanOrEqual(2);
      for (const q of c.questions) {
        expect(new Set(q.choix).size).toBe(3);
        expect(c.phrases[q.indice - 1]).toBeTruthy();
      }
    }
  });

  it('le questionnaire pose une question sur la leçon du jour', () => {
    const lue = { ...gazetteNeuve(), premiere: '2026-11-16', histoiresLues: ['2026-11-16'] };
    const lecon = leconDuJour({}, '2026-11-19')!;
    const e = editionDuJour(lue, quetesDuJour(monde()), '2026-11-19', 'Zoé', aventure, lecon);
    const q = questionnaire(e, () => 0.5);
    expect(q).toHaveLength(3);
    expect(q.filter((x) => lecon.questions.includes(x))).toHaveLength(1);
    expect(q.filter((x) => aventure.questions.includes(x))).toHaveLength(2);
  });
});
