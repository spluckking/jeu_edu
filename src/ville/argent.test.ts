import { describe, expect, it } from 'vitest';
import { ajouter, decomposer, euros, juger, payerSimplement, pieces, retirer, total } from './argent.ts';

describe('argent', () => {
  it('décompose un montant avec le moins de pièces possible', () => {
    expect(decomposer(1300)).toEqual([1000, 200, 100]);
    expect(decomposer(400)).toEqual([200, 200]);
    expect(decomposer(0)).toEqual([]);
  });

  it('ajoute et retire des pièces du porte-monnaie', () => {
    const pm = ajouter({}, [500, 200, 200, 100]);
    expect(total(pm)).toBe(1000);
    expect(pieces(pm)).toEqual([500, 200, 200, 100]);
    expect(retirer(pm, [200, 100])).toEqual({ 500: 1, 200: 1 });
    expect(retirer(pm, [1000])).toBeNull();
  });

  it('juge les pièces posées sur le comptoir', () => {
    expect(juger([200], 300)).toEqual({ etat: 'pas-assez', manque: 100 });
    expect(juger([200, 100], 300)).toEqual({ etat: 'juste' });
    expect(juger([500], 300)).toEqual({ etat: 'a-rendre', rendu: 200 });
    // Le billet de 10 € suffit : la pièce de 2 € est en trop.
    expect(juger([1000, 200], 400)).toEqual({ etat: 'trop', inutile: 200 });
    // 2 + 2 + 1 pour 4 € : le 1 € est en trop. 2 + 2 + 2 pour 5 € : rien en trop, on rend 1.
    expect(juger([200, 200, 100], 400)).toEqual({ etat: 'trop', inutile: 100 });
    expect(juger([200, 200, 200], 500)).toEqual({ etat: 'a-rendre', rendu: 100 });
  });

  it('écrit les euros comme sur une étiquette', () => {
    expect(euros(300)).toBe('3 €');
    expect(euros(250)).toBe('2,50 €');
    expect(euros(5)).toBe('0,05 €');
  });

  it('paie un tour de manège et rend la monnaie', () => {
    expect(payerSimplement({ 500: 1 }, 100)).toEqual({ 200: 2 });
    expect(payerSimplement({ 100: 2, 500: 1 }, 100)).toEqual({ 100: 1, 500: 1 });
    expect(payerSimplement({ 0: 0 }, 100)).toBeNull();
    expect(total(payerSimplement({ 100: 1, 200: 1 }, 300) ?? { 1: 1 })).toBe(0);
  });
});
