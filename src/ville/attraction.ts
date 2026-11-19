// L'attraction en construction à la fête foraine. Chaque journée où l'enfant aide les cinq forains,
// le chantier avance d'une étape (pour le plaisir de le voir monter : ça ne débloque rien). Ce qui
// termine l'attraction, c'est l'épreuve que propose son forain à partir du vendredi midi, que
// l'enfant ait aidé ou non : 3 problèmes, 2 justes suffisent. Manquée, l'enfant peut réessayer tout
// de suite, autant de fois qu'il veut, avec un seul problème. Réussie, l'attraction ouvre ; la
// suivante commence le lundi d'après.
// Pur : les heures et les jours sont passés en paramètres.

import { ajouterJours, ecartEnJours, jourDe, jourDeSemaine, type Jour } from '../memoire/jours.ts';

/** Les étapes visibles du chantier, une par journée d'aide. */
export const ETAPES = 5;
/** L'épreuve : ce nombre de problèmes, dont au moins REUSSIS_POUR_FINIR justes (au premier essai). */
export const PROBLEMES_EPREUVE = 3;
export const REUSSIS_POUR_FINIR = 2;
/** L'épreuve ouvre le vendredi à partir de cette heure. */
export const HEURE_EPREUVE = 12;
const VENDREDI = 5;

export interface Epreuve {
  jour: Jour;
  attraction: string;
  reussis: number;
  total: number;
}

export interface EtatAttraction {
  /** L'attraction en construction, ou null. */
  enCours: string | null;
  /** Le jour où son chantier commence ('' : à la première visite). */
  debut: Jour;
  /** Les journées d'aide comptées. */
  etapes: number;
  /** Le dernier jour compté. */
  compteLe: Jour;
  /** Le jour de la dernière épreuve manquée ('' : jamais manquée). */
  essaiLe: Jour;
  /** Le jour où l'enfant a entendu que le chantier avait avancé pendant la nuit. */
  vuLe: Jour;
  /** Les attractions terminées, dans l'ordre. */
  construites: string[];
  /** Les épreuves passées (pour le parent). */
  epreuves: Epreuve[];
  /** Le prénom que l'enfant a donné au forain de chaque attraction. */
  prenoms: Record<string, string>;
}

export const attractionNeuve = (premiere: string | null): EtatAttraction => ({
  enCours: premiere,
  debut: '',
  etapes: 0,
  compteLe: '',
  essaiLe: '',
  vuLe: '',
  construites: [],
  epreuves: [],
  prenoms: {},
});

/** À la première visite, le chantier commence aujourd'hui. */
export const commencer = (e: EtatAttraction, jour: Jour): EtatAttraction => (e.enCours && !e.debut ? { ...e, debut: jour } : e);

/** Le chantier est-il visible ce jour-là ? */
export const chantierOuvert = (e: EtatAttraction, jour: Jour): boolean => e.enCours !== null && e.debut !== '' && e.debut <= jour;

/** Les cinq forains ont fini ce jour-là : une étape de plus (une seule par jour). */
export function compterJournee(e: EtatAttraction, jour: Jour): EtatAttraction {
  if (!chantierOuvert(e, jour) || e.compteLe === jour) return e;
  return { ...e, etapes: Math.min(ETAPES, e.etapes + 1), compteLe: jour };
}

/** Les étapes qu'on voit : celle du jour n'apparaît que le lendemain (« pendant la nuit »). */
export const etapesVisibles = (e: EtatAttraction, jour: Jour): number => Math.max(0, e.etapes - (e.compteLe === jour ? 1 : 0));

/** Le chantier a-t-il avancé pendant la nuit, sans que l'enfant l'ait encore entendu ? */
export const aAvanceCetteNuit = (e: EtatAttraction, jour: Jour): boolean => chantierOuvert(e, jour) && e.compteLe !== '' && e.compteLe < jour && e.vuLe < e.compteLe && etapesVisibles(e, jour) > 0;

/** Le premier vendredi après le début du chantier (au moins un jour après). */
export function vendrediDEpreuve(debut: Jour): Jour {
  let j = ajouterJours(debut, 1);
  while (jourDeSemaine(j) !== VENDREDI) j = ajouterJours(j, 1);
  return j;
}

/** L'épreuve est-elle ouverte à cet instant ? */
export function epreuveOuverte(e: EtatAttraction, instant: Date): boolean {
  const jour = jourDe(instant);
  if (!chantierOuvert(e, jour)) return false;
  const vendredi = vendrediDEpreuve(e.debut);
  const ecart = ecartEnJours(vendredi, jour);
  return ecart > 0 || (ecart === 0 && instant.getHours() >= HEURE_EPREUVE);
}

/** L'enfant a-t-il déjà manqué l'épreuve de cette attraction ? */
export const aDejaManque = (e: EtatAttraction): boolean => e.essaiLe !== '';

/** Le nombre de problèmes de la prochaine épreuve : un seul après un échec. */
export const problemesDeLEpreuve = (e: EtatAttraction): number => (aDejaManque(e) ? 1 : PROBLEMES_EPREUVE);

/** Le lundi qui suit ce jour. */
export function lundiSuivant(jour: Jour): Jour {
  let j = ajouterJours(jour, 1);
  while (jourDeSemaine(j) !== 1) j = ajouterJours(j, 1);
  return j;
}

/** Le résultat de l'épreuve (total : le nombre de problèmes posés). Réussie : l'attraction est
 *  construite, la suivante (s'il y en a une) commence le lundi d'après. Manquée : on peut réessayer
 *  tout de suite, avec un seul problème. */
export function passerEpreuve(e: EtatAttraction, jour: Jour, reussis: number, total: number, suivante: string | null): EtatAttraction {
  if (!e.enCours) return e;
  const epreuves = [...e.epreuves, { jour, attraction: e.enCours, reussis, total }];
  if (reussis < (total === 1 ? 1 : REUSSIS_POUR_FINIR)) return { ...e, essaiLe: jour, epreuves };
  return { ...attractionNeuve(suivante), debut: suivante ? lundiSuivant(jour) : '', construites: [...e.construites, e.enCours], epreuves, prenoms: e.prenoms };
}

/** Relit l'état gardé ; une forme abîmée repart de la première attraction. */
export function lireAttraction(brut: unknown, premiere: string | null): EtatAttraction {
  const neuf = attractionNeuve(premiere);
  if (typeof brut !== 'object' || brut === null) return neuf;
  const o = brut as Partial<EtatAttraction>;
  const texte = (x: unknown): string => (typeof x === 'string' ? x : '');
  const textes = (x: unknown): string[] => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);
  if (!(typeof o.enCours === 'string' || o.enCours === null)) return neuf;
  return {
    enCours: o.enCours,
    debut: texte(o.debut),
    etapes: Number.isInteger(o.etapes) ? Math.max(0, Math.min(ETAPES, o.etapes as number)) : 0,
    compteLe: texte(o.compteLe),
    essaiLe: texte(o.essaiLe),
    vuLe: texte(o.vuLe),
    construites: textes(o.construites),
    epreuves: Array.isArray(o.epreuves)
      ? o.epreuves.filter((p): p is Epreuve => typeof p === 'object' && p !== null && typeof p.jour === 'string' && typeof p.attraction === 'string' && Number.isInteger(p.reussis) && Number.isInteger(p.total))
      : [],
    prenoms: Object.fromEntries(Object.entries(typeof o.prenoms === 'object' && o.prenoms ? o.prenoms : {}).filter((x): x is [string, string] => typeof x[1] === 'string')),
  };
}
