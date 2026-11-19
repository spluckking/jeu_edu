// Le potager, sans affichage : on plante un sachet de graines, on arrose une fois par jour, et
// quand la plante a eu assez de jours d'eau, on récolte. Une plante oubliée ne meurt jamais :
// elle attend simplement le prochain arrosage.

export interface Parcelle {
  /** Le sachet planté, ou null si la parcelle est libre. */
  graine: string | null;
  /** Les jours où elle a été arrosée. */
  arrosages: string[];
}

export interface Graine {
  id: string;
  legume: string;
  jours: number;
  recolte: number;
}

export const parcelleLibre = (): Parcelle => ({ graine: null, arrosages: [] });

export type Etape = 'libre' | 'graine' | 'pousse' | 'mure';

export function etape(p: Parcelle, g: Graine | undefined): Etape {
  if (!p.graine || !g) return 'libre';
  if (p.arrosages.length >= g.jours) return 'mure';
  return p.arrosages.length === 0 ? 'graine' : 'pousse';
}

export const planter = (p: Parcelle, graine: string): Parcelle | null => (p.graine ? null : { graine, arrosages: [] });

/** Arroser : une fois par jour, et pas une plante déjà prête. */
export function arroser(p: Parcelle, g: Graine | undefined, jour: string): Parcelle | null {
  if (!p.graine || !g || p.arrosages.includes(jour) || p.arrosages.length >= g.jours) return null;
  return { ...p, arrosages: [...p.arrosages, jour] };
}

/** Récolter une plante prête : la parcelle redevient libre. */
export function recolter(p: Parcelle, g: Graine | undefined): { parcelle: Parcelle; legume: string; nombre: number } | null {
  if (!g || etape(p, g) !== 'mure') return null;
  return { parcelle: parcelleLibre(), legume: g.legume, nombre: g.recolte };
}
