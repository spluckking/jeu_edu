// Copie de secours de la sauvegarde : un fichier que le parent garde où il veut, et qu'il peut
// recharger (après avoir vidé le cache, ou sur une autre tablette). La clé du dépôt privé n'y
// est pas : elle reste à part, sur la tablette.

import { migrer, type Sauvegarde } from './format.ts';

const MARQUE = 'jeu-edu-sauvegarde';

interface Fichier {
  format: typeof MARQUE;
  exportee: string;
  sauvegarde: Sauvegarde;
}

/** Le fichier à télécharger : son nom et son contenu. */
export function exporterSauvegarde(s: Sauvegarde, jour: string, maintenant = new Date()): { nom: string; texte: string } {
  const fichier: Fichier = { format: MARQUE, exportee: maintenant.toISOString(), sauvegarde: s };
  return { nom: `fete-foraine-${jour}.json`, texte: JSON.stringify(fichier) };
}

export interface Import {
  sauvegarde: Sauvegarde;
  /** Date de l'export (ISO), pour la montrer au parent avant de remplacer. */
  exportee: string;
}

const PAS_UNE_SAUVEGARDE = 'Ce fichier n’est pas une sauvegarde de la fête foraine.';

function objet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Lit un fichier exporté. Lance une erreur au message lisible par le parent s'il ne convient pas. */
export function importerSauvegarde(texte: string): Import {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error(PAS_UNE_SAUVEGARDE);
  }
  if (!objet(brut) || brut.format !== MARQUE || !objet(brut.sauvegarde)) throw new Error(PAS_UNE_SAUVEGARDE);
  let s: Sauvegarde;
  try {
    s = migrer(brut.sauvegarde);
  } catch {
    throw new Error('Cette sauvegarde vient d’une version plus récente du jeu : mets d’abord le jeu à jour.');
  }
  const forme =
    Array.isArray(s.journal) &&
    objet(s.etats) &&
    objet(s.journees) &&
    objet(s.reglages) &&
    typeof s.tickets === 'number' &&
    typeof s.roue === 'number';
  if (!forme) throw new Error('Ce fichier de sauvegarde est abîmé.');
  return { sauvegarde: s, exportee: typeof brut.exportee === 'string' ? brut.exportee : '' };
}
