// Noter une réponse dans le journal, depuis n'importe quel lieu de la ville (Gazette, poste,
// épicerie, pêche…). Le journal appartient à la sauvegarde de la fête : la fête branche ici
// l'écriture à son installation ; avant, les réponses ne sont pas perdues, elles attendent.

export interface ReponseVille {
  /** Le lieu : « gazette », « poste », « epicerie », « peche-canne »… */
  stand: string;
  /** La compétence travaillée : « alphabet.initiale », « monnaie.payer »… */
  competence: string;
  element: string;
  reponse: string;
  /** Juste au premier essai. */
  reussi: boolean;
  aide: boolean;
  /** Le temps de réponse (millisecondes), 0 si on ne le mesure pas. */
  duree: number;
}

type Ecrire = (r: ReponseVille & { instant: string }) => void;
let ecrire: Ecrire | null = null;
const enAttente: Array<ReponseVille & { instant: string }> = [];

/** La fête branche l'écriture dans son journal. */
export function brancherJournal(e: Ecrire): void {
  ecrire = e;
  for (const r of enAttente.splice(0)) e(r);
}

export function noter(r: ReponseVille): void {
  const ligne = { ...r, instant: new Date().toISOString() };
  if (ecrire) ecrire(ligne);
  else enAttente.push(ligne);
}

/** Un chronomètre pour une question : rend la durée écoulée, en millisecondes. */
export function chrono(): () => number {
  const debut = performance.now();
  return () => Math.round(performance.now() - debut);
}
