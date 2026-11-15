import { describe, expect, it } from 'vitest';
import { comparer } from './orthographe.ts';

const fausses = (lettres: { lettre: string; ok: boolean }[]): string =>
  lettres.map((l) => (l.ok ? l.lettre : `[${l.lettre}]`)).join('');

describe('comparaison lettre à lettre', () => {
  it('un mot juste, même avec une majuscule ou une apostrophe courbe', () => {
    expect(comparer('Maison', 'maison').juste).toBe(true);
    expect(comparer('aujourd’hui', "aujourd'hui").juste).toBe(true);
  });

  it('un accent faux est une erreur, à sa place', () => {
    const c = comparer('ecole', 'école');
    expect(c.juste).toBe(false);
    expect(fausses(c.attendu)).toBe('[é]cole');
    expect(fausses(c.ecrit)).toBe('[e]cole');
  });

  it('une lettre oubliée est montrée dans le mot attendu', () => {
    const c = comparer('beaucou', 'beaucoup');
    expect(fausses(c.attendu)).toBe('beaucou[p]');
    expect(fausses(c.ecrit)).toBe('beaucou');
  });

  it('une lettre en trop est montrée dans ce qu’il a écrit', () => {
    const c = comparer('toujourrs', 'toujours');
    expect(c.ecrit.filter((l) => !l.ok)).toHaveLength(1);
    expect(c.attendu.every((l) => l.ok)).toBe(true);
  });

  it('une lettre fausse au milieu', () => {
    const c = comparer('jardain', 'jardin');
    expect(c.juste).toBe(false);
    expect(c.ecrit.filter((l) => !l.ok).map((l) => l.lettre)).toEqual(['a']);
  });
});
