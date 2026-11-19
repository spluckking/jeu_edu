import { describe, expect, it } from 'vitest';
import { changerListe, dicteeNeuve, estJourDeConcours, importerDicteeBlocs, jamaisVu, lireListe, motsRestants, noter, noterConcours, revisionDuJour } from './etat.ts';
import { aReconstituer, tuiles } from './tuiles.ts';

const LISTE = '# Dictée n°5 : La Préhistoire\nun homme | Un homme allume un feu.\nla grotte | La famille dort dans la grotte.\npendant | Pendant l’hiver, il fait froid.';

describe('liste de dictée', () => {
  it('lit le format de Dictée-Blocs', () => {
    const l = lireListe(`${LISTE}\nun homme | doublon`);
    expect(l.titre).toBe('Dictée n°5 : La Préhistoire');
    expect(l.mots.map((m) => m.w)).toEqual(['un homme', 'la grotte', 'pendant']);
  });

  it('nouvelle semaine : les anciens mots entrent dans la mémoire longue', () => {
    let e = changerListe(dicteeNeuve(), LISTE, '2026-11-16');
    e = changerListe(e, '# Dictée n°6\nla grotte | encore\nun chat | Le chat dort.', '2026-11-23');
    expect(Object.keys(e.memoire).sort()).toEqual(['pendant', 'un homme']);
    expect(e.memoire['un homme']?.semaine).toBe('Dictée n°5 : La Préhistoire');
    expect(e.mots.map((m) => m.w)).toEqual(['la grotte', 'un chat']);
  });

  it('même titre : une correction garde la progression', () => {
    let e = changerListe(dicteeNeuve(), LISTE, '2026-11-16');
    e = revisionDuJour(e, '2026-11-16');
    e = noter(e, 'pendant', { juste: true, indice: false, hesite: false, reponse: 'pendant' }, '2026-11-16').etat;
    e = changerListe(e, `${LISTE}\nun outil | Le silex est un outil.`, '2026-11-16');
    expect(e.progres.pendant?.boite).toBe(2);
    expect(e.mots).toHaveLength(4);
  });
});

describe('révision du jour', () => {
  it('tous les mots, jusqu’à ce que tout soit juste', () => {
    let e = revisionDuJour(changerListe(dicteeNeuve(), LISTE, '2026-11-16'), '2026-11-16');
    expect(motsRestants(e)).toHaveLength(3);
    expect(jamaisVu(e, 'pendant')).toBe(true);
    e = noter(e, 'pendant', { juste: false, indice: false, hesite: false, reponse: 'pandant' }, '2026-11-16').etat;
    expect(motsRestants(e)).toHaveLength(3);
    for (const w of ['un homme', 'la grotte', 'pendant']) e = noter(e, w, { juste: true, indice: false, hesite: false, reponse: w }, '2026-11-16').etat;
    expect(e.quotidien.fini).toBe(true);
    expect(jamaisVu(e, 'pendant')).toBe(false);
  });

  it('la veille de la dictée est le jour du concours', () => {
    const e = changerListe(dicteeNeuve(), LISTE, '2026-11-16');
    expect(estJourDeConcours(e, '2026-11-19')).toBe(true); // jeudi
    expect(estJourDeConcours(e, '2026-11-18')).toBe(false);
    expect(noterConcours(e, '2026-11-19', [{ w: 'pendant', juste: true }, { w: 'la grotte', juste: false }]).concours[0]).toEqual({ date: '2026-11-19', justes: 1, total: 2, rates: ['la grotte'] });
  });
});

describe('import de Dictée-Blocs', () => {
  it('reprend la liste, les boîtes, la mine et les mots sus', () => {
    const e = importerDicteeBlocs(
      {
        version: 1,
        listTitle: 'Dictée n°5',
        dictationDay: 5,
        words: [{ w: 'la grotte', sentence: 'La famille dort.' }],
        progress: { 'la grotte': { box: 2, success: 3, fail: 1, errors: { grote: 1 }, nextDue: '2026-11-18', lastSeen: '2026-11-17' } },
        archive: { chevaux: { interval: 7, ease: 2.4, streak: 2, ok: 3, fail: 0, nextDue: '2026-11-20', sentence: 'Les chevaux.', week: 'Dictée n°4' } },
        retired: [{ w: 'maison', week: 'Dictée n°1', date: '2026-10-01' }],
        blanche: [{ date: '2026-11-13', score: 18, total: 20 }],
      },
      '2026-11-18',
    );
    expect(e?.mots).toEqual([{ w: 'la grotte', phrase: 'La famille dort.' }]);
    expect(e?.progres['la grotte']?.boite).toBe(2);
    expect(e?.memoire.chevaux?.intervalle).toBe(7);
    expect(e?.retires[0]?.w).toBe('maison');
    expect(e?.concours[0]?.justes).toBe(18);
    expect(importerDicteeBlocs({ pas: 'ça' }, '2026-11-18')).toBeNull();
  });
});

describe('tuiles', () => {
  it('les lettres du mot sans déterminant, plus deux, mélangées', () => {
    let graine = 1;
    const hasard = (): number => ((graine = (graine * 16807) % 2147483647) / 2147483647);
    const t = tuiles('la grotte', hasard);
    expect(aReconstituer('la grotte')).toBe('grotte');
    expect(t).toHaveLength(8);
    expect([...'grotte'].every((c) => t.includes(c))).toBe(true);
  });
});
