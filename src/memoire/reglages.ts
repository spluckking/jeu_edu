// Réglages du moteur de mémoire. Ce sont des points de départ, à ajuster avec les rêves.

/** Intervalles de la liste globale, en jours, du premier rappel à l'entretien. */
export const INTERVALLES = [7, 14, 30, 60] as const;

/** Après une erreur dans la liste globale, l'élément revient ce nombre de jours plus tard. */
export const RETOUR_APRES_ERREUR = 1;

/** Après une erreur, l'élément revient dans la même manche, après ce nombre d'autres éléments. */
export const RETOUR_DANS_LA_MANCHE = 3;

/** Nombre d'éléments par manche (2 à 3 minutes). */
export const TAILLE_MANCHE = 8;

/** Jour où finit la semaine prioritaire, au soir (0 = dimanche, 4 = jeudi). */
export const JOUR_FIN_PRIORITE = 4;

/** Nombre de passages gardés dans l'historique court de chaque élément. */
export const HISTORIQUE_COURT = 10;
