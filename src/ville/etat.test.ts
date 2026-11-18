import { describe, expect, it } from 'vitest';
import { etatNeuf, lireEtat } from './etat.ts';

describe('état de la ville', () => {
  it('un état illisible repart de zéro', () => {
    expect(lireEtat(null)).toEqual(etatNeuf());
    expect(lireEtat('n’importe quoi')).toEqual(etatNeuf());
  });

  it('garde la position et les dialogues lus, ignore le reste', () => {
    const e = lireEtat({ position: { x: 2, z: -3, cap: 1 }, lus: ['forain-accueil', 4], autre: true });
    expect(e.position).toEqual({ x: 2, z: -3, cap: 1 });
    expect(e.lus).toEqual(['forain-accueil']);
  });

  it('une position abîmée reprend la position de départ', () => {
    expect(lireEtat({ position: { x: 'a', z: 1, cap: 0 } }).position).toEqual(etatNeuf().position);
  });
});
