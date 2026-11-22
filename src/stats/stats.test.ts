import { describe, expect, it } from 'vitest';
import { competenceDe, niveaux, pointsFaibles, statistiques, taux, type Reponse } from './stats.ts';

const r = (jour: string, stand: string, element: string, reussi: boolean, competence?: string, duree = 5000): Reponse => ({ instant: `${jour}T10:00:00.000Z`, stand, element, reussi, aide: false, duree, ...(competence ? { competence } : {}) });

describe('les statistiques', () => {
  it('déduit la compétence des anciens stands', () => {
    expect(competenceDe(r('2026-11-20', 'chamboule', 'x-3-7', true))).toBe('tables.3');
    expect(competenceDe(r('2026-11-20', 'chantier', 'add-r:49+4', true))).toBe('calcul.add-r');
    expect(competenceDe(r('2026-11-20', 'chantier', 'pb-retrait:48-15', true))).toBe('calcul.pb-retrait');
    expect(competenceDe(r('2026-11-20', 'horloge', 'lire-demie:8:30', true))).toBe('heure.lire-demie');
    expect(competenceDe(r('2026-11-20', 'peche', 'et:3', true))).toBe('homophones.et');
    expect(competenceDe(r('2026-11-20', 'confiserie', 'm-école', true))).toBe('mots');
    expect(competenceDe(r('2026-11-20', 'mesures', 'x', true, 'mesures.convertir.m-cm'))).toBe('mesures.convertir.m-cm');
  });

  it('compte chaque niveau, sur 7 jours et avant', () => {
    expect(niveaux('mesures.convertir.m-cm')).toEqual(['mesures', 'mesures.convertir', 'mesures.convertir.m-cm']);
    const journal = [
      r('2026-11-01', 'mesures', 'a', false, 'mesures.convertir.m-cm', 9000),
      r('2026-11-20', 'mesures', 'b', true, 'mesures.convertir.m-cm', 4000),
      r('2026-11-21', 'mesures', 'c', true, 'mesures.pas', 6000),
      { ...r('2026-11-21', 'mesures', 'd', true, 'mesures.pas'), aide: true },
    ];
    const s = statistiques(journal, '2026-11-22');
    expect(s.mesures).toMatchObject({ total: 4, justes: 2, recents: { total: 3, justes: 2 }, avant: { total: 1, justes: 0 }, dernier: '2026-11-21', jours: 3 });
    expect(s['mesures.convertir.m-cm']).toMatchObject({ total: 2, justes: 1, duree: 6.5 });
    expect(taux(s['mesures.pas']!)).toBe(50);
  });

  it('les points faibles : les compétences précises réussies moins de 7 fois sur 10', () => {
    const journal = [
      ...Array.from({ length: 5 }, (_, i) => r('2026-11-21', 'chamboule', `x-7-${i + 2}`, i < 2)),
      ...Array.from({ length: 5 }, (_, i) => r('2026-11-21', 'chamboule', `x-3-${i + 2}`, true)),
      ...Array.from({ length: 2 }, () => r('2026-11-21', 'mesures', 'x', false, 'mesures.pas')),
    ];
    expect(pointsFaibles(statistiques(journal, '2026-11-22'))).toEqual(['tables.7']);
  });
});
