import { describe, expect, it } from 'vitest';
import { accepter, demandesDuJour, demandesNeuves, enMots, lotsProposes, seanceFinie, terminer, verifierDon } from './demandes.ts';

const noms = (id: string): { nom: string; pluriel: string } => ({ nom: id, pluriel: `${id}s` });

describe('demandes du jour', () => {
  it('prend d’abord celles faites il y a le plus longtemps, et ne change pas dans la journée', () => {
    let e = { ...demandesNeuves(), historique: { a: '2026-11-17', b: '2026-11-10' } };
    e = demandesDuJour(e, ['a', 'b', 'c'], '2026-11-18', 2);
    expect(e.ids).toEqual(['c', 'b']);
    e = terminer(accepter(e, 'c'), 'c');
    expect(demandesDuJour(e, ['a', 'b', 'c'], '2026-11-18', 2)).toBe(e);
    expect(e.historique.c).toBe('2026-11-18');
    expect(demandesDuJour(e, ['a', 'b', 'c'], '2026-11-19', 2).ids).toEqual(['b', 'a']);
  });

  it('la séance est finie quand les mots et les demandes du jour sont faits', () => {
    const e = { ...demandesNeuves(), jour: 'j', ids: ['a', 'b'], faites: ['a'] };
    expect(seanceFinie(true, e)).toBe(false);
    expect(seanceFinie(true, terminer(e, 'b'))).toBe(true);
    expect(seanceFinie(false, terminer(e, 'b'))).toBe(false);
  });
});

describe('donner', () => {
  const besoin = [
    { produit: 'carotte', nombre: 2 },
    { produit: 'pain', nombre: 1 },
  ];
  it('accepte exactement ce qu’il faut', () => {
    expect(verifierDon(besoin, { carotte: 2, pain: 1 })).toEqual({ juste: true });
  });
  it('dit ce qui manque et ce qui est en trop', () => {
    expect(verifierDon(besoin, { carotte: 1, pain: 1, pomme: 2 })).toEqual({
      juste: false,
      manque: [{ produit: 'carotte', nombre: 1 }],
      trop: [{ produit: 'pomme', nombre: 2 }],
    });
    expect(verifierDon(besoin, { carotte: 3, pain: 1 })).toEqual({ juste: false, manque: [], trop: [{ produit: 'carotte', nombre: 1 }] });
  });
  it('écrit une liste comme on la dit', () => {
    expect(enMots(besoin, noms)).toBe('2 carottes et 1 pain');
    expect(enMots([{ produit: 'pomme', nombre: 1 }], noms)).toBe('1 pomme');
  });
});

describe('lots', () => {
  it('propose trois meubles pas encore gagnés', () => {
    expect(lotsProposes(['a', 'b', 'c', 'd'], ['b'])).toEqual(['a', 'c', 'd']);
    expect(lotsProposes(['a'], ['a'])).toEqual([]);
  });
});
