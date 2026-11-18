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

  it('reprend une sauvegarde de la version 1 sans argent ni panier', () => {
    const e = lireEtat({ version: 1, position: { x: 1, z: 2, cap: 0 }, lus: ['forain-accueil'] });
    expect(e.version).toBe(7);
    expect(e.projets.enCours).toBe('boulangerie');
    expect(e.poste).toEqual({ tri: '', aLivrer: [] });
    expect(e.riviere).toEqual({ peche: '', cueillis: { jour: '', buissons: [] } });
    expect(e.parcelles).toHaveLength(4);
    expect(e.demandes).toEqual(etatNeuf().demandes);
    expect(e.meubles).toEqual([]);
    expect(e.position).toEqual({ x: 1, z: 2, cap: 0 });
    expect(e.porteMonnaie).toEqual({});
    expect(e.panier).toEqual({});
    expect(e.pommier).toEqual(etatNeuf().pommier);
  });

  it('garde l’argent, le panier et le pommier, sans les valeurs abîmées', () => {
    const e = lireEtat({ porteMonnaie: { 500: 1, 200: -1, 100: 1.5 }, panier: { pomme: 2, pain: 'x' }, pommier: { restantes: 0, repousse: '2026-11-20' }, ventes: { jour: '2026-11-18', nombre: 3 } });
    expect(e.porteMonnaie).toEqual({ 500: 1 });
    expect(e.panier).toEqual({ pomme: 2 });
    expect(e.pommier).toEqual({ restantes: 0, repousse: '2026-11-20' });
    expect(e.ventes).toEqual({ jour: '2026-11-18', nombre: 3 });
  });

  it('garde les demandes du jour et les meubles gagnés', () => {
    const e = lireEtat({ demandes: { jour: '2026-11-18', ids: ['a', 3], acceptees: ['a'], faites: [], historique: { a: '2026-11-11', b: 4 } }, lotChoisi: '2026-11-18', meubles: ['meuble-banc'] });
    expect(e.demandes).toEqual({ jour: '2026-11-18', ids: ['a'], acceptees: ['a'], faites: [], historique: { a: '2026-11-11' } });
    expect(e.lotChoisi).toBe('2026-11-18');
    expect(e.meubles).toEqual(['meuble-banc']);
  });

  it('garde le potager, et complète les parcelles abîmées', () => {
    const e = lireEtat({ parcelles: [{ graine: 'graines-carotte', arrosages: ['2026-11-18', 3] }, 'x'] });
    expect(e.parcelles[0]).toEqual({ graine: 'graines-carotte', arrosages: ['2026-11-18'] });
    expect(e.parcelles[1]).toEqual({ graine: null, arrosages: [] });
    expect(e.parcelles).toHaveLength(4);
  });
});
