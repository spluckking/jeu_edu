// Les questions de l'horloge : lire l'heure sur un cadran à aiguilles, calculer une heure
// d'arrivée, se repérer dans la journée et dans la semaine. Fabriquées par le jeu à partir
// de modèles (validés une fois par le parent), au niveau CE2, avec le même niveau adaptatif
// que les défis. Fonctions pures, hasard injectable.

import { NIVEAU_MAX, NIVEAU_MIN, type Hasard } from './generateur.ts';

export interface Heure {
  h: number;
  m: number;
}

export interface QuestionHeure {
  /** Le modèle et ses valeurs, pour le journal : « lire-quart:3:15 ». */
  id: string;
  enonce: string;
  voix: string;
  /** L'heure que montre le cadran, s'il y en a un. */
  cadran: Heure | null;
  /** heure : on tape « 3 h 15 » ; choix : on touche une des trois réponses. */
  saisie: 'heure' | 'choix';
  /** Pour un choix : les trois réponses, la bonne en premier (mélangées à l'affichage). */
  choix: string[];
  /** Les réponses acceptées, sous forme normalisée (« 3:15 » ou le texte du bon choix). */
  acceptees: string[];
  /** La réponse telle qu'on la montre après une erreur. */
  reponse: string;
  explication: string;
}

const entre = (hasard: Hasard, min: number, max: number): number => min + Math.floor(hasard() * (max - min + 1));
const choisir = <T>(hasard: Hasard, liste: readonly T[]): T => liste[Math.floor(hasard() * liste.length)] as T;

