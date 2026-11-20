// Les écritures de l'enfant (une image par mot écrit), gardées sur la tablette seulement (base
// « jeu-edu-ecritures », hors de l'export de sauvegarde). Elles partent la nuit vers le dépôt
// privé du rêve, qui les relit ; le parent peut aussi les vérifier chaque soir dans l'espace
// parent. Elles sont effacées de la tablette au bout de 14 jours, une fois envoyées.

import { memoire } from '../app/essai.ts';

export interface Ecriture {
  id: string;
  jour: string;
  mot: string;
  sorte: 'revision' | 'concours' | 'reprise';
  /** Temps d'écriture (ms) : pour le calcul seulement, jamais montré à l'enfant. */
  ms: number;
  /** Ce que l'enfant a dit en comparant (null : pas encore jugé). */
  enfant: boolean | null;
  /** Ce que le parent a décidé en vérifiant (null : pas vérifié). */
  parent: boolean | null;
  /** Ce que le rêve a lu la nuit (null : pas encore relu). */
  reve: boolean | null;
  /** Ce que le rêve ou le parent a lu (« batô »…). */
  lu?: string;
  envoyee: boolean;
  image: Blob;
}

const BASE = memoire('jeu-edu-ecritures');
const GARDE_JOURS = 14;

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const d = indexedDB.open(BASE, 1);
    d.onupgradeneeded = () => d.result.createObjectStore('ecritures', { keyPath: 'id' });
    d.onsuccess = () => ok(d.result);
    d.onerror = () => ko(d.error);
  });
}

async function magasin<T>(mode: IDBTransactionMode, f: (m: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await ouvrir();
  return new Promise((ok, ko) => {
    const r = f(db.transaction('ecritures', mode).objectStore('ecritures'));
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

export async function garderEcriture(e: Omit<Ecriture, 'id' | 'envoyee' | 'parent' | 'reve'>): Promise<string> {
  const id = `${e.jour}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
  try {
    await magasin('readwrite', (m) => m.put({ ...e, id, envoyee: false, parent: null, reve: null }));
  } catch {
    // Pas de place ou base indisponible : l'exercice continue sans garder l'image.
  }
  return id;
}

export async function toutesLesEcritures(): Promise<Ecriture[]> {
  try {
    const t = await magasin<Ecriture[]>('readonly', (m) => m.getAll() as IDBRequest<Ecriture[]>);
    return t.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export async function changerEcriture(id: string, changement: Partial<Ecriture>): Promise<void> {
  try {
    const e = await magasin<Ecriture | undefined>('readonly', (m) => m.get(id) as IDBRequest<Ecriture | undefined>);
    if (e) await magasin('readwrite', (m) => m.put({ ...e, ...changement }));
  } catch {
    // Rien à faire : la vérification reste à faire.
  }
}

/** Efface les écritures envoyées depuis plus de 14 jours. */
export async function oublierLesAnciennes(aujourdhui: string): Promise<void> {
  const limite = new Date(Date.parse(aujourdhui) - GARDE_JOURS * 86400000).toISOString().slice(0, 10);
  for (const e of await toutesLesEcritures()) if (e.envoyee && e.jour < limite) await magasin('readwrite', (m) => m.delete(e.id));
}

/** Le verdict qui compte : le parent d'abord, puis le rêve, puis l'enfant. */
export const verdict = (e: Ecriture): boolean | null => e.parent ?? e.reve ?? e.enfant;
