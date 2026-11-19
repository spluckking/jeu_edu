import { describe, expect, it } from 'vitest';
import {
  aAvanceCetteNuit,
  attractionNeuve,
  chantierOuvert,
  commencer,
  compterJournee,
  epreuveOuverte,
  ETAPES,
  etapesVisibles,
  lireAttraction,
  lundiSuivant,
  passerEpreuve,
  vendrediDEpreuve,
} from './attraction.ts';

// Le jeudi 19 novembre 2026 ; le vendredi 20 ; le lundi 23.
const JEUDI = '2026-11-19';
const VENDREDI = '2026-11-20';
const a = (h: number, jour = VENDREDI): Date => new Date(`${jour}T${String(h).padStart(2, '0')}:00:00`);
const roue = (): ReturnType<typeof attractionNeuve> => commencer(attractionNeuve('grande-roue'), JEUDI);

describe('l’attraction en construction', () => {
  it('le chantier commence à la première visite', () => {
    expect(chantierOuvert(attractionNeuve('grande-roue'), JEUDI)).toBe(false);
    expect(chantierOuvert(roue(), JEUDI)).toBe(true);
    expect(commencer(roue(), VENDREDI).debut).toBe(JEUDI);
  });

  it('une étape par journée d’aide, jamais deux le même jour, et pas plus que le maximum', () => {
    let e = compterJournee(roue(), JEUDI);
    e = compterJournee(e, JEUDI);
    expect(e.etapes).toBe(1);
    for (let i = 1; i <= 10; i++) e = compterJournee(e, `2026-11-${19 + i}`);
    expect(e.etapes).toBe(ETAPES);
  });

  it('l’étape du jour n’apparaît que le lendemain, et on l’annonce une fois', () => {
    const e = compterJournee(roue(), JEUDI);
    expect(etapesVisibles(e, JEUDI)).toBe(0);
    expect(etapesVisibles(e, VENDREDI)).toBe(1);
    expect(aAvanceCetteNuit(e, JEUDI)).toBe(false);
    expect(aAvanceCetteNuit(e, VENDREDI)).toBe(true);
    expect(aAvanceCetteNuit({ ...e, vuLe: VENDREDI }, VENDREDI)).toBe(false);
  });

  it('l’épreuve ouvre le vendredi à midi, même sans aucune aide', () => {
    expect(vendrediDEpreuve(JEUDI)).toBe(VENDREDI);
    expect(epreuveOuverte(roue(), a(18, JEUDI))).toBe(false);
    expect(epreuveOuverte(roue(), a(11))).toBe(false);
    expect(epreuveOuverte(roue(), a(12))).toBe(true);
    expect(epreuveOuverte(roue(), a(9, '2026-11-22'))).toBe(true);
  });

  it('un chantier commencé un vendredi attend le vendredi suivant', () => {
    expect(vendrediDEpreuve(VENDREDI)).toBe('2026-11-27');
    expect(epreuveOuverte(commencer(attractionNeuve('x'), VENDREDI), a(15))).toBe(false);
  });

  it('épreuve manquée : on réessaie le lendemain', () => {
    const e = passerEpreuve(roue(), VENDREDI, 1, null);
    expect(e.enCours).toBe('grande-roue');
    expect(epreuveOuverte(e, a(16))).toBe(false);
    expect(epreuveOuverte(e, a(10, '2026-11-21'))).toBe(true);
    expect(e.epreuves).toEqual([{ jour: VENDREDI, attraction: 'grande-roue', reussis: 1, total: 3 }]);
  });

  it('épreuve réussie : l’attraction est construite, la suivante commence le lundi', () => {
    const e = passerEpreuve(compterJournee(roue(), JEUDI), VENDREDI, 2, 'carrousel');
    expect(e.construites).toEqual(['grande-roue']);
    expect(e.enCours).toBe('carrousel');
    expect(e.debut).toBe(lundiSuivant(VENDREDI));
    expect(e.debut).toBe('2026-11-23');
    expect(e.etapes).toBe(0);
    expect(chantierOuvert(e, '2026-11-22')).toBe(false);
    const fin = passerEpreuve(roue(), VENDREDI, 3, null);
    expect(fin.enCours).toBeNull();
    expect(chantierOuvert(fin, VENDREDI)).toBe(false);
  });

  it('un état abîmé repart de la première attraction', () => {
    expect(lireAttraction(null, 'grande-roue')).toEqual(attractionNeuve('grande-roue'));
    expect(lireAttraction({ enCours: 3 }, 'grande-roue')).toEqual(attractionNeuve('grande-roue'));
    const e = compterJournee(roue(), JEUDI);
    expect(lireAttraction(structuredClone(e), 'grande-roue')).toEqual(e);
    expect(lireAttraction({ ...e, etapes: 99 }, 'grande-roue').etapes).toBe(ETAPES);
  });
});
