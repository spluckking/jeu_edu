import { describe, expect, it } from 'vitest';
import { cleVoix, empreinte, normaliserPhrase } from './cle-voix.ts';

describe('clé des voix enregistrées', () => {
  it('FNV-1a connu', () => {
    expect(empreinte('')).toBe('811c9dc5');
    expect(empreinte('a')).toBe('e40c292c');
  });

  it('les espaces en trop ne changent pas la clé, le mode oui', () => {
    expect(cleVoix(' 3  fois 8 ', 'normal')).toBe(cleVoix('3 fois 8', 'normal'));
    expect(cleVoix('maison', 'dictee')).not.toBe(cleVoix('maison', 'normal'));
    expect(normaliserPhrase('a \n b')).toBe('a b');
  });

  it('les accents comptent (UTF-8)', () => {
    expect(cleVoix('école', 'normal')).not.toBe(cleVoix('ecole', 'normal'));
  });
});
