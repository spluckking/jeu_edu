import { describe, expect, it } from 'vitest';
import { lirePreparation } from '../reve/preparation.ts';
import P from '../../content/ville/programme.json';
import { atelierDuJour, ATELIERS, type Programme } from './programme.ts';

const prog: Programme = {
  questionsParStand: 6,
  semaines: [
    { lundi: '2026-11-23', titre: 'Les mesures', valide: true, ateliers: { horloge: 'mesures' }, focus: ['mesures.convertir'] },
    { lundi: '2026-11-30', titre: 'Pas encore validée', valide: false, ateliers: { horloge: 'phrases' }, focus: [] },
  ],
};

describe('le programme de la semaine', () => {
  it('les devoirs d’abord : le stand prend l’atelier de la semaine validée', () => {
    const a = atelierDuJour('horloge', '2026-11-25', prog, null)!;
    expect(a.atelier.id).toBe('mesures');
    expect(a.source).toBe('devoirs');
    expect(a.n).toBe(6);
    expect(a.focus).toEqual(['mesures.convertir']);
    // Les autres stands gardent leur travail habituel.
    expect(atelierDuJour('peche', '2026-11-25', prog, null)).toBeNull();
    // Une semaine pas validée ne change rien.
    expect(atelierDuJour('horloge', '2026-12-01', prog, null)).toBeNull();
  });

  it('ensuite le rêve : il choisit pour les stands libres, et seulement pour son jour', () => {
    const prep = lirePreparation({ jour: '2026-11-25', resume: '', niveaux: {}, focus: [], feuilleton: [], ateliers: { horloge: 'phrases', peche: 'fractions', chamboule: 'inconnu' }, competences: ['fractions.colorier', 'mesures.pas', 'pas une compétence !'] })!;
    expect(prep.ateliers).toEqual({ horloge: 'phrases', peche: 'fractions' });
    expect(prep.competences).toEqual(['fractions.colorier', 'mesures.pas']);
    // Le programme garde la main sur l'horloge ; le rêve ajoute ses compétences au focus.
    expect(atelierDuJour('horloge', '2026-11-25', prog, prep)!.atelier.id).toBe('mesures');
    expect(atelierDuJour('horloge', '2026-11-25', prog, prep)!.focus).toEqual(['mesures.convertir', 'fractions.colorier', 'mesures.pas']);
    const peche = atelierDuJour('peche', '2026-11-25', prog, prep)!;
    expect(peche.atelier.id).toBe('fractions');
    expect(peche.source).toBe('reve');
    expect(atelierDuJour('peche', '2026-11-26', prog, prep)).toBeNull();
  });

  it('le programme du jeu est bien formé', () => {
    const p = P as unknown as Programme;
    expect(p.questionsParStand).toBeGreaterThanOrEqual(3);
    for (const s of p.semaines) {
      expect(s.lundi).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const a of Object.values(s.ateliers)) expect(ATELIERS).toContain(a);
    }
  });
});
