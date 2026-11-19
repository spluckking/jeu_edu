// Les défis du chantier : les exercices générés de la séance (calculs et petits problèmes).
// Ils rapportent le lot de la séance ; leur niveau s'adapte, ils ne sont pas des éléments à retenir.

import { genererExercice, genererProbleme, type Exercice, type Personne } from '../exercices/generateur.ts';
import { dire } from '../son/voix.ts';
import { chamboule } from './chamboule.ts';
import { caseReponse, type JeuDeStand } from './stand.ts';

export interface SourceDefis {
  niveau(): number;
  /** Les forains, avec leurs prénoms, qui jouent dans les problèmes. */
  gens(): Personne[];
  /** Que des problèmes, jamais un calcul seul (l'épreuve d'une attraction de la ville). */
  problemes?: boolean;
}

export function creerDefis(source: SourceDefis): JeuDeStand & { exercice(): Exercice | null } {
  let courant: Exercice | null = null;
  const exercice = (): Exercice => {
    if (!courant) throw new Error('Aucun défi en cours');
    return courant;
  };
  return {
    id: 'chantier',
    type: 'defi',
    titre: 'Les défis du chantier',
    unite: (n) => `${n} défi${n > 1 ? 's' : ''}`,
    large: false,
    // Même clavier de chiffres qu'au chamboule-tout.
    construireClavier: chamboule.construireClavier,
    touchePhysique: chamboule.touchePhysique,
    saisir: chamboule.saisir,
    preparer() {
      courant = (source.problemes ? genererProbleme : genererExercice)(source.niveau(), Math.random, source.gens());
    },
    afficher(_e, saisie, etat) {
      const x = exercice();
      const montre = etat === 'saisie' ? saisie || '?' : x.reponse;
      const reponse = caseReponse(montre, etat === 'saisie' ? 'case' : 'case juste');
      if (!x.probleme) return [`${x.enonce} `, reponse];
      return [caseReponse(x.enonce, 'enonce-probleme'), reponse];
    },
    verifier: (_e, saisie) => saisie === exercice().reponse,
    correction(_e, saisie) {
      const x = exercice();
      const ecrit = document.createElement('s');
      ecrit.textContent = saisie;
      const explication = document.createElement('span');
      explication.className = 'explication';
      explication.textContent = x.explication;
      return ['Tu as écrit ', ecrit, `. La réponse est ${x.reponse}.`, explication];
    },
    ecouter: () => dire(exercice().voix),
    voixCorrection: () => `La réponse est ${exercice().reponse}. ${exercice().explication}`,
    indice: () => null,
    reussite(fete) {
      fete.saluerForain('chantier');
    },
    exercice: () => courant,
    idExercice: () => courant?.id ?? null,
  };
}
