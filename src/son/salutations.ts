// Les salutations des forains, quand l'enfant entre dans leur stand : une courte phrase doublée,
// avec une voix à chacun. Pas de prénom dedans : elles sont enregistrées à l'avance
// (scripts/generer-voix.mjs, dans public/voix/forains/). Pure, sans navigateur.

export interface Doublage {
  /** Voix neurale Azure du forain. */
  voix: string;
  /** Petits réglages pour donner du caractère (Azure : prosody). */
  hauteur: string;
  debit: string;
  phrases: readonly string[];
}

export const SALUTATIONS: Record<string, Doublage> = {
  chamboule: {
    voix: 'fr-FR-HenriNeural',
    hauteur: '-4%',
    debit: '-4%',
    phrases: ['Bonjour ! Prêt à faire tomber les boîtes ?', 'Ah, te revoilà ! On lance quelques balles ?'],
  },
  confiserie: {
    voix: 'fr-FR-CoralieNeural',
    hauteur: '+6%',
    debit: '-2%',
    phrases: ['Coucou ! Mes sucettes t’attendent !', 'Bienvenue à la confiserie ! On écrit de jolis mots ?'],
  },
  chantier: {
    voix: 'fr-FR-AlainNeural',
    hauteur: '0%',
    debit: '+2%',
    phrases: ['Salut, petit bricoleur ! On construit ensemble ?', 'Bonjour ! J’ai des défis tout neufs pour toi.'],
  },
  horloge: {
    voix: 'fr-FR-BrigitteNeural',
    hauteur: '+2%',
    debit: '-6%',
    phrases: ['Bonjour ! Tic-tac… Quelle heure est-il ?', 'Te voilà ! Mes horloges t’attendaient.'],
  },
  peche: {
    voix: 'fr-FR-JeromeNeural',
    hauteur: '+4%',
    debit: '0%',
    phrases: ['Ohé ! Les canards sont prêts à nager !', 'Bonjour ! On va pêcher quelques canards ?'],
  },
};

/** Le fichier d'une salutation (relatif au dossier des voix). */
export function fichierSalutation(forain: string, rang: number): string {
  return `forains/${forain}-${rang + 1}.mp3`;
}
