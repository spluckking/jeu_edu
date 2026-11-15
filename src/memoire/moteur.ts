// Moteur de mémoire : fonctions pures, sans horloge ni hasard cachés.
// Le jour et le tirage au hasard sont toujours passés en paramètre.

import { ajouterJours, jourDeSemaine, type Jour } from './jours.ts';
import {
  HISTORIQUE_COURT,
  INTERVALLES,
  JOUR_FIN_PRIORITE,
  RETOUR_APRES_ERREUR,
  RETOUR_DANS_LA_MANCHE,
  TAILLE_MANCHE,
} from './reglages.ts';

export interface Passage {
  jour: Jour;
  reussi: boolean;
  /** Réponse obtenue avec une aide : réussite fragile. */
  aide: boolean;
  /** La réponse exacte donnée par l'enfant. */
  reponse: string;
  /** Temps de réponse en millisecondes (jamais utilisé pour récompenser). */
  duree: number;
}

export interface EtatElement {
  /** Rang dans les intervalles de la liste globale ; -1 = pas encore de rang. */
  niveau: number;
  /** Prochain jour où l'élément revient dans la liste globale ; null = pas encore fixé. */
  echeance: Jour | null;
  reussites: number;
  echecs: number;
  /** Dernier jour où l'élément a été vu. */
  dernierPassage: Jour | null;
  /** Dernier jour où l'élément a été réussi : il ne revient plus ce jour-là. */
  derniereReussite: Jour | null;
  historique: Passage[];
}

export function etatNeuf(): EtatElement {
  return {
    niveau: -1,
    echeance: null,
    reussites: 0,
    echecs: 0,
    dernierPassage: null,
    derniereReussite: null,
    historique: [],
  };
}

/** Le jeudi soir qui clôt la semaine prioritaire d'un contenu arrivé ce jour-là. */
export function finDePriorite(arrivee: Jour): Jour {
  const ecart = (JOUR_FIN_PRIORITE - jourDeSemaine(arrivee) + 7) % 7;
  return ajouterJours(arrivee, ecart === 0 ? 7 : ecart);
}

export function estPrioritaire(arrivee: Jour, jour: Jour): boolean {
  return jour >= arrivee && jour <= finDePriorite(arrivee);
}

/** Jour où un élément sorti de la semaine prioritaire revient pour la première fois. */
function premiereEcheance(etat: EtatElement, finPriorite: Jour): Jour {
  // Vu pendant la semaine : premier rappel un intervalle plus tard. Jamais vu : tout de suite.
  if (etat.dernierPassage) return ajouterJours(etat.dernierPassage, INTERVALLES[0]);
  return ajouterJours(finPriorite, 1);
}

/** Un élément tel que le moteur le voit : son identifiant et les arrivées de ses contenus. */
export interface ElementSuivi {
  id: string;
  /** Jours d'arrivée des contenus qui contiennent cet élément. */
  arrivees: Jour[];
}

export interface Revisions {
  /** Manche « Cette semaine » : éléments des contenus prioritaires pas encore réussis aujourd'hui. */
  semaine: string[];
  /** Manche « Mémoire » : éléments de la liste globale arrivés à échéance. */
  memoire: string[];
}

export function revisionsDuJour(
  jour: Jour,
  elements: ElementSuivi[],
  etats: Record<string, EtatElement>,
): Revisions {
  const semaine: string[] = [];
  const memoire: string[] = [];
  for (const element of elements) {
    const etat = etats[element.id] ?? etatNeuf();
    if (etat.derniereReussite === jour) continue;
    const arrivees = element.arrivees.filter((arrivee) => arrivee <= jour);
    if (arrivees.length === 0) continue;
    if (arrivees.some((arrivee) => estPrioritaire(arrivee, jour))) {
      semaine.push(element.id);
      continue;
    }
    const derniereFin = arrivees.map(finDePriorite).sort().at(-1) ?? jour;
    const echeance = etat.echeance ?? premiereEcheance(etat, derniereFin);
    if (echeance <= jour) memoire.push(element.id);
  }
  return { semaine, memoire };
}

