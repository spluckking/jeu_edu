import { describe, expect, it } from 'vitest';
import { COLONNES, conversion, niveauApres, NIVEAU_ATELIER_MAX, enPieces, euros, grandNombre, lettres, nomFraction, planDePartie, STANDS_ESSAI } from './stands-essai.ts';

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

  it('chaque stand pose 6 questions bien formées, à chaque niveau', () => {
    for (const s of STANDS_ESSAI) {
      for (let k = 0; k < 90; k++) {
        const qs = s.questions(Math.random, 6, [], 1 + (k % NIVEAU_ATELIER_MAX));
        expect(qs).toHaveLength(6);
        for (const q of qs) {
          expect(q.enonce).not.toMatch(/\{\w+\}/);
          expect(q.aide).not.toMatch(/\{\w+\}/);
          if (q.type === 'choix') {
            expect(q.choix).toContain(q.reponse);
            expect(new Set(q.choix).size).toBe(q.choix.length);
            expect(q.choix.length).toBeGreaterThanOrEqual(s.id === 'fractions' && !q.competence.startsWith('fractions.comparer') ? 4 : 2);
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

  it('chaque question dit sa compétence, qui commence par son atelier', () => {
    for (const s of STANDS_ESSAI) {
      for (const q of s.questions(Math.random, 12)) expect(q.competence).toMatch(new RegExp(`^${s.id}\\.[a-zA-Z]+(\\.[a-zA-Z0-9-]+)?$`));
    }
    const m = STANDS_ESSAI.find((s) => s.id === 'mesures')!.questions(Math.random, 30);
    expect(m.some((q) => /^mesures\.convertir\.(m-cm|km-m|kg-g|mcm-cm|cm-m|kmm-m|dm-cm|cm-mm|mm-cm)$/.test(q.competence))).toBe(true);
  });

  it('le focus du rêve : une question sur deux porte sur la compétence visée', () => {
    const M = STANDS_ESSAI.find((s) => s.id === 'mesures')!;
    for (let k = 0; k < 20; k++) {
      const qs = M.questions(Math.random, 8, ['mesures.pas']);
      expect(qs.filter((q) => q.competence === 'mesures.pas').length).toBeGreaterThanOrEqual(4);
    }
    // Un focus précis (une conversion) vise la sorte « convertir ».
    expect(M.questions(Math.random, 6, ['mesures.convertir.km-m']).filter((q) => q.competence.startsWith('mesures.convertir')).length).toBeGreaterThanOrEqual(3);
    // Un focus d'un autre atelier ne change rien.
    expect(planDePartie('mesures', Object.keys(M.sortes), M.melange, () => 0, 6, ['monnaie.rendre']).sort()).toEqual([...M.melange].sort());
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

  it('les mesures : le tableau du brouillon va avec la phrase, et montre ses unités', () => {
    const mesures = STANDS_ESSAI.find((a) => a.id === 'mesures')!;
    for (let i = 0; i < 300; i++)
      for (const q of mesures.questions(Math.random)) {
        if (q.type !== 'nombre' && q.type !== 'choix') continue;
        expect(q.tableau).toBeDefined();
        const colonnes = COLONNES[q.tableau!.grandeur];
        for (const u of q.tableau!.unites) expect(colonnes).toContain(u);
        if (q.type === 'nombre' && q.unite) expect(q.tableau!.unites).toContain(q.unite);
        if (q.competence.includes('kg-g') || q.competence.endsWith('masse')) expect(q.tableau!.grandeur).toBe('masse');
      }
  });

  it('le niveau d’un atelier monte, descend, et reste dans le CE2', () => {
    expect(niveauApres(2, 5, 6)).toBe(3);
    expect(niveauApres(3, 6, 6)).toBe(NIVEAU_ATELIER_MAX);
    expect(niveauApres(2, 3, 6)).toBe(1);
    expect(niveauApres(1, 0, 6)).toBe(1);
    expect(niveauApres(2, 4, 6)).toBe(2);
  });

  it('les fractions en images : la pizza mangée, la plus grande part, les bonbons partagés', () => {
    const f = STANDS_ESSAI.find((a) => a.id === 'fractions')!;
    for (let k = 0; k < 200; k++)
      for (const q of f.questions(Math.random, 6, [], 1 + (k % 3))) {
        if (q.competence.startsWith('fractions.collection')) {
          expect(q.type).toBe('nombre');
          if (q.type === 'nombre' && q.visuel?.sorte === 'collection') {
            const n = Number(q.competence.split('-')[1]);
            expect(q.visuel.n).toBe(q.reponse * n);
            expect(q.visuel.n).toBeLessThanOrEqual(40);
          }
        }
        if (q.competence.startsWith('fractions.comparer') && q.type === 'choix' && q.visuel?.sorte === 'deux') {
          const [a, b] = [q.visuel.a, q.visuel.b];
          const grande = a.k / a.n > b.k / b.n ? a : b;
          expect(q.reponse).toBe(String(grande.k) + '/' + String(grande.n));
          expect(a.k / a.n).not.toBe(b.k / b.n);
        }
      }
  });
});
