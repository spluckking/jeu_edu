// Les homophones de CE2 pour la pêche aux canards : une phrase à trou, on pêche le bon mot.
// Les phrases sont des modèles validés une fois par le parent ; {chamboule}, {confiserie},
// {chantier} deviennent les prénoms des forains. Fonctions pures, hasard injectable.

import { NIVEAU_MAX, NIVEAU_MIN, type Hasard } from './generateur.ts';

export type Paire = 'a' | 'et' | 'on' | 'son';

export interface QuestionHomophone {
  /** « on:3 » : la paire et le rang de la phrase. */
  id: string;
  paire: Paire;
  /** La phrase, avec « ___ » à la place du mot. */
  phrase: string;
  /** Les deux mots possibles, dans l'ordre de la paire. */
  mots: [string, string];
  reponse: string;
  explication: string;
}

export const MOTS: Record<Paire, [string, string]> = {
  a: ['a', 'à'],
  et: ['et', 'est'],
  on: ['on', 'ont'],
  son: ['son', 'sont'],
};

export const ASTUCES: Record<Paire, string> = {
  a: 'Si on peut dire « avait », on écrit a. Sinon, on écrit à.',
  et: 'Si on peut dire « était », on écrit est. Si on peut dire « et puis », on écrit et.',
  on: 'Si on peut dire « avaient », on écrit ont. Si on peut dire « il », on écrit on.',
  son: 'Si on peut dire « étaient », on écrit sont. Si on peut dire « mon », on écrit son.',
};

/** Les phrases : [phrase avec ___, bon mot]. */
export const PHRASES: Record<Paire, ReadonlyArray<[string, string]>> = {
  a: [
    ['{chamboule} ___ une grande moustache.', 'a'],
    ['Je vais ___ la fête avec mon papa.', 'à'],
    ['{chantier} ___ perdu son boulon.', 'a'],
    ['La confiserie est ___ côté du chamboule-tout.', 'à'],
    ['La pie ___ un nid tout en haut de l’arbre.', 'a'],
    ['On mange ___ midi.', 'à'],
    ['{confiserie} ___ un bonnet bleu.', 'a'],
    ['Je joue ___ la balle avec mon ami.', 'à'],
  ],
  et: [
    ['Le ciel ___ tout bleu.', 'est'],
    ['{chamboule} ___ {confiserie} sont amis.', 'et'],
    ['La grande roue ___ très haute.', 'est'],
    ['J’aime les bonbons ___ les sucettes.', 'et'],
    ['{chantier} ___ content de son travail.', 'est'],
    ['Le chat ___ le chien dorment.', 'et'],
  ],
  on: [
    ['Les forains ___ un gros camion.', 'ont'],
    ['Ce soir, ___ regarde le feu d’artifice.', 'on'],
    ['Mes amis ___ gagné une peluche.', 'ont'],
    ['Demain, ___ ira au manège.', 'on'],
    ['Les canards ___ des plumes jaunes.', 'ont'],
  ],
  son: [
    ['{chantier} range ___ marteau.', 'son'],
    ['Les ballons ___ rouges.', 'sont'],
    ['{confiserie} prépare ___ caramel.', 'son'],
    ['Les sucettes ___ délicieuses.', 'sont'],
    ['{chamboule} lève ___ chapeau.', 'son'],
  ],
};

/** Niveau 1 : a / à et et / est ; 2 : + on / ont ; 3 et plus : + son / sont. */
export function pairesDuNiveau(niveau: number): Paire[] {
  const n = Math.max(NIVEAU_MIN, Math.min(NIVEAU_MAX, niveau));
  return n >= 3 ? ['a', 'et', 'on', 'son'] : n >= 2 ? ['a', 'et', 'on'] : ['a', 'et'];
}

export function genererHomophone(niveau: number, hasard: Hasard): QuestionHomophone {
  const paires = pairesDuNiveau(niveau);
  const paire = paires[Math.floor(hasard() * paires.length)] ?? 'a';
  const liste = PHRASES[paire];
  const rang = Math.floor(hasard() * liste.length);
  const [phrase, reponse] = liste[rang] ?? liste[0] ?? ['', ''];
  return { id: `${paire}:${rang + 1}`, paire, phrase, mots: MOTS[paire], reponse, explication: ASTUCES[paire] };
}

/** Le mot pêché en début de phrase prend une majuscule ; on compare sans elle. */
export function verifierHomophone(q: QuestionHomophone, mot: string): boolean {
  return mot.toLocaleLowerCase('fr') === q.reponse.toLocaleLowerCase('fr');
}
