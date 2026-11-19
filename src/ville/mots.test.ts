import { describe, expect, it } from 'vitest';
import { aEntendre, decouper } from './mots.ts';

describe('mots touchables', () => {
  it('sépare les mots de la ponctuation et des espaces', () => {
    const m = decouper('Bonjour ! Tu viens, ce matin ?');
    expect(m.filter((x) => x.mot).map((x) => x.texte)).toEqual(['Bonjour', 'Tu', 'viens', 'ce', 'matin']);
    expect(m.map((x) => x.texte).join('')).toBe('Bonjour ! Tu viens, ce matin ?');
  });

  it('garde ensemble les apostrophes, les traits d’union et les accents', () => {
    const mots = decouper('Aujourd’hui, l’épicière et mon grand-père mangent 3 pommes.').filter((x) => x.mot).map((x) => x.texte);
    expect(mots).toEqual(['Aujourd’hui', 'l’épicière', 'et', 'mon', 'grand-père', 'mangent', '3', 'pommes']);
  });

  it('un mot entendu sans apostrophe typographique', () => {
    expect(aEntendre('l’heure')).toBe("l'heure");
  });
});
