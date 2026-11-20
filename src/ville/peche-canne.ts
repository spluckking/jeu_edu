// La pêche à la canne, les règles (sans affichage) : chaque lancer peut ramener un poisson ; chaque
// poisson a une espèce et un poids, en multiples de 5 g (le calcul reste à la portée d'un CE2).
// À la fin, l'enfant calcule le poids total ; il ne peut porter que 100 g de poisson : il relâche
// des poissons jusqu'à ne garder que 100 g au plus. Testé dans peche-canne.test.ts.

export const LANCERS = 6;
export const PORTEE_MAX = 100;

export interface Espece {
  id: string;
  nom: string;
  /** Poids possibles, en grammes (multiples de 5). */
  min: number;
  max: number;
  /** Largeur de la zone verte de la jauge (0 à 1) : plus petite pour les gros poissons. */
  zone: number;
  /** Combien de fois il est plus rare (1 : courant). */
  rarete: number;
}

export const ESPECES: readonly Espece[] = [
  { id: 'ablette', nom: 'une ablette', min: 10, max: 20, zone: 0.34, rarete: 1 },
  { id: 'gardon', nom: 'un gardon', min: 20, max: 35, zone: 0.26, rarete: 1 },
  { id: 'perche', nom: 'une perche', min: 30, max: 50, zone: 0.18, rarete: 2 },
];

export interface Poisson {
  espece: string;
  nom: string;
  poids: number;
}

/** Un poisson qui mord, tiré au hasard (les rares moins souvent). */
export function poissonQuiMord(hasard: () => number): { espece: Espece; poids: number } {
  const poids = ESPECES.map((e) => 1 / e.rarete);
  let t = hasard() * poids.reduce((a, b) => a + b, 0);
  let espece = ESPECES[0]!;
  for (const [i, e] of ESPECES.entries()) {
    t -= poids[i] ?? 0;
    if (t <= 0) {
      espece = e;
      break;
    }
  }
  const pas = (espece.max - espece.min) / 5;
  return { espece, poids: espece.min + 5 * Math.floor(hasard() * (pas + 1)) };
}

export const total = (poissons: readonly Poisson[]): number => poissons.reduce((t, p) => t + p.poids, 0);

/** Ce qu'il garde est-il assez léger ? Et a-t-il relâché pour rien ? */
export function verifierRelache(poissons: readonly Poisson[], relaches: ReadonlySet<number>): { tropLourd: boolean; garde: number } {
  const garde = total(poissons.filter((_, i) => !relaches.has(i)));
  return { tropLourd: garde > PORTEE_MAX, garde };
}

/** Le curseur de la jauge, entre 0 et 1, qui va et vient (période en secondes). */
export function curseur(t: number, periode: number): number {
  const x = (t / periode) % 2;
  return x < 1 ? x : 2 - x;
}

/** La zone verte de la jauge : centrée au hasard, de cette largeur. */
export function zoneVerte(largeur: number, hasard: () => number): { debut: number; fin: number } {
  const debut = 0.08 + hasard() * (0.84 - largeur);
  return { debut, fin: debut + largeur };
}
