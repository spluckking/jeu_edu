import { describe, expect, it } from 'vitest';
import { ajuster, avecRappel, cout, dPrime, ecartType, NIVEAU_SANS_RAPPEL, zNormale, estLaCible, mesuresVides, NIVEAU_MAX, piege, prochainObjet, reglageCaisses, reglagePilotage, reussiteCaisses, tireCible, type Mesures } from './golem-express.ts';

const manche = (surChemin: number, attrapees: number, piegesAttrapes: number): Mesures => ({
  ...mesuresVides(),
  temps: 100,
  surChemin,
  cibles: 20,
  attrapees,
  pieges: 10,
  piegesAttrapes,
});

describe('le Golem Express', () => {
  it('un piège n’est jamais la cible, et ressemble plus aux hauts niveaux', () => {
    for (let i = 0; i < 500; i++) {
      const c = tireCible(Math.random);
      for (let r = 0; r <= 3; r++) expect(estLaCible(piege(c, r, Math.random), c)).toBe(false);
      const p = piege(c, 0, Math.random);
      expect(p.sorte === 'tnt' || (p.sorte === 'minerai' && p.matiere === 'charbon')).toBe(true);
    }
    let memeMatiere = 0;
    const c = { matiere: 'diamant', forme: 'bloc' } as const;
    for (let i = 0; i < 1000; i++) {
      const p = piege(c, 3, Math.random);
      if (p.sorte === 'minerai' && p.matiere === 'diamant') memeMatiere++;
    }
    expect(memeMatiere).toBeGreaterThan(100);
  });

  it('environ 3 caisses sur 4 sont à attraper', () => {
    const c = tireCible(Math.random);
    let cibles = 0;
    for (let i = 0; i < 4000; i++) if (estLaCible(prochainObjet(c, 2, Math.random), c)) cibles++;
    expect(cibles / 4000).toBeGreaterThan(0.7);
    expect(cibles / 4000).toBeLessThan(0.8);
  });

  it('les niveaux rendent le jeu plus dur', () => {
    expect(reglagePilotage(NIVEAU_MAX).vitesse).toBeGreaterThan(reglagePilotage(1).vitesse);
    expect(reglagePilotage(NIVEAU_MAX).largeur).toBeLessThan(reglagePilotage(1).largeur);
    expect(reglageCaisses(NIVEAU_MAX).fenetre).toBeLessThan(reglageCaisses(1).fenetre);
    expect(reglageCaisses(1).ressemblance).toBe(0);
    expect(reglageCaisses(NIVEAU_MAX).ressemblance).toBe(3);
  });

  it('attraper toutes les caisses, pièges compris, ne fait pas 100 %', () => {
    expect(reussiteCaisses(manche(100, 20, 10))).toBe(0.5);
    expect(reussiteCaisses(manche(100, 20, 0))).toBe(1);
  });

  it('chaque tâche a son niveau, réglé à part', () => {
    const n = { pilotage: 5, caisses: 5 };
    const a = ajuster(n, manche(90, 19, 1), 0);
    expect(a.niveaux).toEqual({ pilotage: 6, caisses: 6 });
    expect(a.etoile).toBe(true);
    const b = ajuster(n, manche(90, 12, 6), 0);
    expect(b.niveaux).toEqual({ pilotage: 6, caisses: 4 });
    expect(b.etoile).toBe(false);
    const c = ajuster(n, manche(75, 15, 2), 0);
    expect(c.niveaux).toEqual({ pilotage: 5, caisses: 5 });
  });

  it('deux manches difficiles d’affilée : deux crans plus facile', () => {
    const n = { pilotage: 6, caisses: 6 };
    const a = ajuster(n, manche(50, 10, 5), 0);
    expect(a.niveaux).toEqual({ pilotage: 5, caisses: 5 });
    expect(a.difficiles).toBe(1);
    const b = ajuster(a.niveaux, manche(50, 10, 5), a.difficiles);
    expect(b.niveaux).toEqual({ pilotage: 3, caisses: 3 });
    expect(ajuster({ pilotage: 1, caisses: 1 }, manche(10, 0, 10), 3).niveaux).toEqual({ pilotage: 1, caisses: 1 });
  });

  it('la régularité des réactions', () => {
    expect(ecartType([500, 500, 500])).toBe(0);
    expect(ecartType([400, 600])).toBeCloseTo(141.4, 0);
  });

  it('le d′ : distinguer les cibles des pièges', () => {
    expect(zNormale(0.5)).toBeCloseTo(0, 6);
    expect(zNormale(0.975)).toBeCloseTo(1.96, 2);
    expect(zNormale(0.01)).toBeCloseTo(-2.326, 2);
    // Tout attraper, pièges compris : aucune distinction.
    expect(Math.abs(dPrime(manche(100, 20, 10)))).toBeLessThan(0.5);
    // Les bonnes caisses, et presque aucun piège : un bon d′.
    expect(dPrime(manche(100, 19, 1))).toBeGreaterThan(2);
    expect(dPrime(manche(100, 19, 1))).toBeGreaterThan(dPrime(manche(100, 15, 4)));
  });

  it('le coût de la double tâche', () => {
    expect(cout(2, 1.5)).toBe(25);
    expect(cout(100, 90)).toBe(10);
    expect(cout(1, 1.2)).toBe(-20);
    expect(cout(0, 1)).toBeNull();
  });

  it('la cible n’est plus rappelée aux hauts niveaux', () => {
    expect(avecRappel(1)).toBe(true);
    expect(avecRappel(NIVEAU_SANS_RAPPEL)).toBe(false);
  });
});
