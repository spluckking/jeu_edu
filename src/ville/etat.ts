// L'état de la ville, gardé sur la tablette (IndexedDB), à part de la sauvegarde du jeu actuel
// tant que la ville est en construction : rien de ce que l'enfant a gagné n'est touché.

import { dicteeNeuve, type EtatDictee } from '../dictee/etat.ts';

export interface EtatVille {
  version: 1;
  /** Où se trouve le personnage, et vers où il regarde. */
  position: { x: number; z: number; cap: number };
  /** Les dialogues déjà lus. */
  lus: string[];
  /** Les mots de dictée : liste de la semaine, boîtes, mémoire longue, mur des mots. */
  dictee: EtatDictee;
}

export function etatNeuf(): EtatVille {
  return { version: 1, position: { x: 0, z: 6, cap: Math.PI }, lus: [], dictee: dicteeNeuve() };
}

/** Relit un état brut ; un état illisible repart de zéro plutôt que de bloquer le jeu. */
export function lireEtat(brut: unknown): EtatVille {
  const neuf = etatNeuf();
  if (typeof brut !== 'object' || brut === null) return neuf;
  const o = brut as Partial<EtatVille>;
  const p = o.position;
  const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  return {
    version: 1,
    position: p && nombre(p.x) && nombre(p.z) && nombre(p.cap) ? { x: p.x, z: p.z, cap: p.cap } : neuf.position,
    lus: Array.isArray(o.lus) ? o.lus.filter((x): x is string => typeof x === 'string') : [],
    // L'état de la dictée n'est écrit que par le jeu lui-même : on le reprend s'il a la bonne forme.
    dictee:
      typeof o.dictee === 'object' && o.dictee !== null && (o.dictee as Partial<EtatDictee>).version === 1 && Array.isArray((o.dictee as Partial<EtatDictee>).mots)
        ? { ...dicteeNeuve(), ...o.dictee }
        : dicteeNeuve(),
  };
}

const BASE = 'jeu-edu-ville';

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const d = indexedDB.open(BASE, 1);
    d.onupgradeneeded = () => d.result.createObjectStore('donnees');
    d.onsuccess = () => ok(d.result);
    d.onerror = () => ko(d.error);
  });
}

export async function chargerEtat(): Promise<EtatVille> {
  try {
    const db = await ouvrir();
    return await new Promise((ok) => {
      const r = db.transaction('donnees').objectStore('donnees').get('etat');
      r.onsuccess = () => ok(lireEtat(r.result));
      r.onerror = () => ok(etatNeuf());
    });
  } catch {
    return etatNeuf();
  }
}

export async function sauverEtat(e: EtatVille): Promise<void> {
  const db = await ouvrir();
  await new Promise<void>((ok, ko) => {
    const t = db.transaction('donnees', 'readwrite');
    t.objectStore('donnees').put(structuredClone(e), 'etat');
    t.oncomplete = () => ok();
    t.onerror = () => ko(t.error);
  });
}
