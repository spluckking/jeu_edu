// Le programme de la semaine : d'après les devoirs de l'enfant (photos envoyées par le parent le
// week-end), certains stands de la fête prennent un atelier (les mesures, les phrases…) à la place
// de leur travail habituel, avec un nombre fixe de questions par jour. D'abord les devoirs (le
// programme, validé par le parent) ; ensuite les points faibles : pour les stands que le
// programme laisse libres, le rêve peut choisir un atelier pour le lendemain, et il désigne les
// compétences sur lesquelles insister (d'après les statistiques).
// Pur : testé dans programme.test.ts.

import P from '../../content/ville/programme.json';
import { STANDS_ESSAI, type StandEssai } from '../essais/stands-essai.ts';
import type { Jour } from '../memoire/jours.ts';
import { ATELIERS, type IdAtelier, type Preparation } from '../reve/preparation.ts';
import type { IdStand } from '../scene/fete.ts';
import { lundiDe } from './gazette.ts';

export { ATELIERS, type IdAtelier };
export const STANDS_FETE: readonly IdStand[] = ['chamboule', 'confiserie', 'chantier', 'horloge', 'peche'];

export interface SemaineProgramme {
  /** Le lundi de la semaine. */
  lundi: Jour;
  /** Ce que disent les devoirs, pour le parent. */
  titre: string;
  /** Validé par le parent : sans ça, rien ne change. */
  valide: boolean;
  /** Les stands qui prennent un atelier cette semaine. */
  ateliers: Partial<Record<IdStand, IdAtelier>>;
  /** Les compétences des devoirs (« mesures.convertir », « phrases.pluriel »). */
  focus: string[];
}

export interface Programme {
  /** Le nombre de questions d'un atelier, chaque jour. */
  questionsParStand: number;
  semaines: SemaineProgramme[];
}

export const programme = P as unknown as Programme;

/** L'atelier d'un stand pour ce jour : celui du programme de la semaine (les devoirs), sinon
 *  celui que le rêve a choisi pour ce jour-là ; null : le stand garde son travail habituel. */
export function atelierDuJour(stand: IdStand, jour: Jour, prog: Programme, prep: Preparation | null): { atelier: StandEssai; n: number; focus: string[]; source: 'devoirs' | 'reve' } | null {
  const semaine = prog.semaines.find((s) => s.valide && s.lundi === lundiDe(jour));
  const duReve = prep?.jour === jour ? (prep.competences ?? []) : [];
  const id = semaine?.ateliers[stand];
  const choisi = id ?? (prep?.jour === jour ? prep.ateliers?.[stand] : undefined);
  const atelier = STANDS_ESSAI.find((a) => a.id === choisi);
  if (!atelier) return null;
  return { atelier, n: prog.questionsParStand, focus: [...(semaine?.focus ?? []), ...duReve], source: id ? 'devoirs' : 'reve' };
}
