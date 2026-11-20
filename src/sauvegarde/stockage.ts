// La sauvegarde vit dans IndexedDB, sur la tablette.

import { JOURNAL_MAX, migrer, type Sauvegarde } from './format.ts';
import { memoire } from '../app/essai.ts';

const BASE = memoire('jeu-edu');
const MAGASIN = 'donnees';
const CLE = 'sauvegarde';

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(BASE, 1);
    demande.onupgradeneeded = () => {
      demande.result.createObjectStore(MAGASIN);
    };
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

let base: Promise<IDBDatabase> | null = null;

function laBase(): Promise<IDBDatabase> {
  base ??= ouvrir();
  return base;
}

export async function lireSauvegarde(): Promise<Sauvegarde> {
  // Demande au navigateur de ne pas effacer les données quand la place manque.
  void navigator.storage?.persist?.().catch(() => false);
  const db = await laBase();
  const brut = await new Promise<unknown>((resoudre, rejeter) => {
    const demande = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).get(CLE);
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
  return migrer(brut);
}

export async function ecrireSauvegarde(sauvegarde: Sauvegarde): Promise<void> {
  if (sauvegarde.journal.length > JOURNAL_MAX) {
    sauvegarde.journal = sauvegarde.journal.slice(-JOURNAL_MAX);
  }
  const db = await laBase();
  await new Promise<void>((resoudre, rejeter) => {
    const transaction = db.transaction(MAGASIN, 'readwrite');
    transaction.objectStore(MAGASIN).put(sauvegarde, CLE);
    transaction.oncomplete = () => resoudre();
    transaction.onerror = () => rejeter(transaction.error);
  });
}
