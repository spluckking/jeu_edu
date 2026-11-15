// Le chamboule-tout : une multiplication, on tape le résultat, la balle fait tomber la pyramide.

import type { Element } from '../contenus/contenus.ts';
import { melanger } from '../memoire/moteur.ts';
import { dire } from '../son/voix.ts';
import { bouton, caseReponse, type JeuDeStand } from './stand.ts';

let ordre: [number, number] = [0, 0];

function calcul(e: Element): { a: number; b: number; reponse: string } {
  if (e.type !== 'calcul') throw new Error(`Le chamboule-tout ne prend que des calculs (${e.id})`);
  return e;
}

export const chamboule: JeuDeStand = {
  id: 'chamboule',
  type: 'calcul',
  titre: 'Chamboule-tout',
  unite: (n) => `${n} calcul${n > 1 ? 's' : ''}`,
  large: false,
  construireClavier(clavier, toucher) {
    clavier.className = 'clavier chiffres';
    clavier.replaceChildren(
      ...['7', '8', '9', '4', '5', '6', '1', '2', '3', 'effacer', '0', 'valider'].map((t) => bouton(t, toucher)),
    );
  },
  touchePhysique: (cle) => (/^\d$/.test(cle) ? cle : null),
  saisir: (saisie, touche) => (saisie.length < 3 ? (saisie + touche).replace(/^0+(?=\d)/, '') : saisie),
  preparer(e) {
    // 6 × 7 ou 7 × 6 : le même élément, dans un ordre tiré au hasard.
    const { a, b } = calcul(e);
    ordre = melanger([a, b], Math.random) as [number, number];
  },
  afficher(e, saisie, etat) {
    const { reponse } = calcul(e);
    const montre = etat === 'saisie' ? saisie || '?' : reponse;
    return [`${ordre[0]} × ${ordre[1]} = `, caseReponse(montre, etat === 'saisie' ? 'case' : 'case juste')];
  },
  verifier: (e, saisie) => saisie === calcul(e).reponse,
  correction(e, saisie) {
    const ecrit = document.createElement('s');
    ecrit.textContent = saisie;
    return ['Tu as écrit ', ecrit, `. La réponse est ${calcul(e).reponse}.`];
  },
  ecouter: () => dire(`${ordre[0]} fois ${ordre[1]}`),
  voixCorrection: (e) => `${ordre[0]} fois ${ordre[1]}, ça fait ${calcul(e).reponse}. On le revoit tout à l'heure.`,
  indice: () => null,
  reussite(fete) {
    fete.lancer();
  },
};
