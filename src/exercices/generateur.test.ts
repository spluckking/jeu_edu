import { describe, expect, it } from 'vitest';
import { ajusterNiveau, genererExercice, niveauDeDepart, type Personne } from './generateur.ts';

function hasardFixe(graine = 11): () => number {
  let g = graine;
  return () => {
    g = (g * 16807) % 2147483647;
    return g / 2147483647;
  };
}

const gens: Personne[] = [
  { nom: 'Marcel', feminin: false, objets: 'ballons' },
  { nom: 'Lila', feminin: true, objets: 'bonbons' },
];

/** Recalcule la réponse à partir des nombres de l'identifiant. */
function recalculer(id: string): number {
  const [, calcul] = id.split(':');
  const m = /^(\d+)([+\-x])(\d+)$/.exec(calcul ?? '');
  if (!m) throw new Error(id);
  const a = Number(m[1]);
  const b = Number(m[3]);
  return m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b;
}

describe('exercices générés', () => {
  it('la réponse est toujours juste, positive et sous 100, à tous les niveaux', () => {
    const hasard = hasardFixe();
    for (let niveau = 1; niveau <= 5; niveau++) {
      for (let i = 0; i < 300; i++) {
        const e = genererExercice(niveau, hasard, gens);
        const r = Number(e.reponse);
        expect(r, e.id).toBe(recalculer(e.id));
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThan(100);
      }
    }
  });

  it('niveau 1 : pas de retenue et pas de problème', () => {
    const hasard = hasardFixe(5);
    for (let i = 0; i < 200; i++) {
      const e = genererExercice(1, hasard, gens);
      expect(e.probleme).toBe(false);
      expect(e.id).not.toContain('-r:');
    }
  });

  it('un problème parle d’une foraine au féminin', () => {
    const hasard = hasardFixe(9);
    const lila = [gens[1] as Personne];
    const pb = Array.from({ length: 200 }, () => genererExercice(4, hasard, lila)).filter((e) => e.probleme);
    expect(pb.length).toBeGreaterThan(20);
    for (const e of pb) {
      expect(e.enonce).toContain('Lila');
      expect(e.enonce).not.toMatch(/\bIl en\b|-t-il maintenant|a-t-il de/);
    }
  });
});

describe('niveau adaptatif', () => {
  it('monte après 3 réussites de suite', () => {
    let n = niveauDeDepart();
    n = ajusterNiveau(n, true);
    n = ajusterNiveau(n, true);
    expect(n.niveau).toBe(1);
    n = ajusterNiveau(n, true);
    expect(n.niveau).toBe(2);
  });

  it('descend après 2 erreurs de suite, sans passer sous 1', () => {
    let n = { niveau: 3, reussitesDeSuite: 2, erreursDeSuite: 0 };
    n = ajusterNiveau(n, false);
    expect(n.niveau).toBe(3);
    n = ajusterNiveau(n, false);
    expect(n.niveau).toBe(2);
    n = ajusterNiveau(ajusterNiveau(ajusterNiveau(ajusterNiveau(n, false), false), false), false);
    expect(n.niveau).toBe(1);
  });

  it('une erreur coupe la série de réussites', () => {
    let n = niveauDeDepart();
    n = ajusterNiveau(ajusterNiveau(n, true), true);
    n = ajusterNiveau(n, false);
    n = ajusterNiveau(n, true);
    expect(n.niveau).toBe(1);
  });
});
