import { describe, expect, it } from 'vitest';
import { genererHomophone, MOTS, pairesDuNiveau, PHRASES, verifierHomophone, type Paire } from './homophones.ts';

describe('homophones', () => {
  it('chaque phrase a un seul trou et une réponse de sa paire', () => {
    for (const paire of Object.keys(PHRASES) as Paire[]) {
      for (const [phrase, reponse] of PHRASES[paire]) {
        expect(phrase.split('___').length - 1, phrase).toBe(1);
        expect(MOTS[paire]).toContain(reponse);
      }
    }
  });

  it('chaque paire a des phrases pour ses deux mots', () => {
    for (const paire of Object.keys(PHRASES) as Paire[]) {
      const reponses = new Set(PHRASES[paire].map(([, r]) => r));
      expect(reponses.size, paire).toBe(2);
    }
  });

  it('les paires arrivent par niveau', () => {
    expect(pairesDuNiveau(1)).toEqual(['a', 'et']);
    expect(pairesDuNiveau(2)).toContain('on');
    expect(pairesDuNiveau(5)).toContain('son');
  });

  it('la réponse tirée est acceptée, l’autre mot non', () => {
    let g = 5;
    const hasard = (): number => {
      g = (g * 16807) % 2147483647;
      return g / 2147483647;
    };
    for (let i = 0; i < 200; i++) {
      const q = genererHomophone(5, hasard);
      expect(verifierHomophone(q, q.reponse)).toBe(true);
      const autre = q.mots.find((m) => m !== q.reponse) ?? '';
      expect(verifierHomophone(q, autre)).toBe(false);
    }
  });
});
