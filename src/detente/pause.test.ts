import { describe, expect, it } from 'vitest';
import { ETAPES_SENS, exerciceDuJour, INSPIRER, pauseDue, RESPIRATIONS, SOUFFLER } from './regles.ts';

describe('pause calme', () => {
  it('arrive à la moitié du travail du jour, une seule fois', () => {
    expect(pauseDue(10, 4, false)).toBe(false);
    expect(pauseDue(10, 5, false)).toBe(true);
    expect(pauseDue(9, 5, false)).toBe(true);
    expect(pauseDue(10, 8, true)).toBe(false);
  });

  it('pas de pause un jour sans rien à faire', () => {
    expect(pauseDue(0, 0, false)).toBe(false);
  });

  it('les deux exercices alternent d’un jour à l’autre', () => {
    expect(exerciceDuJour('2026-11-15')).not.toBe(exerciceDuJour('2026-11-16'));
    expect(exerciceDuJour('2026-11-15')).toBe(exerciceDuJour('2026-11-17'));
  });

  it('chaque exercice dure environ une minute et demie', () => {
    expect(RESPIRATIONS * (INSPIRER + SOUFFLER)).toBeGreaterThanOrEqual(80);
    expect(RESPIRATIONS * (INSPIRER + SOUFFLER)).toBeLessThanOrEqual(120);
    const sens = ETAPES_SENS.reduce((total, [, duree]) => total + duree, 0);
    expect(sens).toBeGreaterThanOrEqual(80);
    expect(sens).toBeLessThanOrEqual(120);
  });
});
