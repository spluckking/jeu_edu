import { describe, expect, it } from 'vitest';
import { ecrireHeure, genererQuestionHeure, normaliserHeure, verifierHeure, type QuestionHeure } from './horloge.ts';

function hasardFixe(graine = 3): () => number {
  let g = graine;
  return () => {
    g = (g * 16807) % 2147483647;
    return g / 2147483647;
  };
}

describe('saisie de l’heure', () => {
  it('lit les façons courantes d’écrire une heure', () => {
    expect(normaliserHeure('3h15')).toBe('3:15');
    expect(normaliserHeure('3 h 15')).toBe('3:15');
    expect(normaliserHeure('3h')).toBe('3:0');
    expect(normaliserHeure('03h05')).toBe('3:5');
    expect(normaliserHeure('25h')).toBeNull();
    expect(normaliserHeure('3h75')).toBeNull();
    expect(normaliserHeure('315')).toBeNull();
  });

  it('écrit les minutes sur deux chiffres', () => {
    expect(ecrireHeure({ h: 3, m: 5 })).toBe('3 h 05');
    expect(ecrireHeure({ h: 15, m: 0 })).toBe('15 h');
  });
});

describe('questions de l’horloge', () => {
  const toutes = (niveau: number, n = 400): QuestionHeure[] => {
    const hasard = hasardFixe(niveau * 7);
    return Array.from({ length: n }, () => genererQuestionHeure(niveau, hasard));
  };

  it('la réponse montrée est toujours acceptée, à tous les niveaux', () => {
    for (let niveau = 1; niveau <= 5; niveau++) {
      for (const q of toutes(niveau)) {
        const saisie = q.saisie === 'choix' ? q.reponse : q.reponse.replace(/ /g, '');
        expect(verifierHeure(q, saisie), q.id).toBe(true);
      }
    }
  });

  it('un cadran se lit le matin comme l’après-midi', () => {
    const q = toutes(1).find((x) => x.id.startsWith('lire-pile:3:'));
    expect(q).toBeDefined();
    if (!q) return;
    expect(verifierHeure(q, '3h')).toBe(true);
    expect(verifierHeure(q, '15h')).toBe(true);
    expect(verifierHeure(q, '4h')).toBe(false);
  });

  it('niveau 1 : seulement des heures pile, et trois choix différents', () => {
    for (const q of toutes(1)) {
      if (q.id.startsWith('lire')) expect(q.cadran?.m).toBe(0);
      if (q.saisie === 'choix') expect(new Set(q.choix).size).toBe(3);
    }
  });

  it('les minutes vont de 5 en 5 au niveau 4', () => {
    const minutes = new Set(toutes(4).flatMap((q) => (q.cadran && q.id.startsWith('lire') ? [q.cadran.m] : [])));
    for (const m of minutes) expect(m % 5).toBe(0);
    expect(minutes.size).toBeGreaterThan(5);
  });
});
