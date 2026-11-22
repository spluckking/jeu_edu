import { describe, expect, it } from 'vitest';
import {
  affiner,
  ajuster,
  avecRappel,
  cout,
  DEMI_WAGONNET,
  dPrime,
  ecartType,
  estLaCible,
  FACTEUR_MAX,
  lieuOuvertPar,
  lieuxOuverts,
  manchesDuJour,
  mesuresVides,
  NIVEAU_MAX,
  NIVEAU_SANS_RAPPEL,
  penche,
  piege,
  piegesPossibles,
  prochaineEpreuve,
  prochainObjet,
  reglageCaisses,
  reglagePilotage,
  reussiteCaisses,
  reussitEpreuve,
  tireCible,
  VITESSE_COTE,
  vitesseDeCote,
  zNormale,
  type Mesures,
} from './golem-express.ts';

const manche = (reussies: number, attrapees: number, piegesAttrapes: number): Mesures => ({
  ...mesuresVides(),
  epreuves: 100,
  reussies,
  cibles: 20,
  attrapees,
  pieges: 10,
  piegesAttrapes,
});

const cle = (o: ReturnType<typeof piege>): string => (o.sorte === 'tnt' ? 'tnt' : `${o.matiere}-${o.forme}`);

describe('le Golem Express', () => {
  it('un piège n’est jamais la cible, et ressemble plus aux hauts niveaux', () => {
    for (let i = 0; i < 500; i++) {
      const c = tireCible(Math.random);
      for (let r = 0; r <= 3; r++) {
        const p = piege(c, r, Math.random);
        expect(estLaCible(p, c)).toBe(false);
        // L'écran de consigne montre tous les pièges possibles : celui-ci en fait partie.
        expect(piegesPossibles(c, r).map(cle)).toContain(cle(p));
      }
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
    expect(piegesPossibles(c, 0)).toHaveLength(2);
    expect(piegesPossibles(c, 3).some((o) => estLaCible(o, c))).toBe(false);
  });

  it('environ 3 minerais sur 4 sont à attraper', () => {
    const c = tireCible(Math.random);
    let cibles = 0;
    for (let i = 0; i < 4000; i++) if (estLaCible(prochainObjet(c, 2, Math.random), c)) cibles++;
    expect(cibles / 4000).toBeGreaterThan(0.7);
    expect(cibles / 4000).toBeLessThan(0.8);
  });

  it('les niveaux rendent le jeu plus dur', () => {
    const facile = reglagePilotage(1);
    const dur = reglagePilotage(NIVEAU_MAX);
    expect(dur.vitesse).toBeGreaterThan(facile.vitesse);
    expect(dur.espacement).toBeLessThan(facile.espacement);
    expect(dur.largeurPorte).toBeLessThan(facile.largeurPorte);
    expect(dur.ecartMax).toBeGreaterThan(facile.ecartMax);
    expect(facile.partRochers).toBe(0);
    expect(reglageCaisses(NIVEAU_MAX).fenetre).toBeLessThan(reglageCaisses(1).fenetre);
    expect(reglageCaisses(1).ressemblance).toBe(0);
    expect(reglageCaisses(NIVEAU_MAX).ressemblance).toBe(3);
  });

  it('les portes restent dans la galerie et toujours atteignables', () => {
    for (let n = 1; n <= NIVEAU_MAX; n++) {
      const r = reglagePilotage(n);
      // Le temps entre deux épreuves suffit pour aller d'une porte à la suivante, même la plus loin.
      expect(r.ecartMax / VITESSE_COTE).toBeLessThan(r.espacement / r.vitesse);
      let x = 0;
      for (let i = 0; i < 300; i++) {
        const e = prochaineEpreuve(n, x, Math.random);
        expect(Math.abs(e.x) + (e.sorte === 'porte' ? e.largeur : 0)).toBeLessThanOrEqual(0.96);
        if (e.sorte === 'porte') x = e.x;
      }
    }
  });

  it('passer dans une porte, passer à côté d’un rocher', () => {
    const porte = { sorte: 'porte', x: 0.3, largeur: 0.2 } as const;
    expect(reussitEpreuve(porte, 0.35)).toBe(true);
    expect(reussitEpreuve(porte, 0.6)).toBe(false);
    const rocher = { sorte: 'rocher', x: 0, largeur: 0.26 } as const;
    expect(reussitEpreuve(rocher, 0.1)).toBe(false);
    expect(reussitEpreuve(rocher, 0.26 + DEMI_WAGONNET + 0.01)).toBe(true);
  });

  it('pencher la tablette : à plat, debout, couchée, et en paysage', () => {
    // Tablette debout, droite : la pesanteur tire vers le bas de l'écran.
    expect(penche({ x: 0, y: 9.8, z: 0 }, 0)).toBeCloseTo(0, 6);
    // Couchée vers l'arrière, toujours droite : pas de penche à gauche ou à droite.
    expect(penche({ x: 0, y: 6.9, z: 6.9 }, 0)).toBeCloseTo(0, 6);
    // Penchée de 20° sur le côté.
    const s = Math.sin((20 * Math.PI) / 180) * 9.8;
    const c = Math.cos((20 * Math.PI) / 180) * 9.8;
    expect(penche({ x: s, y: c, z: 0 }, 0)).toBeCloseTo(20, 4);
    // En paysage (écran tourné d'un quart de tour), c'est l'autre axe de la tablette qui compte.
    expect(Math.abs(penche({ x: c, y: s, z: 0 }, 90))).toBeCloseTo(20, 4);
    expect(Math.abs(penche({ x: c, y: s, z: 0 }, 270))).toBeCloseTo(20, 4);
  });

  it('la vitesse de côté : rien au milieu, plafonnée bien penchée', () => {
    expect(vitesseDeCote(1)).toBe(0);
    expect(vitesseDeCote(-1.5)).toBe(0);
    expect(vitesseDeCote(10)).toBeGreaterThan(0);
    expect(vitesseDeCote(-10)).toBeLessThan(0);
    expect(vitesseDeCote(45)).toBe(VITESSE_COTE);
    expect(vitesseDeCote(-45)).toBe(-VITESSE_COTE);
  });

  it('le réglage fin pendant la manche', () => {
    expect(affiner(1, 1, 2)).toBe(1);
    expect(affiner(1, 10, 10)).toBeGreaterThan(1);
    expect(affiner(1, 2, 10)).toBeLessThan(1);
    expect(affiner(1, 7, 10)).toBe(1);
    let f = 1;
    for (let i = 0; i < 50; i++) f = affiner(f, 10, 10);
    expect(f).toBe(FACTEUR_MAX);
  });

  it('attraper tous les minerais, pièges compris, ne fait pas 100 %', () => {
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
    // Les bons minerais, et presque aucun piège : un bon d′.
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

  it('les lieux s’ouvrent avec les wagons, et la journée a un nombre de manches', () => {
    expect(lieuxOuverts(0)).toEqual(['mine']);
    expect(lieuxOuverts(5)).toEqual(['mine', 'riviere', 'foret']);
    expect(lieuOuvertPar(2, 3)).toBe('riviere');
    expect(lieuOuvertPar(3, 4)).toBeNull();
    expect(manchesDuJour(10, 180)).toBe(3);
    expect(manchesDuJour(25, 90)).toBe(17);
    expect(manchesDuJour(1, 180)).toBe(1);
  });
});
