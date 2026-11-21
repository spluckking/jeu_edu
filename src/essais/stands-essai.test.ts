import { describe, expect, it } from 'vitest';
import { enPieces, euros, grandNombre, lettres, nomFraction, STANDS_ESSAI, conversion } from './stands-essai.ts';

describe('les essais de stands', () => {
  it('écrit les nombres en lettres', () => {
    expect(lettres(0)).toBe('zéro');
    expect(lettres(21)).toBe('vingt et un');
    expect(lettres(71)).toBe('soixante et onze');
    expect(lettres(77)).toBe('soixante-dix-sept');
    expect(lettres(80)).toBe('quatre-vingts');
    expect(lettres(81)).toBe('quatre-vingt-un');
    expect(lettres(91)).toBe('quatre-vingt-onze');
    expect(lettres(200)).toBe('deux cents');
    expect(lettres(280)).toBe('deux cent quatre-vingts');
    expect(lettres(1000)).toBe('mille');
    expect(lettres(3205)).toBe('trois mille deux cent cinq');
    expect(lettres(7600)).toBe('sept mille six cents');
    expect(lettres(9999)).toBe('neuf mille neuf cent quatre-vingt-dix-neuf');
  });

  it('nomme les fractions', () => {
    expect(nomFraction(1, 2)).toBe('un demi');
    expect(nomFraction(3, 4)).toBe('trois quarts');
    expect(nomFraction(2, 3)).toBe('deux tiers');
  });

  it('compte les pièces et les centimes', () => {
    expect(euros(350)).toBe('3,50 €');
    expect(euros(50)).toBe('50 c');
    expect(euros(700)).toBe('7 €');
    expect(enPieces(380)).toEqual([200, 100, 50, 20, 10]);
  });

  it('les grands nombres ont 4 chiffres', () => {
    for (let i = 0; i < 200; i++) {
      const n = grandNombre(Math.random);
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThan(10000);
    }
  });

  it('les conversions sont justes', () => {
    const EN = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1000000, g: 1, kg: 1000 } as Record<string, number>;
    for (let i = 0; i < 300; i++) {
      const c = conversion(Math.random);
      const total = [...c.de.matchAll(/(\d+) (mm|cm|dm|km|kg|m|g)\b/g)].reduce((t, [, n, u]) => t + Number(n) * EN[u!]!, 0);
      expect(total).toBe(c.reponse * EN[c.vers]!);
    }
  });

  it('chaque stand pose 6 questions bien formées', () => {
    for (const s of STANDS_ESSAI) {
      for (let k = 0; k < 30; k++) {
        const qs = s.questions(Math.random);
        expect(qs).toHaveLength(6);
        for (const q of qs) {
          expect(q.enonce).not.toMatch(/\{\w+\}/);
          expect(q.aide).not.toMatch(/\{\w+\}/);
          if (q.type === 'choix') {
            expect(q.choix).toContain(q.reponse);
            expect(new Set(q.choix).size).toBe(q.choix.length);
            expect(q.choix.length).toBeGreaterThanOrEqual(s.id === 'fractions' ? 4 : 2);
          }
          if (q.type === 'nombre') expect(Number.isInteger(q.reponse) && q.reponse >= 0).toBe(true);
          if (q.type === 'colorier') expect(q.k).toBeLessThan(q.n);
        }
      }
    }
  });

  it('les phrases : chaque mot a 3 pluriels différents, chaque groupe est dans sa phrase', () => {
    const P = STANDS_ESSAI.find((x) => x.id === 'phrases')!;
    for (let k = 0; k < 50; k++) {
      for (const q of P.questions(Math.random)) {
        if (q.type !== 'choix') continue;
        expect(new Set(q.choix).size).toBe(3 + (q.choix.length - 3));
        if (q.enonce.startsWith('«')) for (const g of q.choix) expect(q.enonce).toContain(g);
      }
    }
  });

  it('le plus grand nombre est bien le plus grand', () => {
    for (let k = 0; k < 50; k++) {
      for (const q of STANDS_ESSAI.find((s) => s.id === 'nombres')!.questions(Math.random)) {
        if (q.type !== 'choix') continue;
        const valeurs = q.choix.map((c) => Number(c.replace(/\D/g, '')));
        expect(Number(q.reponse.replace(/\D/g, ''))).toBe(Math.max(...valeurs));
      }
    }
  });
});
