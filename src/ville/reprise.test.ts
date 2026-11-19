import { describe, expect, it } from 'vitest';
import { eurosDeReprise } from './reprise.ts';

describe('reprise du jeu d’avant', () => {
  it('3 tickets font 1 €, arrondi en dessous', () => {
    expect(eurosDeReprise(0)).toBe(0);
    expect(eurosDeReprise(2)).toBe(0);
    expect(eurosDeReprise(42)).toBe(1400);
    expect(eurosDeReprise(-5)).toBe(0);
  });
});
