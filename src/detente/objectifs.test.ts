import { describe, expect, it } from 'vitest';
import { compter, completerSuivi, installer, lireRecompense, objectif, PLACES, prochaineRecompense, seuil, suiviManegesNeuf, type SuiviManeges } from './objectifs.ts';

describe('objectifs des manèges', () => {
  it('les paliers montent et ne finissent jamais', () => {
    expect([0, 1, 2, 3, 4].map((r) => seuil('autos', r))).toEqual([10, 25, 45, 70, 100]);
    expect(seuil('autos', 5)).toBe(135);
    expect(seuil('autos', 6)).toBe(170);
    expect(seuil('glaces', 0)).toBe(1);
    expect(seuil('glaces', 7)).toBe(30);
  });

  it('compter franchit un palier au bon moment, et le total se garde', () => {
    let s = suiviManegesNeuf();
    for (let i = 0; i < 9; i++) {
      const r = compter(s, 'autos');
      expect(r.palier).toBe(false);
      s = r.suivi;
    }
    const r = compter(s, 'autos');
    expect(r.palier).toBe(true);
    expect(r.suivi.compte.autos).toBe(10);
    expect(objectif(r.suivi, 'autos')).toEqual({ fait: 10, depuis: 10, but: 25, unite: 'étoiles' });
    expect(objectif(suiviManegesNeuf(), 'glaces')).toEqual({ fait: 0, depuis: 0, but: 1, unite: 'palais traversé' });
  });

  it('lit un cadeau écrit par le rêve, et refuse ce qui n’existe pas', () => {
    const s = suiviManegesNeuf();
    expect(lireRecompense('ballons-bleu', 'autos', s, [])).toEqual({ type: 'decoration', modele: 'ballons', teinte: 'bleu' });
    expect(lireRecompense('coupe', 'autos', s, [])).toEqual({ type: 'decoration', modele: 'coupe', teinte: 'jaune' });
    expect(lireRecompense('chapeau-pilote', 'glaces', s, [])).toEqual({ type: 'accessoire', lot: 'chapeau-pilote' });
    expect(lireRecompense('chapeau-pilote', 'autos', s, ['chapeau-pilote'])).toBeNull();
    expect(lireRecompense('fusee', 'autos', s, [])).toBeNull();
    expect(lireRecompense('ballons-noir', 'autos', s, [])).toBeNull();
    // Les lots de la vitrine ne se gagnent pas aux manèges.
    expect(lireRecompense('chapeau-couronne', 'autos', s, [])).toBeNull();
  });

  it('pas deux fois le même objet au même manège, et six places au plus', () => {
    let s = installer(suiviManegesNeuf(), 'autos', { type: 'decoration', modele: 'ballons', teinte: 'rouge' });
    expect(lireRecompense('ballons-bleu', 'autos', s, [])).toBeNull();
    expect(lireRecompense('ballons-bleu', 'trampoline', s, [])).not.toBeNull();
    const plein: SuiviManeges = { ...s, decorations: { ...s.decorations, autos: Array.from({ length: PLACES }, () => ({ modele: 'coupe', teinte: 'jaune' })) } };
    expect(lireRecompense('nounours', 'autos', plein, [])).toBeNull();
    s = installer(s, 'autos', { type: 'accessoire', lot: 'objet-volant' });
    expect(s.decorations.autos).toHaveLength(1);
  });

  it('le prochain cadeau : celui du rêve s’il est possible, sinon l’ordre prévu', () => {
    const s = suiviManegesNeuf();
    expect(prochaineRecompense('autos', s, [])).toEqual({ type: 'decoration', modele: 'ballons', teinte: 'rouge' });
    expect(prochaineRecompense('autos', s, [], 'nounours-vert')).toEqual({ type: 'decoration', modele: 'nounours', teinte: 'vert' });
    expect(prochaineRecompense('autos', s, [], 'n-importe-quoi')).toEqual({ type: 'decoration', modele: 'ballons', teinte: 'rouge' });
    const apres = installer(s, 'autos', { type: 'decoration', modele: 'ballons', teinte: 'rouge' });
    expect(prochaineRecompense('autos', apres, [])).toEqual({ type: 'accessoire', lot: 'chapeau-pilote' });
    expect(prochaineRecompense('autos', apres, ['chapeau-pilote'])).toEqual({ type: 'decoration', modele: 'fanions', teinte: 'jaune' });
  });

  it('quand tout est gagné, plus de cadeau (le rêve pourra en ajouter)', () => {
    let s = suiviManegesNeuf();
    const possedes: string[] = [];
    for (let i = 0; i < 20; i++) {
      const r = prochaineRecompense('glaces', s, possedes);
      if (!r) break;
      if (r.type === 'accessoire') possedes.push(r.lot);
      s = installer(s, 'glaces', r);
    }
    expect(s.decorations.glaces).toHaveLength(PLACES);
    expect(possedes).toEqual(['lunettes-miroir', 'haut-paillettes']);
    expect(prochaineRecompense('glaces', s, possedes)).toBeNull();
  });
});

describe('un nouveau manège', () => {
  it('complète un suivi d’avant les chaises volantes, sans rien changer d’autre', () => {
    const ancien = { compte: { autos: 12, trampoline: 3, glaces: 1 }, paliers: { autos: 1, trampoline: 0, glaces: 1 }, decorations: { autos: [{ modele: 'ballons', teinte: 'rouge' }], trampoline: [], glaces: [] } } as unknown as SuiviManeges;
    const s = completerSuivi(ancien);
    expect(s.compte).toEqual({ autos: 12, trampoline: 3, glaces: 1, chaises: 0 });
    expect(s.decorations.chaises).toEqual([]);
    expect(s.decorations.autos).toHaveLength(1);
  });
});
