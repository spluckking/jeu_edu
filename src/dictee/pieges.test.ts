import { describe, expect, it } from 'vitest';
import { corriger, separerDeterminant } from './correction.ts';
import { detecter, morceaux } from './pieges.ts';
import { syllabes } from './syllabes.ts';

describe('pièges et lieux', () => {
  it('chaque mot habite au lieu de son piège principal', () => {
    expect(detecter('une attention').lieu).toBe('tion');
    expect(detecter('des chevaux').lieu).toBe('muette');
    expect(detecter('une pomme').lieu).toBe('double');
    expect(detecter('ensemble').lieu).toBe('mbp');
    expect(detecter('un hôpital').lieu).toBe('h');
    expect(detecter('la forêt').lieu).toBe('muette');
    expect(detecter('mardi').lieu).toBe('simple');
  });

  it('la fiche d’étude : syllabes et pièges colorés', () => {
    const m = morceaux('pomme', syllabes('pomme'));
    expect(m.map((x) => x.texte).join('')).toBe('pomme');
    expect(m.some((x) => x.piege === 'double')).toBe(true);
  });
});

describe('syllabes', () => {
  it('découpe comme à l’école', () => {
    expect(syllabes('bateau')).toEqual(['ba', 'teau']);
    expect(syllabes('ensemble')).toEqual(['en', 'sem', 'ble']);
  });
});

describe('correction', () => {
  it('juste, déterminant facultatif, accent seulement', () => {
    expect(corriger('jungle', 'la jungle').juste).toBe(true);
    expect(corriger('le jungle', 'la jungle').juste).toBe(false);
    expect(corriger('foret', 'la forêt').accentSeulement).toBe(true);
    expect(separerDeterminant("l'attention").det).toBe("l'");
  });

  it('aligne les lettres : manquante, fausse, en trop', () => {
    const v = corriger('chevos', 'chevaux');
    expect(v.juste).toBe(false);
    expect(v.ops.some((o) => o.op === 'manque')).toBe(true);
    expect(v.ops.filter((o) => o.op === 'juste').map((o) => o.attendu).join('')).toContain('chev');
  });
});
