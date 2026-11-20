// L'état de la ville, gardé sur la tablette (IndexedDB), à part de la sauvegarde du jeu actuel
// tant que la ville est en construction : rien de ce que l'enfant a gagné n'est touché.

import { nettoyerPrenom } from '../histoire/lecture.ts';
import { memoire } from '../app/essai.ts';
import { dicteeNeuve, type EtatDictee } from '../dictee/etat.ts';
import type { PorteMonnaie } from './argent.ts';
import { POMMES_PAR_ARBRE, type Panier, type Pommier, type Ventes } from './commerce.ts';
import { demandesNeuves, type EtatDemandes } from './demandes.ts';
import { parcelleLibre, type Parcelle } from './jardin.ts';
import { posteNeuve, type EtatPoste } from './poste.ts';
import { projetsNeufs, type EtatProjets } from './projets.ts';

/** Le premier grand projet de la ville. */
export const PREMIER_PROJET = 'boulangerie';
import { riviereNeuve, type EtatRiviere } from './riviere.ts';
import { attractionNeuve, lireAttraction, type EtatAttraction } from './attraction.ts';
import attractions from '../../content/ville/attractions.json';
import { gazetteNeuve, lireGazette, type EtatGazette } from './gazette.ts';

/** La première attraction construite à la fête foraine. */
export const PREMIERE_ATTRACTION = attractions.attractions[0]?.id ?? null;

/** Le potager compte toujours ce nombre de parcelles. */
export const PARCELLES = 4;

export interface EtatVille {
  version: 10;
  /** Le prénom que l'enfant a donné à son personnage (vide : pas encore choisi). */
  prenom: string;
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
  /** Les demandes du jour des habitants. */
  demandes: EtatDemandes;
  /** Le jour où le lot de fin de séance a été choisi. */
  lotChoisi: string;
  /** Les meubles gagnés, posés devant la maison. */
  meubles: string[];
  /** Le potager : ce qui pousse dans chaque parcelle. */
  parcelles: Parcelle[];
  /** La pêche du jour et les buissons de mûres cueillis. */
  riviere: EtatRiviere;
  /** Le tri du courrier et les lettres à livrer. */
  poste: EtatPoste;
  /** Le grand projet en cours et les lieux déjà construits. */
  projets: EtatProjets;
  /** L'attraction en construction à la fête foraine, et celles déjà construites. */
  attraction: EtatAttraction;
  /** La Gazette : le dernier jour lu, les histoires lues, la chronique. */
  gazette: EtatGazette;
}

export function etatNeuf(): EtatVille {
  return {
    version: 10,
    prenom: '',
    position: { x: 0, z: 6, cap: Math.PI },
    lus: [],
    dictee: dicteeNeuve(),
    porteMonnaie: {},
    panier: {},
    pommier: { restantes: POMMES_PAR_ARBRE, repousse: null },
    ventes: { jour: '', nombre: 0 },
    demandes: demandesNeuves(),
    lotChoisi: '',
    meubles: [],
    parcelles: Array.from({ length: PARCELLES }, parcelleLibre),
    riviere: riviereNeuve(),
    poste: posteNeuve(),
    projets: projetsNeufs(PREMIER_PROJET),
    attraction: attractionNeuve(PREMIERE_ATTRACTION),
    gazette: gazetteNeuve(),
  };
}

/** Un compteur { clé: entier positif } : les entrées abîmées sont ignorées. */
function compteur(v: unknown): Record<string, number> {
  if (typeof v !== 'object' || v === null) return {};
  return Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => Number.isInteger(e[1]) && e[1] > 0));
}

/** Relit un état brut (versions 1 à 10) ; un état illisible repart de zéro plutôt que de bloquer le jeu. */
export function lireEtat(brut: unknown): EtatVille {
  const neuf = etatNeuf();
  if (typeof brut !== 'object' || brut === null) return neuf;
  const o = brut as Partial<EtatVille>;
  const p = o.position;
  const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const pom = o.pommier;
  const v = o.ventes;
  const d = o.demandes;
  const textes = (x: unknown): string[] => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);
  const parcelles = Array.isArray(o.parcelles) ? o.parcelles : [];
  const riv = o.riviere;
  const po = o.poste;
  const pj = o.projets;
  const entier = (x: unknown): number => (Number.isInteger(x) && (x as number) >= 0 ? (x as number) : 0);
  return {
    version: 10,
    // Avant la version 9, pas de prénom : il est demandé à l'arrivée.
    prenom: typeof o.prenom === 'string' ? nettoyerPrenom(o.prenom) : '',
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
    // Les versions 1 et 2 n'avaient ni demandes, ni lot, ni meubles.
    demandes:
      d && typeof d.jour === 'string'
        ? {
            jour: d.jour,
            ids: textes(d.ids),
            acceptees: textes(d.acceptees),
            faites: textes(d.faites),
            historique: Object.fromEntries(Object.entries(typeof d.historique === 'object' && d.historique ? d.historique : {}).filter((x): x is [string, string] => typeof x[1] === 'string')),
            etapes: compteur(d.etapes),
          }
        : demandesNeuves(),
    lotChoisi: typeof o.lotChoisi === 'string' ? o.lotChoisi : '',
    meubles: textes(o.meubles),
    // Avant la version 4, pas de potager : toutes les parcelles sont libres.
    parcelles: Array.from({ length: PARCELLES }, (_, i) => {
      const x = parcelles[i] as Partial<Parcelle> | undefined;
      return x && (typeof x.graine === 'string' || x.graine === null) ? { graine: x.graine, arrosages: textes(x.arrosages) } : parcelleLibre();
    }),
    // Avant la version 5, ni pêche ni cueillette.
    riviere:
      riv && typeof riv.peche === 'string' && riv.cueillis && typeof riv.cueillis.jour === 'string'
        ? { peche: riv.peche, cueillis: { jour: riv.cueillis.jour, buissons: Array.isArray(riv.cueillis.buissons) ? riv.cueillis.buissons.filter((x): x is number => Number.isInteger(x)) : [] } }
        : riviereNeuve(),
    // Avant la version 6, pas de poste.
    poste: po && typeof po.tri === 'string' ? { tri: po.tri, aLivrer: textes(po.aLivrer), paye: typeof po.paye === 'string' ? po.paye : '' } : posteNeuve(),
    // Avant la version 7, pas de grand projet : la boulangerie commence.
    projets:
      pj && (typeof pj.enCours === 'string' || pj.enCours === null)
        ? { enCours: pj.enCours, donnes: compteur(pj.donnes), euros: entier(pj.euros), aides: entier(pj.aides), termine: typeof pj.termine === 'string' ? pj.termine : '', construits: textes(pj.construits) }
        : projetsNeufs(PREMIER_PROJET),
    // Avant la version 8, pas d'attraction en construction : la première commence.
    attraction: lireAttraction(o.attraction, PREMIERE_ATTRACTION),
    // Avant la version 10, pas de Gazette : la première se lit au prochain lancement.
    gazette: lireGazette(o.gazette),
  };
}

const BASE = memoire('jeu-edu-ville');

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
