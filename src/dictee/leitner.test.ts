import { describe, expect, it } from 'vitest';
import { ajouter, appliquer, joursAvantDictee, motNeuf, prochaineDate, reviser, souvenirDe, souvenirsDus, type Tentative } from './leitner.ts';

const t = (p: Partial<Tentative>): Tentative => ({ juste: true, indice: false, hesite: false, reponse: '', jour: '2026-11-16', joursRestants: 4, ...p });

describe('boîtes de la semaine (Dictée-Blocs)', () => {
  it('jours avant la dictée du vendredi', () => {
    expect(joursAvantDictee(5, '2026-11-16')).toBe(4); // lundi
    expect(joursAvantDictee(5, '2026-11-19')).toBe(1); // jeudi
    expect(joursAvantDictee(5, '2026-11-20')).toBe(0);
  });

  it('une réussite sûre fait monter, une seule fois par jour', () => {
    const a = appliquer(undefined, t({}));
    expect(a.etat.boite).toBe(2);
    expect(a.changement).toBe('monte');
    expect(appliquer(a.etat, t({})).etat.boite).toBe(2);
    expect(appliquer(a.etat, t({ jour: '2026-11-17' })).etat.boite).toBe(3);
  });

  it('un indice ou « j’hésite » ne fait pas monter ; une erreur renvoie en boîte 1', () => {
    expect(appliquer(undefined, t({ indice: true })).etat.boite).toBe(1);
    expect(appliquer(undefined, t({ hesite: true })).etat.boite).toBe(1);
    const e = appliquer({ ...motNeuf(), boite: 3 }, t({ juste: false, reponse: 'chevos' }));
    expect(e.etat.boite).toBe(1);
    expect(e.etat.erreurs).toEqual({ chevos: 1 });
  });

  it('jamais revu après la veille de la dictée', () => {
    expect(prochaineDate(3, '2026-11-16', 4)).toBe('2026-11-18');
    expect(prochaineDate(3, '2026-11-18', 2)).toBe('2026-11-19');
  });
});

describe('mémoire longue', () => {
  it('un mot su revient de plus en plus tard, puis est retiré', () => {
    let s = souvenirDe({ ...motNeuf(), boite: 3 }, '2026-11-20', 'phrase', 'Dictée 5');
    let j = s.prochaine;
    let retire = false;
    for (let i = 0; i < 10 && !retire; i++) {
      const r = reviser(s, { juste: true, hesite: false }, j);
      s = r.souvenir;
      retire = r.retire;
      j = ajouter(j, s.intervalle);
    }
    expect(retire).toBe(true);
    expect(s.serie).toBeGreaterThanOrEqual(4);
  });

  it('une erreur fait revenir le mot le lendemain', () => {
    const s = souvenirDe(undefined, '2026-11-20', '', '');
    const r = reviser({ ...s, intervalle: 10 }, { juste: false, hesite: false }, '2026-12-01');
    expect(r.souvenir.prochaine).toBe('2026-12-02');
    expect(r.souvenir.serie).toBe(0);
  });

  it('les mots dus, les plus en retard d’abord', () => {
    const base = souvenirDe(undefined, '2026-11-01', '', '');
    const m = { a: { ...base, prochaine: '2026-11-10' }, b: { ...base, prochaine: '2026-11-05' }, c: { ...base, prochaine: '2026-12-01' } };
    expect(souvenirsDus(m, '2026-11-12')).toEqual(['b', 'a']);
  });
});
