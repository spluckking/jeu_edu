// L'état de la ville, gardé sur la tablette (IndexedDB), à part de la sauvegarde du jeu actuel
// tant que la ville est en construction : rien de ce que l'enfant a gagné n'est touché.

import { dicteeNeuve, type EtatDictee } from '../dictee/etat.ts';
import type { PorteMonnaie } from './argent.ts';
import { POMMES_PAR_ARBRE, type Panier, type Pommier, type Ventes } from './commerce.ts';

export interface EtatVille {
  version: 2;
  /** Où se trouve le personnage, et vers où il regarde. */
  position: { x: number; z: number; cap: number };
  /** Les dialogues déjà lus. */
  lus: string[];
  /** Les mots de dictée : liste de la semaine, boîtes, mémoire longue, mur des mots. */
  dictee: EtatDictee;
  /** Pièces et billets de l'enfant (valeur en centimes : nombre). */
  porteMonnaie: PorteMonnaie;
  /** Ce qu'il a acheté ou cueilli (produit : nombre). */
  panier: Panier;
  pommier: Pommier;
  /** Récoltes revendues à l'épicière ce jour-là (elle en prend un nombre limité). */
  ventes: Ventes;
}

export function etatNeuf(): EtatVille {
  return {
    version: 2,
    position: { x: 0, z: 6, cap: Math.PI },
    lus: [],
    dictee: dicteeNeuve(),
    porteMonnaie: {},
    panier: {},
    pommier: { restantes: POMMES_PAR_ARBRE, repousse: null },
    ventes: { jour: '', nombre: 0 },
  };
}

/** Un compteur { clé: entier positif } : les entrées abîmées sont ignorées. */
function compteur(v: unknown): Record<string, number> {
  if (typeof v !== 'object' || v === null) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => Number.isInteger(e[1]) && e[1] > 0));
}

/** Relit un état brut (version 1 ou 2) ; un état illisible repart de zéro plutôt que de bloquer le jeu. */
export function lireEtat(brut: unknown): EtatVille {
  const neuf = etatNeuf();
  if (typeof brut !== 'object' || brut === null) return neuf;
  const o = brut as Partial<EtatVille>;
  const p = o.position;
  const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const pom = o.pommier;
  const v = o.ventes;
  return {
    version: 2,
    position: p && nombre(p.x) && nombre(p.z) && nombre(p.cap) ? { x: p.x, z: p.z, cap: p.cap } : neuf.position,
    lus: Array.isArray(o.lus) ? o.lus.filter((x): x is string => typeof x === 'string') : [],
    // L'état de la dictée n'est écrit que par le jeu lui-même : on le reprend s'il a la bonne forme.
    dictee:
      typeof o.dictee === 'object' && o.dictee !== null && (o.dictee as Partial<EtatDictee>).version === 1 && Array.isArray((o.dictee as Partial<EtatDictee>).mots)
        ? { ...dicteeNeuve(), ...o.dictee }
        : dicteeNeuve(),
    // La version 1 n'avait ni argent, ni panier, ni pommier : ils partent de zéro.
    porteMonnaie: compteur(o.porteMonnaie),
    panier: compteur(o.panier),
    pommier:
      pom && Number.isInteger(pom.restantes) && pom.restantes >= 0 && (pom.repousse === null || typeof pom.repousse === 'string')
        ? { restantes: Math.min(pom.restantes, POMMES_PAR_ARBRE), repousse: pom.repousse }
        : neuf.pommier,
    ventes: v && typeof v.jour === 'string' && Number.isInteger(v.nombre) ? { jour: v.jour, nombre: v.nombre } : neuf.ventes,
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
