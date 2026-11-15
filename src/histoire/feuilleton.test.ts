import { describe, expect, it } from 'vitest';
import { episodeDuJour, lireSemaine, type Semaine } from './feuilleton.ts';

const episode = (n: number): unknown => ({
  titre: `Épisode ${n}`,
  phrases: ['Une phrase.', 'Une autre phrase.', 'La dernière phrase.'],
  question: 'Quoi ?',
  choix: ['a', 'b', 'c'],
  reponse: 2,
});

describe('semaines du feuilleton', () => {
  it('toutes les semaines du dossier sont valides', () => {
    const fichiers = import.meta.glob<unknown>('/content/feuilleton/*.json', { eager: true, import: 'default' });
    expect(Object.keys(fichiers).length).toBeGreaterThan(0);
    for (const [chemin, brut] of Object.entries(fichiers)) expect(lireSemaine(brut, chemin), chemin).not.toBeInstanceOf(Array);
  });

  it('la phrase qui s’allume contient bien un mot de la bonne réponse', () => {
    const fichiers = import.meta.glob<unknown>('/content/feuilleton/*.json', { eager: true, import: 'default' });
    const mots = (t: string): string[] => t.toLocaleLowerCase('fr').match(/\p{L}{3,}/gu) ?? [];
    for (const [chemin, brut] of Object.entries(fichiers)) {
      const s = lireSemaine(brut, chemin);
      if (Array.isArray(s)) continue;
      for (const e of s.episodes) {
        const phrase = mots(e.phrases[e.reponse - 1] ?? '');
        const communs = mots(e.choix[0]).filter((m) => !['les', 'des', 'une', 'fois'].includes(m) && phrase.includes(m));
        expect(communs.length, e.id).toBeGreaterThan(0);
      }
    }
  });

  it('refuse une réponse qui ne pointe sur aucune phrase', () => {
    const brut = { id: 'essai', titre: 'Essai', valide: true, episodes: [{ ...(episode(1) as object), reponse: 9 }] };
    expect(lireSemaine(brut, 'essai')).toBeInstanceOf(Array);
  });

  it('refuse un épisode trop long', () => {
    const phrases = Array.from({ length: 7 }, () => 'Une phrase.');
    const brut = { id: 'essai', titre: 'Essai', valide: true, episodes: [{ ...(episode(1) as object), phrases }] };
    expect(lireSemaine(brut, 'essai')).toBeInstanceOf(Array);
  });
});

describe('épisode du jour', () => {
  const semaine = (id: string, valide: boolean): Semaine => {
    const lu = lireSemaine({ id, titre: id, valide, episodes: [episode(1), episode(2)] }, id);
    if (Array.isArray(lu)) throw new Error(lu.join());
    return lu;
  };

  it('une semaine non validée n’arrive jamais devant l’enfant', () => {
    expect(episodeDuJour([semaine('semaine-01', false)], new Set())).toBeNull();
  });

  it('le premier épisode pas encore lu, dans l’ordre des semaines', () => {
    const semaines = [semaine('semaine-02', true), semaine('semaine-01', true)];
    expect(episodeDuJour(semaines, new Set())?.id).toBe('semaine-01:1');
    expect(episodeDuJour(semaines, new Set(['semaine-01:1', 'semaine-01:2']))?.id).toBe('semaine-02:1');
  });

  it('un jour sauté ne fait pas perdre d’épisode', () => {
    expect(episodeDuJour([semaine('semaine-01', true)], new Set(['semaine-01:1']))?.id).toBe('semaine-01:2');
  });
});
