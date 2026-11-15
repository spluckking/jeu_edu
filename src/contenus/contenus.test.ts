import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { idCalcul, lireContenu } from './contenus.ts';

const DOSSIER = join(import.meta.dirname, '..', '..', 'content', 'packs');

describe('validateur de contenus', () => {
  it('tous les contenus du dossier sont valides', () => {
    const fichiers = readdirSync(DOSSIER).filter((nom) => nom.endsWith('.json'));
    expect(fichiers.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const nom of fichiers) {
      const lu = lireContenu(JSON.parse(readFileSync(join(DOSSIER, nom), 'utf8')), nom);
      expect(lu, nom).not.toBeInstanceOf(Array);
      if (Array.isArray(lu)) continue;
      expect(ids.has(lu.id), `id en double : ${lu.id}`).toBe(false);
      ids.add(lu.id);
    }
  });

  it('6 × 7 et 7 × 6 sont le même élément', () => {
    expect(idCalcul(6, 7)).toBe(idCalcul(7, 6));
    const lu = lireContenu({ id: 'essai', titre: 'Essai', type: 'calcul', elements: [{ a: 6, b: 7 }, { a: 7, b: 6 }] }, 'essai');
    expect(Array.isArray(lu)).toBe(true);
  });

  it('calcule la réponse et refuse les nombres hors limites', () => {
    const lu = lireContenu({ id: 'essai', titre: 'Essai', type: 'calcul', elements: [{ a: 6, b: 7 }] }, 'essai');
    expect(lu).toMatchObject({ elements: [{ id: 'x-6-7', reponse: '42' }] });
    const faux = lireContenu({ id: 'essai', titre: 'Essai', type: 'calcul', elements: [{ a: 60, b: 7 }] }, 'essai');
    expect(Array.isArray(faux)).toBe(true);
  });
});

describe('contenus de mots', () => {
  const mots = (elements: unknown[]): unknown => ({ id: 'essai', titre: 'Essai', type: 'mots', elements });

  it('lit les mots, avec ou sans phrase', () => {
    const lu = lireContenu(mots([{ mot: 'maison', phrase: 'La maison est grande.' }, { mot: 'aujourd’hui' }]), 'essai');
    expect(lu).toMatchObject({
      elements: [
        { id: 'm-maison', reponse: 'maison', phrase: 'La maison est grande.' },
        { id: "m-aujourd'hui", reponse: "aujourd'hui" },
      ],
    });
  });

  it('refuse un mot avec des chiffres, et un mot en double malgré la majuscule', () => {
    expect(Array.isArray(lireContenu(mots([{ mot: 'mais0n' }]), 'essai'))).toBe(true);
    expect(Array.isArray(lireContenu(mots([{ mot: 'Paris' }, { mot: 'paris' }]), 'essai'))).toBe(true);
  });
});
