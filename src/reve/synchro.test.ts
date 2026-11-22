import { describe, expect, it } from 'vitest';
import { sauvegardeNeuve } from '../sauvegarde/format.ts';
import { envoisAPreparer, synchroniser, type Recuperer } from './synchro.ts';

const reponse = (instant: string) => ({
  instant,
  stand: 'chamboule',
  manche: 'semaine' as const,
  element: 'x-6-7',
  reponse: '42',
  reussi: true,
  aide: false,
  duree: 900,
});

describe('échange avec le dépôt privé', () => {
  it('un fichier de journal par jour joué, puis les validations et la mémoire', () => {
    const s = { ...sauvegardeNeuve(), forains: { chamboule: 'Léon' }, journal: [reponse('2026-11-16T10:00:00')] };
    const envois = envoisAPreparer(s, '2026-11-16');
    expect(envois.map((e) => e.chemin)).toEqual(['journal/2026-11-16.json', 'validations.json', 'etats.json', 'stats.json']);
    // Les prénoms (et donc aucun prénom) ne partent pas.
    expect(JSON.stringify(envois)).not.toContain('Léon');
  });

  it('dépose les fichiers et lit la préparation, sans jamais l’exécuter', async () => {
    const appels: Array<{ url: string; methode: string }> = [];
    const preparation = { jour: '2026-11-17', resume: 'Tout va bien.', focus: ['x-6-7'] };
    const faux: Recuperer = async (url, init) => {
      appels.push({ url, methode: init?.method ?? 'GET' });
      if (url.endsWith('preparation.json')) {
        const contenu = Buffer.from(JSON.stringify(preparation)).toString('base64');
        return new Response(JSON.stringify({ content: contenu }), { status: 200 });
      }
      if (init?.method === 'PUT') return new Response('{}', { status: 201 });
      return new Response('{}', { status: 404 });
    };
    const s = { ...sauvegardeNeuve(), journal: [reponse('2026-11-16T10:00:00')] };
    const r = await synchroniser(s, { depot: 'parent/reve', cle: 'cle-essai' }, '2026-11-16', faux);
    expect(r.preparation).toMatchObject({ jour: '2026-11-17', focus: ['x-6-7'] });
    expect(appels.filter((a) => a.methode === 'PUT')).toHaveLength(4);
    expect(appels.every((a) => a.url.startsWith('https://api.github.com/repos/parent/reve/contents/'))).toBe(true);
  });

  it('une clé refusée donne un message clair', async () => {
    const faux: Recuperer = async () => new Response('{}', { status: 401 });
    await expect(synchroniser(sauvegardeNeuve(), { depot: 'parent/reve', cle: 'x' }, '2026-11-16', faux)).rejects.toThrow(/clé/);
  });
});
