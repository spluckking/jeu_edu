import { describe, expect, it } from 'vitest';
import { chances, difficulteDuMot, ficheNeuve, motsDuJour, MOTS_PAR_JOUR, noterEssai, recuperabilite, reviser, rythme, suPourToujours, type Essai, type FicheMot } from './memoire.ts';

const essai = (jour: string, juste: boolean, note: Essai['note'], ms = 4000): Essai => ({ jour, note, juste, ms, lettres: 6, indice: false, hesite: false, juge: 'enfant' });

describe('la mémoire des mots (modèle FSRS)', () => {
  it('un mot long avec des pièges est plus difficile qu’un mot court sans piège', () => {
    expect(difficulteDuMot('chat')).toBeLessThan(difficulteDuMot('une addition'));
    expect(difficulteDuMot('chat')).toBeGreaterThanOrEqual(1);
    expect(difficulteDuMot('anticonstitutionnellement')).toBeLessThanOrEqual(10);
  });

  it('les chances de réussite valent 90 % quand le temps écoulé égale la stabilité', () => {
    expect(recuperabilite(5, 5)).toBeCloseTo(0.9, 5);
    expect(recuperabilite(5, 0)).toBe(1);
    expect(recuperabilite(5, 30)).toBeLessThan(0.7);
  });

  it('une réussite fait grandir la stabilité, une erreur la fait retomber', () => {
    let f = reviser(ficheNeuve('maison'), essai('2026-11-02', true, 3));
    const s1 = f.s;
    f = reviser(f, essai('2026-11-05', true, 3));
    expect(f.s).toBeGreaterThan(s1);
    const avant = f.s;
    f = reviser(f, essai('2026-11-12', false, 1));
    expect(f.s).toBeLessThan(avant);
    expect(f.echecs).toBe(1);
  });

  it('un mot difficile gagne moins de stabilité qu’un mot facile', () => {
    const facile: FicheMot = { ...ficheNeuve('chat'), d: 2, s: 3, dernier: '2026-11-01' };
    const dur: FicheMot = { ...facile, d: 9 };
    expect(reviser(facile, essai('2026-11-04', true, 3)).s).toBeGreaterThan(reviser(dur, essai('2026-11-04', true, 3)).s);
  });

  it('un deuxième essai réussi le même jour ne change pas la mémoire', () => {
    const f = reviser(ficheNeuve('maison'), essai('2026-11-02', true, 3));
    const g = reviser(f, essai('2026-11-02', true, 4));
    expect(g.s).toBe(f.s);
    expect(g.essais).toHaveLength(2);
  });

  it('la note tient compte de l’aide et de la vitesse par rapport à son rythme', () => {
    const base = { juste: true, indice: false, hesite: false, lettres: 5 };
    expect(noterEssai({ ...base, juste: false, ms: 1000 }, 800)).toBe(1);
    expect(noterEssai({ ...base, indice: true, ms: 1000 }, 800)).toBe(2);
    expect(noterEssai({ ...base, ms: 5 * 800 * 2 }, 800)).toBe(2);
    expect(noterEssai({ ...base, ms: 5 * 800 }, 800)).toBe(3);
    expect(noterEssai({ ...base, ms: 5 * 800 * 0.5 }, 800)).toBe(4);
    expect(noterEssai({ ...base, ms: 4000 }, null)).toBe(3);
  });

  it('le rythme habituel est la médiane des temps par lettre des essais justes', () => {
    const f: FicheMot = { ...ficheNeuve('maison'), essais: [1, 2, 3, 4, 5].map((k) => ({ ...essai('2026-11-02', true, 3), ms: k * 600 })) };
    expect(rythme({ maison: f })).toBe(300);
    expect(rythme({})).toBeNull();
  });

  it('le premier jour d’une liste, tous les mots ; ensuite, seulement les fragiles', () => {
    const semaine = ['maison', 'jardin', 'chapeau', 'bateau', 'girafe'];
    expect(motsDuJour({ semaine, anciens: [], fiches: {}, jour: '2026-11-02', joursAvantDictee: 4 })).toEqual(semaine);
    const fiches: Record<string, FicheMot> = {};
    for (const m of semaine) fiches[m] = { ...ficheNeuve(m), s: 20, dernier: '2026-11-02' };
    fiches.bateau = { ...ficheNeuve('bateau'), s: 0.5, dernier: '2026-11-02' };
    const jour = motsDuJour({ semaine, anciens: [], fiches, jour: '2026-11-03', joursAvantDictee: 3 });
    expect(jour[0]).toBe('bateau');
    expect(jour).toHaveLength(3);
  });

  it('jamais plus de 8 mots par jour, même le premier jour : les autres arrivent le lendemain', () => {
    const semaine = Array.from({ length: 12 }, (_, i) => 'mot' + String(i));
    const premier = motsDuJour({ semaine, anciens: [], fiches: {}, jour: '2026-11-02', joursAvantDictee: 4 });
    expect(premier).toEqual(semaine.slice(0, MOTS_PAR_JOUR));
    const fiches: Record<string, FicheMot> = {};
    for (const m of premier) fiches[m] = { ...ficheNeuve(m), s: 0.6, dernier: '2026-11-02' };
    const second = motsDuJour({ semaine, anciens: [], fiches, jour: '2026-11-03', joursAvantDictee: 3 });
    expect(second).toHaveLength(MOTS_PAR_JOUR);
    expect(second.slice(0, 4).sort()).toEqual(semaine.slice(8).sort());
  });

  it('un mot raté la veille revient, et les mots prioritaires du rêve passent devant', () => {
    const semaine = ['maison', 'jardin', 'chapeau', 'bateau'];
    const fiches: Record<string, FicheMot> = {};
    for (const m of semaine) fiches[m] = { ...ficheNeuve(m), s: 30, dernier: '2026-11-02' };
    fiches.jardin = { ...fiches.jardin!, essais: [essai('2026-11-02', false, 1)] };
    const jour = motsDuJour({ semaine, anciens: [], fiches, jour: '2026-11-03', joursAvantDictee: 3, prioritaires: ['chapeau'] });
    expect(jour.slice(0, 2)).toEqual(['chapeau', 'jardin']);
  });

  it('juste avant la dictée, le seuil monte : plus de mots reviennent', () => {
    const semaine = ['maison', 'jardin', 'chapeau', 'bateau', 'girafe', 'tambour'];
    const fiches: Record<string, FicheMot> = {};
    // R ≈ 0,93 le jour d'après : sous 95 %, au-dessus de 90 %.
    for (const m of semaine) fiches[m] = { ...ficheNeuve(m), s: 1.4, dernier: '2026-11-02' };
    expect(chances(fiches.maison!, '2026-11-03')).toBeGreaterThan(0.9);
    expect(motsDuJour({ semaine, anciens: [], fiches, jour: '2026-11-03', joursAvantDictee: 4 })).toHaveLength(3);
    expect(motsDuJour({ semaine, anciens: [], fiches, jour: '2026-11-03', joursAvantDictee: 1 })).toHaveLength(6);
  });

  it('un mot est su pour toujours quand il est très stable et ses 4 derniers essais sont justes', () => {
    const f: FicheMot = { ...ficheNeuve('chat'), s: 150, essais: [1, 2, 3, 4].map(() => essai('2026-11-02', true, 3)) };
    expect(suPourToujours(f)).toBe(true);
    expect(suPourToujours({ ...f, s: 30 })).toBe(false);
  });
});
