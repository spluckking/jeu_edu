import { describe, expect, it } from 'vitest';
import { aider, apporter, avancement, choisir, complet, ouvrir, projetsNeufs, reste, terminer, verser } from './projets.ts';

const boulangerie = {
  id: 'boulangerie',
  recoltes: [
    { produit: 'pomme', nombre: 6 },
    { produit: 'mure', nombre: 6 },
  ],
  euros: 1500,
  aides: 3,
};

describe('grand projet', () => {
  it('ne prend que ce qui manque', () => {
    const r = apporter(boulangerie, projetsNeufs('boulangerie'), { pomme: 8, poisson: 2 });
    expect(r.pris).toEqual({ pomme: 6 });
    expect(reste(boulangerie, r.etat).recoltes).toEqual([{ produit: 'mure', nombre: 6 }]);
  });

  it('les euros, pas plus que ce qui manque', () => {
    const e = verser(boulangerie, projetsNeufs('boulangerie'), 1000);
    expect(e?.euros).toBe(1000);
    expect(e && verser(boulangerie, e, 600)).toBeNull();
    expect(e && verser(boulangerie, e, 500)?.euros).toBe(1500);
  });

  it('se termine quand tout y est, et ouvre le lendemain', () => {
    let e = apporter(boulangerie, projetsNeufs('boulangerie'), { pomme: 6, mure: 6 }).etat;
    e = verser(boulangerie, e, 1500) ?? e;
    expect(complet(boulangerie, e)).toBe(false);
    e = aider(aider(aider(e)));
    expect(complet(boulangerie, e)).toBe(true);
    expect(avancement(boulangerie, e)).toBe(1);
    e = terminer(e, '2026-11-18');
    expect(ouvrir(e, '2026-11-18')).toBe(e);
    const o = ouvrir(e, '2026-11-19');
    expect(o.construits).toEqual(['boulangerie']);
    expect(o.enCours).toBeNull();
    expect(choisir(o, 'musee').enCours).toBe('musee');
  });

  it('avance au fil des apports', () => {
    const e = apporter(boulangerie, projetsNeufs('boulangerie'), { pomme: 3 }).etat;
    expect(avancement(boulangerie, e)).toBeCloseTo(3 / 30);
  });
});