/** « 3 h », « 3 h 05 », « 15 h 30 ». */
export function ecrireHeure({ h, m }: Heure): string {
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** « 3h15 », « 3 h 15 », « 3h », « 03h05 » → « 3:15 », « 3:15 », « 3:0 », « 3:5 ». null si illisible. */
export function normaliserHeure(saisie: string): string | null {
  const m = /^\s*(\d{1,2})\s*h\s*(\d{0,2})\s*$/i.exec(saisie);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${h}:${min}`;
}

/** Un cadran à aiguilles se lit le matin comme l'après-midi : 3 h 15 ou 15 h 15. */
function deuxLectures({ h, m }: Heure): string[] {
  return [`${h}:${m}`, `${(h % 12) + 12}:${m}`];
}

function lire(hasard: Hasard, niveau: number): QuestionHeure {
  const h = entre(hasard, 1, 12);
  const sortes = niveau >= 4 ? ['pile', 'demie', 'quart', 'moinsLeQuart', 'cinq', 'cinq'] : niveau >= 3 ? ['pile', 'demie', 'quart', 'moinsLeQuart'] : niveau >= 2 ? ['pile', 'demie'] : ['pile'];
  const sorte = choisir(hasard, sortes);
  const m = sorte === 'pile' ? 0 : sorte === 'demie' ? 30 : sorte === 'quart' ? 15 : sorte === 'moinsLeQuart' ? 45 : entre(hasard, 1, 11) * 5;
  const heure = { h, m };
  const suivante = (h % 12) + 1;
  const explication =
    sorte === 'pile'
      ? `La petite aiguille montre le ${h} et la grande montre le 12 : il est ${h} h pile.`
      : sorte === 'demie'
        ? `La grande aiguille est sur le 6 : c'est la demie. Il est ${h} h 30.`
        : sorte === 'quart'
          ? `La grande aiguille est sur le 3 : c'est le quart. Il est ${h} h 15.`
          : sorte === 'moinsLeQuart'
            ? `La grande aiguille est sur le 9 : il est ${h} h 45, c'est-à-dire ${suivante} h moins le quart.`
            : `La grande aiguille montre le ${m / 5} : on compte de 5 en 5, cela fait ${m} minutes. Il est ${ecrireHeure(heure)}.`;
  return {
    id: `lire-${sorte}:${h}:${m}`,
    enonce: 'Quelle heure est-il ?',
    voix: 'Quelle heure est-il ?',
    cadran: heure,
    saisie: 'heure',
    choix: [],
    acceptees: deuxLectures(heure),
    reponse: ecrireHeure(heure),
    explication,
  };
}

function duree(hasard: Hasard, niveau: number): QuestionHeure {
  const h = entre(hasard, 1, 11);
  const activite = choisir(hasard, ['le spectacle', 'le goûter', 'la parade', 'le feu d’artifice']);
  if (niveau >= 4 && hasard() < 0.5) {
    const heure = { h, m: 0 };
    return {
      id: `duree-30:${h}`,
      enonce: `Il est ${h} h. ${capitale(activite)} commence dans une demi-heure. À quelle heure ?`,
      voix: `Il est ${h} heures. ${capitale(activite)} commence dans une demi-heure. À quelle heure ?`,
      cadran: heure,
      saisie: 'heure',
      choix: [],
      acceptees: deuxLectures({ h, m: 30 }),
      reponse: ecrireHeure({ h, m: 30 }),
      explication: `Une demi-heure, c'est 30 minutes : ${h} h + 30 minutes = ${h} h 30.`,
    };
  }
  const arrivee = { h: h + 1, m: 0 };
  return {
    id: `duree-60:${h}`,
    enonce: `Il est ${h} h. ${capitale(activite)} commence dans une heure. À quelle heure ?`,
    voix: `Il est ${h} heures. ${capitale(activite)} commence dans une heure. À quelle heure ?`,
    cadran: { h, m: 0 },
    saisie: 'heure',
    choix: [],
    acceptees: deuxLectures(arrivee),
    reponse: ecrireHeure(arrivee),
    explication: `Une heure plus tard, la petite aiguille avance d'un chiffre : ${h} h + 1 heure = ${h + 1} h.`,
  };
}

function apresMidi(hasard: Hasard): QuestionHeure {
  const h = entre(hasard, 1, 8);
  return {
    id: `24h:${h}`,
    enonce: `Il est ${h} h de l'après-midi. Sur une montre qui compte jusqu'à 24, quelle heure est-il ?`,
    voix: `Il est ${h} heures de l'après-midi. Sur une montre qui compte jusqu'à 24, quelle heure est-il ?`,
    cadran: { h, m: 0 },
    saisie: 'heure',
    choix: [],
    acceptees: [`${h + 12}:0`],
    reponse: `${h + 12} h`,
    explication: `L'après-midi, on ajoute 12 : ${h} + 12 = ${h + 12}. Il est ${h + 12} h.`,
  };
}

const capitale = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

/** Les moments de la journée : une action et le moment où on la fait. */
const MOMENTS: ReadonlyArray<[string, string, string]> = [
  ['Tu prends ton petit-déjeuner.', 'le matin', 'Le petit-déjeuner, c’est le premier repas, le matin.'],
  ['Tu manges à la cantine.', 'le midi', 'On mange à la cantine au milieu de la journée : le midi.'],
  ['Tu prends ton goûter après l’école.', 'l’après-midi', 'Le goûter, c’est l’après-midi, après l’école.'],
  ['Tu te mets en pyjama pour aller au lit.', 'le soir', 'On se prépare pour dormir le soir.'],
  ['Le soleil se lève.', 'le matin', 'Le soleil se lève le matin et se couche le soir.'],
  ['La lune et les étoiles brillent, tout le monde dort.', 'la nuit', 'Quand tout le monde dort, c’est la nuit.'],
];
const TOUS_MOMENTS = ['le matin', 'le midi', 'l’après-midi', 'le soir', 'la nuit'];
const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function journee(hasard: Hasard): QuestionHeure {
  if (hasard() < 0.5) {
    const [action, bon, explication] = choisir(hasard, MOMENTS);
    const autres = TOUS_MOMENTS.filter((x) => x !== bon);
    const a = autres.splice(Math.floor(hasard() * autres.length), 1)[0] ?? 'le soir';
    const b = autres[Math.floor(hasard() * autres.length)] ?? 'la nuit';
    return {
      id: `moment:${bon}`,
      enonce: `${action} C’est quel moment de la journée ?`,
      voix: `${action} C’est quel moment de la journée ?`,
      cadran: null,
      saisie: 'choix',
      choix: [bon, a, b],
      acceptees: [bon],
      reponse: bon,
      explication,
    };
  }
  const rang = entre(hasard, 0, 6);
  const apres = hasard() < 0.6;
  const jour = JOURS[rang] ?? 'lundi';
  const bon = JOURS[(rang + (apres ? 1 : 6)) % 7] ?? 'mardi';
  const autres = JOURS.filter((j) => j !== bon && j !== jour);
  const a = autres.splice(Math.floor(hasard() * autres.length), 1)[0] ?? 'jeudi';
  const b = autres[Math.floor(hasard() * autres.length)] ?? 'samedi';
  return {
    id: `jour-${apres ? 'apres' : 'avant'}:${jour}`,
    enonce: `Quel jour vient juste ${apres ? 'après' : 'avant'} ${jour} ?`,
    voix: `Quel jour vient juste ${apres ? 'après' : 'avant'} ${jour} ?`,
    cadran: null,
    saisie: 'choix',
    choix: [bon, a, b],
    acceptees: [bon],
    reponse: bon,
    explication: `Les jours dans l’ordre : lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche. ${capitale(apres ? `après ${jour}` : `avant ${jour}`)}, c’est ${bon}.`,
  };
}

/** Une question au niveau demandé : surtout lire l'heure, parfois la journée ou une durée. */
export function genererQuestionHeure(niveau: number, hasard: Hasard): QuestionHeure {
  const n = Math.max(NIVEAU_MIN, Math.min(NIVEAU_MAX, niveau));
  const tirage = hasard();
  if (tirage < 0.3) return journee(hasard);
  if (n >= 5 && tirage < 0.45) return apresMidi(hasard);
  if (n >= 3 && tirage < 0.55) return duree(hasard, n);
  return lire(hasard, n);
}

/** La réponse de l'enfant est-elle acceptée ? */
export function verifierHeure(q: QuestionHeure, saisie: string): boolean {
  if (q.saisie === 'choix') return q.acceptees.includes(saisie);
  const n = normaliserHeure(saisie);
  return n !== null && q.acceptees.includes(n);
}
