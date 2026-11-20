// La physique des manèges, sans affichage (testée dans physique-maneges.test.ts).

// --- Le bateau pirate : un pendule qu'on pousse au bon moment ----------------------------------

/** ω0² = g / L : une période d'environ 3 secondes. */
export const PENDULE_W2 = 4.4;
export const PENDULE_FREIN = 0.07;
export const PENDULE_MAX = 1.35;
/** L'énergie donnée par une poussée au bon moment. */
export const POUSSEE = 0.6;

export interface Pendule {
  angle: number;
  vitesse: number;
}

/** Un pas de temps (semi-implicite : stable). */
export function balancer(p: Pendule, dt: number): Pendule {
  let vitesse = p.vitesse + (-PENDULE_W2 * Math.sin(p.angle) - PENDULE_FREIN * p.vitesse) * dt;
  let angle = p.angle + vitesse * dt;
  if (Math.abs(angle) > PENDULE_MAX) {
    angle = Math.sign(angle) * PENDULE_MAX;
    vitesse = 0;
  }
  return { angle, vitesse };
}

/** L'enfant touche : près du haut d'un côté (le bateau va lentement), il est poussé plus fort,
 *  dans le sens où il va (vers le milieu s'il est arrêté) ; au mauvais moment, il est freiné. */
export function pousser(p: Pendule): { pendule: Pendule; bonMoment: boolean } {
  const bonMoment = Math.abs(p.vitesse) < 0.8 && Math.abs(p.angle) > 0.08;
  if (!bonMoment) return { pendule: { angle: p.angle, vitesse: p.vitesse * 0.85 }, bonMoment };
  const sens = Math.abs(p.vitesse) < 0.15 ? -Math.sign(p.angle) : Math.sign(p.vitesse);
  return { pendule: { angle: p.angle, vitesse: sens * Math.sqrt(p.vitesse ** 2 + 2 * POUSSEE) }, bonMoment };
}

// --- Les tasses : la vitesse de rotation ------------------------------------------------------

export const TASSE_VERT = { min: 4, max: 8 };

/** La différence d'angle la plus courte, entre −π et π. */
export function ecartAngle(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** La tasse ralentit doucement ; le doigt qui tourne autour l'entraîne. */
export function tourner(w: number, dt: number, elan: number | null): number {
  let r = w * Math.exp(-0.5 * dt);
  if (elan !== null) r += (Math.max(-14, Math.min(14, elan)) - r) * Math.min(1, dt * 2.5);
  return r;
}

export const dansLeVert = (w: number): boolean => Math.abs(w) >= TASSE_VERT.min && Math.abs(w) <= TASSE_VERT.max;

// --- Le petit grand huit : la piste, la vitesse, le saut ---------------------------------------

/** La hauteur de la piste (vers le haut) à l'abscisse x. */
export const hauteurPiste = (x: number): number => 230 + 90 * Math.sin(x / 260) + 45 * Math.sin(x / 97 + 1);
export const pentePiste = (x: number): number => (hauteurPiste(x + 1) - hauteurPiste(x - 1)) / 2;

export const WAGON = { gravite: 320, frein: 380, min: 140, max: 520 };

/** La vitesse le long de la piste : la pente, le frein, et un petit moteur qui ne laisse jamais
 *  le wagon s'arrêter. */
export function rouler(v: number, x: number, dt: number, frein: boolean): number {
  let r = v - WAGON.gravite * pentePiste(x) * dt - (frein ? WAGON.frein * dt : 0);
  if (r < WAGON.min) r += (WAGON.min - r) * Math.min(1, dt * 3);
  return Math.min(WAGON.max, Math.max(WAGON.min * 0.8, r));
}

/** La hauteur du saut en haut d'une bosse, selon la vitesse. */
export const hauteurSaut = (v: number): number => Math.max(0, Math.min(200, (v - WAGON.min) * 0.5));

/** Les sommets des bosses entre a et b. */
export function sommets(a: number, b: number): number[] {
  const r: number[] = [];
  for (let x = Math.ceil(a); x < b; x++) if (pentePiste(x - 1) > 0 && pentePiste(x) <= 0) r.push(x);
  return r;
}
