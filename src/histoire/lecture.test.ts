import { describe, expect, it } from 'vitest';
import { chargerHistoires, choixAffiches, lireHistoire, nettoyerPrenom, remplir, tirerQuestions } from './lecture.ts';

/** Hasard fixe, pour des tirages reproductibles. */
function hasardFixe(graine = 7): () => number {
  let g = graine;
  return () => {
    g = (g * 16807) % 2147483647;
    return g / 2147483647;
  };
}

describe('les histoires du dossier', () => {
  it('sont toutes valides', () => {
    const fichiers = import.meta.glob<unknown>('/content/histoires/*.json', { eager: true, import: 'default' });
    expect(Object.keys(fichiers).length).toBeGreaterThan(0);
    for (const [chemin, brut] of Object.entries(fichiers)) expect(lireHistoire(brut, chemin)).not.toBeInstanceOf(Array);
  });

  it("l'introduction a une banque de 8 questions et nomme les trois forains", () => {
    const intro = chargerHistoires().get('introduction');
    expect(intro?.questions).toHaveLength(8);
    expect(intro?.plans.filter((p) => p.nommer).map((p) => p.nommer)).toEqual(['chamboule', 'confiserie', 'chantier']);
  });
});

describe('vérification', () => {
  const base = {
    id: 'essai',
    titre: 'Essai',
    plans: [{ vue: 'survol', texte: 'Bonjour.' }],
    questions: Array.from({ length: 4 }, () => ({ question: 'Où ?', choix: ['a', 'b', 'c'] })),
  };

  it('refuse un prénom utilisé avant d’être donné', () => {
    const brut = { ...base, plans: [{ vue: 'survol', texte: 'Voici {chamboule}.' }] };
    expect(lireHistoire(brut, 'essai')).toBeInstanceOf(Array);
  });

  it('refuse une marque inconnue et des choix en double', () => {
    expect(lireHistoire({ ...base, plans: [{ vue: 'survol', texte: 'Voici {toto}.' }] }, 'essai')).toBeInstanceOf(Array);
    const doublon = { ...base, questions: [...base.questions.slice(1), { question: 'Où ?', choix: ['a', 'a', 'c'] }] };
    expect(lireHistoire(doublon, 'essai')).toBeInstanceOf(Array);
  });
});

describe('prénoms', () => {
  it('remplace les marques par les prénoms donnés', () => {
    expect(remplir('Bonjour {chamboule} et {chantier} !', { chamboule: 'Léon', chantier: 'Hugo' })).toBe(
      'Bonjour Léon et Hugo !',
    );
  });

  it('nettoie un prénom tapé', () => {
    expect(nettoyerPrenom('  zoé 3!  ')).toBe('Zoé');
    expect(nettoyerPrenom('jean-luc')).toBe('Jean-luc');
  });

  it('la question sur un prénom propose le bon et deux autres', () => {
    const { choix, bonne } = choixAffiches({ question: 'Qui ?', nom: 'chamboule' }, { chamboule: 'Gaston' }, hasardFixe());
    expect(choix).toHaveLength(3);
    expect(choix[bonne]).toBe('Gaston');
    expect(new Set(choix).size).toBe(3);
  });

  it('un prénom tapé par l’enfant a aussi deux autres choix', () => {
    const { choix, bonne } = choixAffiches({ question: 'Qui ?', nom: 'chantier' }, { chantier: 'Zoé' }, hasardFixe());
    expect(choix[bonne]).toBe('Zoé');
    expect(new Set(choix).size).toBe(3);
  });
});

describe('tirage des questions', () => {
  it('ne repose jamais une question du même cycle', () => {
    const hasard = hasardFixe(3);
    let posees: number[] = [];
    const vues: number[] = [];
    for (let i = 0; i < 4; i++) {
      const t = tirerQuestions(8, posees, hasard);
      vues.push(...t.tirees);
      posees = t.posees;
    }
    expect([...vues].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('banque épuisée : nouveau cycle, sans les deux dernières', () => {
    const t = tirerQuestions(8, [0, 1, 2, 3, 4, 5, 6, 7], hasardFixe());
    expect(t.tirees).toHaveLength(2);
    expect(t.tirees).not.toContain(6);
    expect(t.tirees).not.toContain(7);
    expect(t.posees).toEqual(t.tirees);
  });
});
