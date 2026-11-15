import { describe, expect, it } from 'vitest';
import { ajouterJours, jourDe, jourDeSemaine } from './jours.ts';
import {
  avancer,
  elementEnCours,
  enregistrer,
  estPrioritaire,
  etatNeuf,
  finDePriorite,
  mancheFinie,
  nouvelleManche,
  revisionsDuJour,
  type EtatElement,
  type Reponse,
} from './moteur.ts';

const SAMEDI = '2026-11-14';
const LUNDI = '2026-11-16';
const JEUDI = '2026-11-19';

function reponse(jour: string, reussi: boolean, autres: Partial<Reponse> = {}): Reponse {
  return { jour, reussi, aide: false, reponse: '', duree: 1000, prioritaire: false, rattrapage: false, ...autres };
}

/** Un hasard prévisible, pour des tests stables. */
function hasardFixe(): () => number {
  let graine = 1;
  return () => {
    graine = (graine * 16807) % 2147483647;
    return graine / 2147483647;
  };
}

describe('jours', () => {
  it('lit le jour local et compte les jours', () => {
    expect(jourDe(new Date(2026, 10, 14, 23, 30))).toBe(SAMEDI);
    expect(ajouterJours(SAMEDI, 2)).toBe(LUNDI);
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(jourDeSemaine(JEUDI)).toBe(4);
  });
});

describe('semaine prioritaire', () => {
  it("dure jusqu'au jeudi soir suivant l'arrivée", () => {
    expect(finDePriorite(SAMEDI)).toBe(JEUDI);
    expect(finDePriorite(LUNDI)).toBe(JEUDI);
  });

  it("un contenu arrivé un jeudi reste prioritaire jusqu'au jeudi d'après", () => {
    expect(finDePriorite(JEUDI)).toBe('2026-11-26');
  });

  it('couvre le jour de fin et pas le lendemain', () => {
    expect(estPrioritaire(SAMEDI, JEUDI)).toBe(true);
    expect(estPrioritaire(SAMEDI, '2026-11-20')).toBe(false);
  });
});

describe('révisions du jour', () => {
  const elements = [{ id: 'x-6-7', arrivees: [SAMEDI] }];

  it('un élément prioritaire revient chaque jour, même réussi la veille', () => {
    const etats = { 'x-6-7': enregistrer(etatNeuf(), reponse(SAMEDI, true, { prioritaire: true })) };
    expect(revisionsDuJour(SAMEDI, elements, etats).semaine).toEqual([]);
    expect(revisionsDuJour('2026-11-15', elements, etats).semaine).toEqual(['x-6-7']);
    expect(revisionsDuJour(JEUDI, elements, etats).semaine).toEqual(['x-6-7']);
  });

  it('après la semaine, il revient un intervalle après son dernier passage', () => {
    const etats = { 'x-6-7': enregistrer(etatNeuf(), reponse(JEUDI, true, { prioritaire: true })) };
    expect(revisionsDuJour('2026-11-20', elements, etats)).toEqual({ semaine: [], memoire: [] });
    expect(revisionsDuJour('2026-11-26', elements, etats).memoire).toEqual(['x-6-7']);
  });

  it("jamais vu pendant sa semaine, il passe en mémoire dès le vendredi", () => {
    expect(revisionsDuJour('2026-11-20', elements, {}).memoire).toEqual(['x-6-7']);
  });

  it('un contenu pas encore arrivé ne compte pas', () => {
    expect(revisionsDuJour('2026-11-13', elements, {})).toEqual({ semaine: [], memoire: [] });
  });

  it('un élément présent dans un contenu prioritaire reste prioritaire', () => {
    const double = [{ id: 'x-6-7', arrivees: ['2026-10-01', LUNDI] }];
    expect(revisionsDuJour(LUNDI, double, {}).semaine).toEqual(['x-6-7']);
  });
});

describe('liste globale', () => {
  it('les intervalles grandissent à chaque réussite : 7, 14, 30, 60, puis 60', () => {
    let etat: EtatElement = etatNeuf();
    let jour = '2026-11-20';
    const ecarts: number[] = [];
    for (let i = 0; i < 5; i++) {
      etat = enregistrer(etat, reponse(jour, true));
      const suivant = etat.echeance ?? jour;
      ecarts.push(Math.round((Date.parse(suivant) - Date.parse(jour)) / 86_400_000));
      jour = suivant;
    }
    expect(ecarts).toEqual([7, 14, 30, 60, 60]);
  });

  it("une erreur fait revenir l'élément le lendemain et repart du début", () => {
    let etat = enregistrer(etatNeuf(), reponse('2026-11-20', true));
    etat = enregistrer(etat, reponse('2026-11-27', true));
    etat = enregistrer(etat, reponse('2026-12-11', false));
    expect(etat.echeance).toBe('2026-12-12');
    etat = enregistrer(etat, reponse('2026-12-12', true));
    expect(etat.echeance).toBe('2026-12-19');
  });

  it('une réussite avec aide revient deux fois plus tôt, sans monter de rang', () => {
    let etat = enregistrer(etatNeuf(), reponse('2026-11-20', true));
    etat = enregistrer(etat, reponse('2026-11-27', true, { aide: true }));
    expect(etat.niveau).toBe(0);
    expect(etat.echeance).toBe('2026-12-01');
  });

  it("un rattrapage dans la manche ne change pas le retour fixé par l'erreur", () => {
    let etat = enregistrer(etatNeuf(), reponse('2026-11-20', false));
    etat = enregistrer(etat, reponse('2026-11-20', true, { rattrapage: true }));
    expect(etat.echeance).toBe('2026-11-21');
    expect(etat.derniereReussite).toBe('2026-11-20');
  });

  it("garde la réponse exacte donnée, dans un historique court", () => {
    let etat = etatNeuf();
    for (let i = 0; i < 12; i++) etat = enregistrer(etat, reponse(SAMEDI, false, { reponse: String(i) }));
    expect(etat.historique).toHaveLength(10);
    expect(etat.historique.at(-1)?.reponse).toBe('11');
    expect(etat.echecs).toBe(12);
  });
});

describe('manche', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  it('prend au plus huit éléments, dans un ordre mélangé', () => {
    const manche = nouvelleManche(ids, hasardFixe());
    expect(manche.file).toHaveLength(8);
    expect(new Set(manche.file).size).toBe(8);
    expect(manche.file).not.toEqual(ids.slice(0, 8));
  });

  it('un élément raté revient trois éléments plus loin', () => {
    let manche = nouvelleManche(['a', 'b', 'c', 'd', 'e'], () => 0.999);
    const premier = elementEnCours(manche);
    manche = avancer(manche, false);
    expect(manche.file.indexOf(premier ?? '')).toBe(3);
  });

  it("un élément raté deux fois est laissé pour aujourd'hui, la manche finit toujours", () => {
    let manche = nouvelleManche(['a'], () => 0);
    manche = avancer(manche, false);
    expect(manche.file).toEqual(['a']);
    manche = avancer(manche, false);
    expect(mancheFinie(manche)).toBe(true);
    expect(manche.faits).toEqual([]);
  });
});
