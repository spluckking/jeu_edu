// Les statistiques : toutes les réponses de l'enfant (stands de la fête, ateliers, Gazette,
// poste, épicerie, pêche…) sont dans le même journal ; chacune travaille une compétence
// (« mesures.convertir.m-cm », « tables.7 »). On compte, pour chaque compétence et pour chaque
// niveau au-dessus (« mesures.convertir », « mesures ») : les réponses, les justes du premier coup,
// le temps habituel, et la différence entre les 7 derniers jours et avant. Le parent les voit dans
// l'espace parent ; le rêve les reçoit chaque nuit pour choisir les exercices du lendemain.
// Pur : testé dans stats.test.ts.

import { ajouterJours, jourDe, type Jour } from '../memoire/jours.ts';

/** Ce qu'il faut d'une ligne du journal pour les statistiques. */
export interface Reponse {
  instant: string;
  stand: string;
  element: string;
  reussi: boolean;
  aide: boolean;
  duree: number;
  competence?: string;
}

/** La compétence d'une réponse : écrite dans la ligne, ou déduite des anciens stands. */
export function competenceDe(r: Reponse): string {
  if (r.competence) return r.competence;
  const e = r.element;
  switch (r.stand) {
    case 'chamboule': {
      // « x-3-7 » : la table de 3.
      const m = /^x-(\d+)-(\d+)$/.exec(e);
      return m ? `tables.${m[1]}` : 'tables';
    }
    case 'confiserie':
      return 'mots';
    case 'chantier': {
      // « add-r:49+4 », « pb-retrait:48-15 » : la sorte de calcul.
      const sorte = e.split(':')[0] ?? '';
      return /^[a-z-]+$/.test(sorte) ? `calcul.${sorte}` : 'calcul';
    }
    case 'horloge': {
      const sorte = e.split(':')[0] ?? '';
      return /^[a-z-]+$/.test(sorte) ? `heure.${sorte}` : 'heure';
    }
    case 'peche': {
      const sorte = e.split(':')[0] ?? '';
      return /^[a-zàâéèêëîïôûùüç'-]+$/.test(sorte) ? `homophones.${sorte}` : 'homophones';
    }
    default:
      return r.stand || 'autre';
  }
}

/** « mesures.convertir.m-cm » → « mesures », « mesures.convertir », « mesures.convertir.m-cm ». */
export function niveaux(competence: string): string[] {
  const p = competence.split('.');
  return p.map((_, i) => p.slice(0, i + 1).join('.'));
}

export interface Compte {
  /** Réponses données. */
  total: number;
  /** Justes du premier coup, sans aide. */
  justes: number;
}

export interface Stat extends Compte {
  /** Les 7 derniers jours (aujourd'hui compris), et avant. */
  recents: Compte;
  avant: Compte;
  /** Le temps habituel d'une réponse (médiane, en secondes, arrondi au dixième). */
  duree: number;
  /** Le dernier jour travaillé. */
  dernier: Jour;
  /** Les jours différents où la compétence a été travaillée. */
  jours: number;
}

/** Les statistiques de chaque compétence (et de chaque niveau au-dessus). */
export function statistiques(journal: readonly Reponse[], aujourdhui: Jour): Record<string, Stat> {
  const debutRecents = ajouterJours(aujourdhui, -6);
  const acc = new Map<string, { stat: Stat; durees: number[]; jours: Set<Jour> }>();
  for (const r of journal) {
    const jour = jourDe(new Date(r.instant));
    const juste = r.reussi && !r.aide;
    const recent = jour >= debutRecents;
    for (const c of niveaux(competenceDe(r))) {
      let a = acc.get(c);
      if (!a) {
        a = { stat: { total: 0, justes: 0, recents: { total: 0, justes: 0 }, avant: { total: 0, justes: 0 }, duree: 0, dernier: jour, jours: 0 }, durees: [], jours: new Set() };
        acc.set(c, a);
      }
      const s = a.stat;
      s.total++;
      if (juste) s.justes++;
      const p = recent ? s.recents : s.avant;
      p.total++;
      if (juste) p.justes++;
      if (r.duree > 0 && r.duree < 10 * 60 * 1000) a.durees.push(r.duree);
      if (jour > s.dernier) s.dernier = jour;
      a.jours.add(jour);
    }
  }
  const r: Record<string, Stat> = {};
  for (const [c, a] of [...acc].sort(([x], [y]) => x.localeCompare(y))) {
    const d = [...a.durees].sort((x, y) => x - y);
    const mediane = d.length ? (d.length % 2 ? d[(d.length - 1) / 2]! : (d[d.length / 2 - 1]! + d[d.length / 2]!) / 2) : 0;
    r[c] = { ...a.stat, duree: Math.round(mediane / 100) / 10, jours: a.jours.size };
  }
  return r;
}

/** Le taux de réussite (0 à 100), ou null sans réponse. */
export const taux = (c: Compte): number | null => (c.total ? Math.round((100 * c.justes) / c.total) : null);

/** Les points faibles : les compétences précises (pas les grands domaines) assez travaillées,
 *  réussies moins de 7 fois sur 10 ces derniers jours, les plus faibles d'abord. */
export function pointsFaibles(stats: Record<string, Stat>, minimum = 4): string[] {
  return Object.entries(stats)
    .filter(([c, s]) => c.includes('.') && s.recents.total >= minimum && (taux(s.recents) ?? 100) < 70)
    .filter(([c], _, l) => !l.some(([d]) => d !== c && d.startsWith(`${c}.`)))
    .sort(([, a], [, b]) => (taux(a.recents) ?? 0) - (taux(b.recents) ?? 0))
    .map(([c]) => c);
}
