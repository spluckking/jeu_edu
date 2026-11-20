// La dictée et le rêve : chaque échange dépose dans le dépôt privé l'état de la dictée (la
// mémoire de chaque mot, les concours) et les écritures pas encore envoyées (une image par mot,
// avec ce que l'enfant et le parent en ont dit). La nuit, le rêve relit les images ; sa
// préparation renvoie ce qu'il a lu (juste ou faux, ce qui est écrit) et les mots à revoir en
// priorité. Voir docs/reve-dictee.md (la consigne à donner au rêve).

import type { EtatDictee } from '../dictee/etat.ts';
import type { Envoi } from '../reve/synchro.ts';
import { changerEcriture, oublierLesAnciennes, toutesLesEcritures } from './ecritures.ts';

/** Ce que le rêve renvoie pour la dictée (dans preparation.json, champ « dictee »). */
export interface RetourDictee {
  /** Le jour de la préparation (pour ne l'appliquer qu'une fois). */
  jour: string;
  prioritaires: string[];
  lectures: Array<{ id: string; mot: string; juste: boolean; lu?: string }>;
}

export function lireRetourDictee(brut: unknown): RetourDictee | null {
  if (typeof brut !== 'object' || brut === null) return null;
  const o = brut as { jour?: unknown; dictee?: unknown };
  const d = o.dictee as { prioritaires?: unknown; lectures?: unknown } | undefined;
  if (!d || typeof d !== 'object') return null;
  const textes = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  const lectures = Array.isArray(d.lectures)
    ? d.lectures.flatMap((l: unknown) => {
        const x = l as { id?: unknown; mot?: unknown; juste?: unknown; lu?: unknown };
        return typeof x?.id === 'string' && typeof x.mot === 'string' && typeof x.juste === 'boolean'
          ? [{ id: x.id, mot: x.mot, juste: x.juste, ...(typeof x.lu === 'string' ? { lu: x.lu } : {}) }]
          : [];
      })
    : [];
  return { jour: typeof o.jour === 'string' ? o.jour : '', prioritaires: textes(d.prioritaires).slice(0, 20), lectures };
}

/** Les fichiers à déposer : l'état de la dictée, puis, par jour, la liste des écritures et les images pas encore parties. */
export async function envoisDictee(e: EtatDictee): Promise<Envoi[]> {
  const envois: Envoi[] = [
    {
      chemin: 'dictee/etat.json',
      contenu: { titre: e.titre, jourDictee: e.jourDictee, mots: e.mots, fiches: e.fiches, concours: e.concours, retires: e.retires, prioritaires: e.prioritaires },
    },
  ];
  const ecritures = await toutesLesEcritures();
  const jours = new Set(ecritures.map((x) => x.jour));
  for (const jour of jours) {
    const duJour = ecritures.filter((x) => x.jour === jour);
    envois.push({
      chemin: `dictee/ecritures/${jour}.json`,
      contenu: duJour.map((x) => ({ id: x.id, mot: x.mot, sorte: x.sorte, ms: x.ms, enfant: x.enfant, parent: x.parent, reve: x.reve, ...(x.lu ? { lu: x.lu } : {}), image: `${jour}/${x.id}.png` })),
    });
    for (const x of duJour.filter((y) => !y.envoyee)) envois.push({ chemin: `dictee/ecritures/${jour}/${x.id}.png`, contenu: null, octets: new Uint8Array(await x.image.arrayBuffer()) });
  }
  return envois;
}

/** Après l'échange : les images parties sont marquées, les plus anciennes oubliées. */
export async function apresEnvoi(chemins: readonly string[], aujourdhui: string): Promise<void> {
  const partis = new Set(chemins);
  for (const x of await toutesLesEcritures()) if (!x.envoyee && partis.has(`dictee/ecritures/${x.jour}/${x.id}.png`)) await changerEcriture(x.id, { envoyee: true });
  await oublierLesAnciennes(aujourdhui);
}
