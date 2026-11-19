// La reprise du jeu d'avant : ses tickets deviennent des euros, une seule fois. Une manche y
// rapportait 3 tickets ; elle rapporte ici 1 €. Le jeu d'avant garde ses tickets (il reste en ligne).

export const TICKETS_PAR_EURO = 3;

export function eurosDeReprise(tickets: number): number {
  return Math.floor(Math.max(0, tickets) / TICKETS_PAR_EURO) * 100;
}
