// Les dates du moteur sont des jours du calendrier local, écrits « AAAA-MM-JJ ».
// Ainsi « aujourd'hui » ne change pas au milieu de la soirée selon le fuseau horaire.

export type Jour = string;

const FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Le jour local d'un instant donné. */
export function jourDe(instant: Date): Jour {
  const annee = instant.getFullYear();
  const mois = String(instant.getMonth() + 1).padStart(2, '0');
  const jour = String(instant.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function versUtc(jour: Jour): number {
  const morceaux = FORMAT.exec(jour);
  if (!morceaux) throw new Error(`Jour mal écrit : ${jour}`);
  return Date.UTC(Number(morceaux[1]), Number(morceaux[2]) - 1, Number(morceaux[3]));
}

function depuisUtc(millisecondes: number): Jour {
  return new Date(millisecondes).toISOString().slice(0, 10);
}

export function ajouterJours(jour: Jour, nombre: number): Jour {
  return depuisUtc(versUtc(jour) + nombre * 86_400_000);
}

/** 0 = dimanche … 6 = samedi. */
export function jourDeSemaine(jour: Jour): number {
  return new Date(versUtc(jour)).getUTCDay();
}

export function ecartEnJours(depuis: Jour, jusqua: Jour): number {
  return Math.round((versUtc(jusqua) - versUtc(depuis)) / 86_400_000);
}
