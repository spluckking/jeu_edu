// Le plan de la ville, en un seul endroit : où sont les lieux, par où passent les chemins, la
// rivière (qu'on traverse par le pont), l'étang et sa plage, le bois. Rien n'est aligné au
// cordeau : les chemins serpentent, les bâtiments sont un peu tournés, les arbres en bosquets.
// Ce fichier ne dessine rien : il calcule (voir monde-scene.ts pour le dessin).

export interface Point {
  x: number;
  z: number;
}
export interface Lieu extends Point {
  /** 0 : face à la caméra (+z). */
  cap: number;
}

/** Les limites de la promenade. */
export const BORDS = { xMin: -95, xMax: 95, zMin: -90, zMax: 85 };

export const RAYON_PLACE = 9;

/** Tous les lieux. La place est au centre ; la fête foraine loin à l'est, après la rivière. */
export const LIEUX = {
  maison: { x: 5, z: -30, cap: -0.15 },
  potager: { x: 19, z: -27, cap: 0 },
  pommier: { x: 13, z: -14, cap: 0.4 },
  epicerie: { x: 23, z: 5, cap: -1.15 },
  epiciere: { x: 17.6, z: 7.6, cap: -1.9 },
  poste: { x: -21, z: 9, cap: 1.25 },
  postiere: { x: -15.6, z: 10.4, cap: 1.9 },
  boulangerie: { x: -17, z: -22, cap: 0.35 },
  tableau: { x: 6.2, z: 4.6, cap: -0.5 },
  murDesMots: { x: -6.8, z: -6.2, cap: 0.5 },
  tour: { x: -31, z: -12, cap: 0.3 },
  pont: { x: 46.5, z: 1.5, cap: Math.PI / 2 },
  ponton: { x: -27.5, z: 33, cap: 2.3 },
  portailFete: { x: 61, z: 0, cap: -Math.PI / 2 },
  fete: { x: 78, z: 0, cap: 0 },
} satisfies Record<string, Lieu>;

/** Les buissons de mûres, dans une clairière du bois. */
export const BUISSONS_MURES: Point[] = [
  { x: -44, z: -6 },
  { x: -48.5, z: -1.5 },
  { x: -42, z: 2.5 },
];

/** Les chemins, comme des suites de points (la courbe passe par chacun). */
export const CHEMINS: Point[][] = [
  // Vers la maison et le potager, au nord.
  [{ x: 1.5, z: -8.6 }, { x: 0, z: -16 }, { x: 4, z: -23 }, { x: 5, z: -26 }],
  [{ x: 4, z: -23 }, { x: 11, z: -24 }, { x: 16, z: -25.5 }],
  // Vers l'épicerie, à l'est de la place.
  [{ x: 8.6, z: 2.5 }, { x: 13, z: 5.5 }, { x: 18, z: 6 }],
  // Vers la poste, à l'ouest.
  [{ x: -8.6, z: 3 }, { x: -12, z: 7.5 }, { x: -16.5, z: 9 }],
  // Vers le chantier, au nord-ouest.
  [{ x: -6.5, z: -6.2 }, { x: -10, z: -12 }, { x: -15.5, z: -18.5 }],
  // La grande route de la fête : elle serpente, passe le pont, arrive au portail.
  [{ x: 9, z: -1 }, { x: 18, z: -4.5 }, { x: 28, z: -1 }, { x: 37, z: 3 }, { x: 46.5, z: 1.5 }, { x: 55, z: 0.5 }, { x: 61, z: 0 }],
  // Vers l'étang, au sud-ouest.
  [{ x: -4, z: 8.4 }, { x: -9, z: 17 }, { x: -18, z: 24 }, { x: -25, z: 30.5 }],
  // Vers le bois, à l'ouest.
  [{ x: -9, z: -1.5 }, { x: -20, z: -3.5 }, { x: -31, z: -1 }, { x: -39, z: -2 }],
  // Vers la tour des lettres doubles.
  [{ x: -20, z: -3.5 }, { x: -25, z: -8 }, { x: -29.5, z: -10.5 }],
];
export const LARGEUR_CHEMIN = 2.4;

/** La rivière, du nord au sud, à l'est du bourg. */
export const RIVIERE: Point[] = [
  { x: 49, z: -95 },
  { x: 40, z: -62 },
  { x: 51, z: -30 },
  { x: 45, z: -8 },
  { x: 46.5, z: 1.5 },
  { x: 49, z: 18 },
  { x: 41, z: 50 },
  { x: 47, z: 95 },
];
export const LARGEUR_RIVIERE = 8;
/** Le pont : on peut passer l'eau sur cette longueur, dans cette largeur. */
export const PONT = { longueur: 12, largeur: 3.4 };

/** L'étang et sa plage, au sud-ouest. */
export const ETANG = { x: -38, z: 41, rx: 15, rz: 9.5 };

/** Une courbe douce qui passe par tous les points (Catmull-Rom), échantillonnée. */
export function courbe(points: readonly Point[], pas = 0.8): Point[] {
  const r: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const n = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / pas));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      r.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  const dernier = points[points.length - 1];
  if (dernier) r.push(dernier);
  return r;
}

/** Distance d'un point à une ligne brisée. */
export function distanceA(ligne: readonly Point[], x: number, z: number): number {
  let min = Infinity;
  for (let i = 0; i < ligne.length - 1; i++) {
    const a = ligne[i]!;
    const b = ligne[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
    min = Math.min(min, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)));
  }
  return min;
}

const lignesChemins = CHEMINS.map((c) => courbe(c));
const ligneRiviere = courbe(RIVIERE, 2);

export const surUnChemin = (x: number, z: number, marge = 0): boolean => lignesChemins.some((l) => distanceA(l, x, z) < LARGEUR_CHEMIN / 2 + marge);
export const dansLaRiviere = (x: number, z: number, marge = 0): boolean => distanceA(ligneRiviere, x, z) < LARGEUR_RIVIERE / 2 + marge;
export function dansLEtang(x: number, z: number, marge = 0): boolean {
  const u = (x - ETANG.x) / (ETANG.rx + marge);
  const v = (z - ETANG.z) / (ETANG.rz + marge);
  return u * u + v * v < 1;
}
/** Sur le pont (qui enjambe la rivière d'ouest en est). */
export const surLePont = (x: number, z: number): boolean => Math.abs(x - LIEUX.pont.x) < PONT.longueur / 2 && Math.abs(z - LIEUX.pont.z) < PONT.largeur / 2;

/** Là où l'enfant ne peut pas marcher : l'eau, sauf sur le pont. */
export const dansLEau = (x: number, z: number): boolean => !surLePont(x, z) && (dansLaRiviere(x, z) || dansLEtang(x, z));

export const lignes = { chemins: lignesChemins, riviere: ligneRiviere };

/** Là où rien ne doit pousser : place, chemins, eau, plage, abords des lieux. */
export function occupe(x: number, z: number, lieux: readonly (Point & { r: number })[]): boolean {
  if (Math.hypot(x, z) < RAYON_PLACE + 0.6) return true;
  if (surUnChemin(x, z, 0.4) || dansLaRiviere(x, z, 1.2) || dansLEtang(x, z, 4)) return true;
  return lieux.some((l) => Math.hypot(x - l.x, z - l.z) < l.r);
}

/** Un tirage stable : les arbres sont toujours au même endroit. */
export function hasardStable(graine: number): () => number {
  let g = graine;
  return () => (g = (g * 16807) % 2147483647) / 2147483647;
}
