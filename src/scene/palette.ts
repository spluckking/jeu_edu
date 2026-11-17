// Les palettes de la fête : même style (ombrage doux en aplats, formes rondes), couleurs
// différentes. Le parent choisit dans l'espace parent ; « ?palette=… » permet d'essayer.

export type NomPalette = 'pastel' | 'vive' | 'ete' | 'bonbon';

export interface Palette {
  nom: string;
  /** De combien chaque couleur est adoucie vers le crème (0 : couleurs franches). */
  adoucir: number;
  /** Couleurs de la fête qui changent (le reste garde la palette de base). */
  couleurs: Partial<Record<string, number>>;
  herbe: { fond: string; clair: string; sombre: string };
  ciel: { haut: string; bas: string };
}

export const PALETTES: Record<NomPalette, Palette> = {
  pastel: {
    nom: 'Pastel',
    adoucir: 0.3,
    couleurs: {},
    herbe: { fond: '#93d77c', clair: '#a1dd88', sombre: '#86cd72' },
    ciel: { haut: '#6cc3ff', bas: '#d9f1ff' },
  },
  vive: {
    nom: 'Couleurs vives',
    adoucir: 0.06,
    couleurs: {
      sol: 0x6fd05a,
      comptoir: 0xff8552,
      toileA: 0xff4f6a,
      toileB: 0xfffaf0,
      enseigne: 0xffd030,
      bonbon1: 0xff6fbf,
      bonbon2: 0x3cbcff,
      bonbon3: 0x7fd840,
      barriereA: 0xffd030,
      barriereB: 0x5a8cff,
      maillot: 0x3c9cff,
      casquette: 0xff4f6a,
      rouge: 0xe8404b,
    },
    herbe: { fond: '#6fcf55', clair: '#7fd862', sombre: '#5fbf48' },
    ciel: { haut: '#3f9fff', bas: '#c8ecff' },
  },
  ete: {
    nom: 'Été',
    adoucir: 0.12,
    couleurs: {
      comptoir: 0xff9a5c,
      toileA: 0xff6b4a,
      toileB: 0xfff4e0,
      enseigne: 0xffc233,
      bonbon1: 0xff7aa8,
      bonbon2: 0x2fb8d8,
      bonbon3: 0x8ad04a,
      barriereA: 0x35c4c0,
      barriereB: 0xfff4e0,
      maillot: 0x2fb8d8,
      casquette: 0xff6b4a,
    },
    herbe: { fond: '#82cf5e', clair: '#93d86c', sombre: '#72c050' },
    ciel: { haut: '#4fb4ff', bas: '#ffe9c9' },
  },
  bonbon: {
    nom: 'Bonbon',
    adoucir: 0.15,
    couleurs: {
      comptoir: 0xff8fb0,
      toileA: 0xff5f9e,
      toileB: 0xffffff,
      enseigne: 0xffd84a,
      bonbon1: 0xb46cff,
      bonbon2: 0x4fd0ff,
      bonbon3: 0x7ae07a,
      barriereA: 0xb46cff,
      barriereB: 0xffffff,
      maillot: 0x7c6cff,
      casquette: 0xff5f9e,
    },
    herbe: { fond: '#8ad86e', clair: '#9be27c', sombre: '#7acb60' },
    ciel: { haut: '#7aa8ff', bas: '#ffe0f0' },
  },
};

/** La palette en cours : choisie une fois, avant de construire la fête. */
export let palette: Palette = PALETTES.pastel;

export function choisirPalette(nom: string | undefined): Palette {
  palette = PALETTES[nom as NomPalette] ?? PALETTES.pastel;
  return palette;
}