export interface Reponse {
  jour: Jour;
  reussi: boolean;
  aide: boolean;
  reponse: string;
  duree: number;
  /** L'élément est prioritaire aujourd'hui : il revient chaque jour, sans rang dans la liste globale. */
  prioritaire: boolean;
  /** Deuxième essai dans la même manche, après une erreur : l'erreur a déjà fixé le retour. */
  rattrapage: boolean;
}

export function enregistrer(etat: EtatElement, reponse: Reponse): EtatElement {
  const passage: Passage = {
    jour: reponse.jour,
    reussi: reponse.reussi,
    aide: reponse.aide,
    reponse: reponse.reponse,
    duree: reponse.duree,
  };
  const suivant: EtatElement = {
    ...etat,
    reussites: etat.reussites + (reponse.reussi ? 1 : 0),
    echecs: etat.echecs + (reponse.reussi ? 0 : 1),
    dernierPassage: reponse.jour,
    derniereReussite: reponse.reussi ? reponse.jour : etat.derniereReussite,
    historique: [...etat.historique, passage].slice(-HISTORIQUE_COURT),
  };
  if (reponse.prioritaire || reponse.rattrapage) return suivant;

  if (!reponse.reussi) {
    return { ...suivant, niveau: -1, echeance: ajouterJours(reponse.jour, RETOUR_APRES_ERREUR) };
  }
  if (reponse.aide) {
    // Réussite fragile : même rang, retour deux fois plus tôt.
    const intervalle = INTERVALLES[Math.max(etat.niveau, 0)] ?? INTERVALLES[0];
    return { ...suivant, echeance: ajouterJours(reponse.jour, Math.max(1, Math.ceil(intervalle / 2))) };
  }
  const niveau = Math.min(etat.niveau + 1, INTERVALLES.length - 1);
  const intervalle = INTERVALLES[niveau] ?? INTERVALLES[0];
  return { ...suivant, niveau, echeance: ajouterJours(reponse.jour, intervalle) };
}

// --- La manche : une file d'éléments dans un stand ---------------------------

export type Hasard = () => number;

export function melanger<T>(liste: readonly T[], hasard: Hasard): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    const a = copie[i] as T;
    copie[i] = copie[j] as T;
    copie[j] = a;
  }
  return copie;
}

export interface Manche {
  /** Éléments qui restent à faire, le premier est celui en cours. */
  file: string[];
  /** Éléments déjà ratés une fois dans cette manche : leur prochain essai est un rattrapage. */
  rates: string[];
  /** Nombre d'éléments différents de la manche, pour la barre de progression. */
  total: number;
  /** Éléments réussis (au premier essai ou en rattrapage). */
  faits: string[];
}

export function nouvelleManche(ids: readonly string[], hasard: Hasard, taille = TAILLE_MANCHE): Manche {
  const choisis = melanger(ids, hasard).slice(0, taille);
  return { file: choisis, rates: [], total: choisis.length, faits: [] };
}

export function elementEnCours(manche: Manche): string | undefined {
  return manche.file[0];
}

export function estRattrapage(manche: Manche, id: string): boolean {
  return manche.rates.includes(id);
}

/** Avance la manche après une réponse. Une erreur fait revenir l'élément quelques éléments plus loin. */
export function avancer(manche: Manche, reussi: boolean): Manche {
  const [id, ...reste] = manche.file;
  if (id === undefined) return manche;
  if (reussi) return { ...manche, file: reste, faits: [...manche.faits, id] };
  // Deuxième erreur sur le même élément : on montre la réponse et on passe, sans insister.
  if (manche.rates.includes(id)) return { ...manche, file: reste };
  const position = Math.min(RETOUR_DANS_LA_MANCHE, reste.length);
  const file = [...reste.slice(0, position), id, ...reste.slice(position)];
  const rates = manche.rates.includes(id) ? manche.rates : [...manche.rates, id];
  return { ...manche, file, rates };
}

export function mancheFinie(manche: Manche): boolean {
  return manche.file.length === 0;
}
