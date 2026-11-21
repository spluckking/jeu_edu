// La grande aventure dans la ville : quelles quêtes on peut jouer (celles du jeu, puis celles du
// rêve validées par le parent), où on en est aujourd'hui, la tâche du jour parmi les demandes, et
// le chapitre du jour pour la Gazette.

import Q from '../../content/ville/grandes-quetes.json';
import demandesT from '../../content/ville/demandes.json';
import epicerie from '../../content/ville/epicerie.json';
import gazetteT from '../../content/ville/gazette.json';
import type { Demande } from './demandes-ville.ts';
import type { EtatVille } from './etat.ts';
import type { Aventure, Question } from './gazette.ts';
import { CHAPITRES, lireGrandeQuete, lireTache, queteDuJour, tacheDuJour, type GrandeQuete, type QuestionBrute } from './grande-quete.ts';
import { remplir } from './interface.ts';

/** Tout ce qu'on peut demander ou donner dans une quête. */
export const PRODUITS: ReadonlySet<string> = new Set([...epicerie.produits.map((p) => p.id), ...demandesT.objets.map((o) => o.id)]);

/** Les grandes quêtes jouables : celles du jeu, puis celles du rêve validées (relues). */
export function quetesJouables(e: EtatVille): GrandeQuete[] {
  const lues = [...Q.quetes, ...e.quetesRecues].map((q) => lireGrandeQuete(q, PRODUITS));
  const vues = new Set<string>();
  return lues.filter((q): q is GrandeQuete => typeof q !== 'string' && !vues.has(q.id) && Boolean(vues.add(q.id)));
}

/** Où en est l'aventure aujourd'hui (et l'état mis à jour, à garder). */
export function aventureAujourdhui(e: EtatVille, jour: string): { quete: GrandeQuete | null; change: boolean } {
  const r = queteDuJour(e.grandeQuete, quetesJouables(e), jour, (id) => e.demandes.historique[id] !== undefined);
  const change = JSON.stringify(r.etat) !== JSON.stringify(e.grandeQuete);
  if (change) e.grandeQuete = r.etat;
  return { quete: r.quete, change };
}

/** Une demande écrite par le rêve (avec son identifiant), ou la raison du refus. */
export function lireDemandeRecue(brut: unknown): Demande | string {
  const id = (brut as { id?: unknown })?.id;
  if (typeof id !== 'string' || !/^[a-z0-9-]{3,60}$/.test(id)) return 'identifiant invalide';
  const t = lireTache(brut, PRODUITS);
  return typeof t === 'string' ? t : { id: `reve-${id}`, ...t };
}

/** Les demandes venues d'ailleurs : celles du rêve (validées), et la tâche de l'aventure. */
export function demandesVenues(e: EtatVille, jour: string): { recues: Demande[]; imposees: Demande[] } {
  const { quete } = aventureAujourdhui(e, jour);
  const t = tacheDuJour(e.grandeQuete, quete);
  const recues = e.demandesRecues.map(lireDemandeRecue).filter((d): d is Demande => typeof d !== 'string');
  return { recues, imposees: t ? [{ id: t.id, ...t.tache }] : [] };
}

const question = (q: QuestionBrute, phrases: readonly string[]): Question => ({ question: q.question, choix: q.choix, indice: q.indice ? (phrases[q.indice - 1] ?? null) : null });

/** Le chapitre du jour (ou la fin) pour la Gazette. */
export function aventurePourLaGazette(e: EtatVille, quete: GrandeQuete | null): Aventure | null {
  if (!quete) return null;
  const n = e.grandeQuete.chapitre;
  if (n >= CHAPITRES) {
    const f = quete.fin;
    return {
      titre: quete.titre,
      sousTitre: remplir(gazetteT.textes.finAventure, { titre: f.titre }),
      phrases: f.phrases,
      questions: [{ question: f.reflexion.question, choix: f.reflexion.choix, indice: null }],
      morale: f.morale,
    };
  }
  const c = quete.chapitres[n];
  if (!c) return null;
  return { titre: quete.titre, sousTitre: remplir(gazetteT.textes.chapitre, { n: n + 1, titre: c.titre }), phrases: c.phrases, questions: c.questions.map((q) => question(q, c.phrases)) };
}
