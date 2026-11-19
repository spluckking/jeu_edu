import { describe, expect, it } from 'vitest';
import { accepter, demandesDuJour, demandesNeuves, enMots, etapeSuivante, lotsProposes, seanceFinie, terminer, verifierDon } from './demandes.ts';

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
  it('dit ce qui manque, ce qui est en trop, et ce dont l’habitant n’a pas besoin', () => {
    expect(verifierDon(besoin, { carotte: 1, pain: 1, pomme: 2 })).toEqual({
      juste: false,
      manque: [{ produit: 'carotte', nombre: 1 }],
      trop: [],
      inutiles: ['pomme'],
    });
    expect(verifierDon(besoin, { carotte: 3, pain: 1 })).toEqual({ juste: false, manque: [], trop: [{ produit: 'carotte', nombre: 1 }], inutiles: [] });
  });
  it('un aller-retour passe à l’étape du retour, et repart de zéro le lendemain', () => {
    const e = etapeSuivante(demandesDuJour(demandesNeuves(), ['colis'], '2026-11-19', 1), 'colis');
    expect(e.etapes).toEqual({ colis: 1 });
    expect(demandesDuJour(e, ['colis'], '2026-11-20', 1).etapes).toEqual({});
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
