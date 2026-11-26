import { describe, expect, it } from 'vitest';
import { EXERCICES_PAR_JOUR, exercicesDuJour, type EntreeDuJour, type IdExercice } from './fete-du-jour.ts';

const TOUS: IdExercice[] = ['tables', 'mots', 'calcul', 'heure', 'homophones', 'monnaie', 'mesures', 'fractions', 'nombres', 'formes', 'phrases'];
const h = (justes: number, total: number, dernier?: string) => ({ recents: { justes, total }, ...(dernier ? { dernier } : {}) });
const entree = (e: Partial<EntreeDuJour>): EntreeDuJour => ({ devoirs: [], possibles: TOUS, historique: {}, hasard: () => 0.5, ...e });

describe('les 3 exercices du jour à la fête', () => {
  it('jamais plus de 3, chacun chez un forain différent', () => {
    for (let i = 0; i < 200; i++) {
      const choix = exercicesDuJour(entree({ hasard: Math.random, devoirs: ['mesures', 'phrases', 'fractions', 'mots'] }));
      expect(choix).toHaveLength(EXERCICES_PAR_JOUR);
      expect(new Set(choix.map((c) => c.stand)).size).toBe(choix.length);
      expect(new Set(choix.map((c) => c.exercice)).size).toBe(choix.length);
    }
  });

  it('les devoirs d’abord', () => {
    const choix = exercicesDuJour(entree({ devoirs: ['mots', 'mesures'], historique: { heure: h(1, 10) } }));
    expect(choix.slice(0, 2)).toMatchObject([
      { exercice: 'mots', stand: 'confiserie', raison: 'devoirs' },
      { exercice: 'mesures', raison: 'devoirs' },
    ]);
    // Le mot du forain de la confiserie est pris : l'atelier va ailleurs.
    expect(choix[1]!.stand).not.toBe('confiserie');
    expect(choix[2]).toMatchObject({ exercice: 'heure', raison: 'faible' });
  });

  it('puis le point faible le moins réussi, puis un exercice réussi pas vu depuis longtemps', () => {
    const choix = exercicesDuJour(
      entree({
        historique: {
          fractions: h(3, 10, '2026-11-25'),
          heure: h(6, 10, '2026-11-25'),
          calcul: h(10, 10, '2026-11-25'),
          formes: h(9, 10, '2026-11-10'),
        },
      }),
    );
    expect(choix.map((c) => [c.exercice, c.raison])).toEqual([
      ['fractions', 'faible'],
      ['formes', 'reussi'],
      // Le reste : jamais fait d'abord.
      [expect.any(String), 'autre'],
    ]);
    expect(['tables', 'mots', 'homophones', 'monnaie', 'mesures', 'nombres', 'phrases']).toContain(choix[2]!.exercice);
  });

  it('le choix du rêve passe avant les statistiques pour le point faible', () => {
    const choix = exercicesDuJour(entree({ duReve: ['nombres'], historique: { fractions: h(1, 10) } }));
    expect(choix[0]).toMatchObject({ exercice: 'nombres', raison: 'faible' });
  });

  it('un exercice sans travail aujourd’hui n’est jamais choisi', () => {
    const choix = exercicesDuJour(entree({ devoirs: ['tables'], possibles: ['calcul', 'heure', 'mesures', 'formes'] }));
    expect(choix.map((c) => c.exercice)).not.toContain('tables');
    expect(choix).toHaveLength(3);
  });

  it('trois ateliers prennent trois forains libres', () => {
    const choix = exercicesDuJour(entree({ devoirs: ['mesures', 'phrases', 'fractions'] }));
    expect(choix.map((c) => c.stand)).toEqual(['chamboule', 'confiserie', 'chantier']);
  });
});
