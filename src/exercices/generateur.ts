// Les exercices générés : les défis du forain du chantier. Le jeu les fabrique à partir de
// modèles (validés une fois par le parent), au niveau début de CE2, et adapte la difficulté.
// Fonctions pures, hasard injectable.

export type Hasard = () => number;

export interface Exercice {
  /** Le modèle utilisé (pour le journal) et ses nombres : « add-r:34+28 ». */
  id: string;
  /** Un calcul en ligne (« 34 + 28 = ») ou l'énoncé d'un problème. */
  enonce: string;
  probleme: boolean;
  /** Ce que lit la voix. */
  voix: string;
  reponse: string;
  /** Une phrase d'explication après une erreur. */
  explication: string;
}

export interface Niveau {
  /** De 1 (le plus facile) à 5. */
  niveau: number;
  reussitesDeSuite: number;
  erreursDeSuite: number;
}

export const NIVEAU_MIN = 1;
export const NIVEAU_MAX = 5;
/** Plus dur après 3 réussites de suite, plus facile après 2 erreurs de suite. */
export const MONTER_APRES = 3;
export const DESCENDRE_APRES = 2;

export function niveauDeDepart(): Niveau {
  return { niveau: 1, reussitesDeSuite: 0, erreursDeSuite: 0 };
}

export function ajusterNiveau(n: Niveau, reussi: boolean): Niveau {
  if (reussi) {
    const suite = n.reussitesDeSuite + 1;
    if (suite >= MONTER_APRES && n.niveau < NIVEAU_MAX) return { niveau: n.niveau + 1, reussitesDeSuite: 0, erreursDeSuite: 0 };
    return { niveau: n.niveau, reussitesDeSuite: suite, erreursDeSuite: 0 };
  }
  const suite = n.erreursDeSuite + 1;
  if (suite >= DESCENDRE_APRES && n.niveau > NIVEAU_MIN) return { niveau: n.niveau - 1, reussitesDeSuite: 0, erreursDeSuite: 0 };
  return { niveau: n.niveau, reussitesDeSuite: 0, erreursDeSuite: suite };
}

/** Les personnes des problèmes : les forains, avec leurs prénoms donnés par l'enfant. */
export interface Personne {
  nom: string;
  feminin: boolean;
  /** Des objets au masculin pluriel, liés à son stand. */
  objets: string;
}

const entre = (hasard: Hasard, min: number, max: number): number => min + Math.floor(hasard() * (max - min + 1));
const choisir = <T>(hasard: Hasard, liste: readonly T[]): T => liste[Math.floor(hasard() * liste.length)] as T;

/** Deux nombres dont la somme des unités ne dépasse pas 9 (pas de retenue), ou la dépasse. */
function addition(hasard: Hasard, chiffresB: 1 | 2, retenue: boolean): [number, number] {
  for (;;) {
    const a = entre(hasard, 11, 79);
    const b = chiffresB === 1 ? entre(hasard, 2, 9) : entre(hasard, 11, 89 - a > 11 ? 89 - a : 11);
    const avecRetenue = (a % 10) + (b % 10) >= 10;
    if (avecRetenue === retenue && a + b < 100) return [a, b];
  }
}

function soustraction(hasard: Hasard, chiffresB: 1 | 2, retenue: boolean): [number, number] {
  for (;;) {
    const a = entre(hasard, 21, 99);
    const b = chiffresB === 1 ? entre(hasard, 2, 9) : entre(hasard, 11, a - 5);
    const avecRetenue = a % 10 < b % 10;
    if (avecRetenue === retenue && a - b > 0) return [a, b];
  }
}

function calcul(signe: '+' | '−', a: number, b: number, retenue: boolean): Exercice {
  const reponse = signe === '+' ? a + b : a - b;
  const mot = signe === '+' ? 'plus' : 'moins';
  const explication =
    signe === '+'
      ? retenue
        ? `${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)} : on écrit ${((a % 10) + (b % 10)) % 10} et on retient 1 dizaine.`
        : `On ajoute les unités, puis les dizaines : ${a} + ${b} = ${reponse}.`
      : retenue
        ? `On ne peut pas enlever ${b % 10} à ${a % 10} : on casse une dizaine, ${(a % 10) + 10} − ${b % 10} = ${(a % 10) + 10 - (b % 10)}.`
        : `On enlève les unités, puis les dizaines : ${a} − ${b} = ${reponse}.`;
  return {
    id: `${signe === '+' ? 'add' : 'sous'}${retenue ? '-r' : ''}:${a}${signe === '+' ? '+' : '-'}${b}`,
    enonce: `${a} ${signe} ${b} =`,
    probleme: false,
    voix: `${a} ${mot} ${b}`,
    reponse: String(reponse),
    explication,
  };
}

/** Les modèles de problèmes d'une phrase. Toute nouvelle phrase passe par le parent. */
function probleme(hasard: Hasard, niveau: number, gens: readonly Personne[]): Exercice {
  const p = choisir(hasard, gens);
  const il = p.feminin ? 'elle' : 'il';
  const Il = p.feminin ? 'Elle' : 'Il';
  const modeles = niveau >= 4 ? ['ajout', 'retrait', 'reunion', 'paquets'] : niveau >= 3 ? ['ajout', 'retrait', 'reunion'] : ['ajout', 'retrait'];
  const modele = choisir(hasard, modeles);
  const retenue = niveau >= 4;
  let enonce: string;
  let reponse: number;
  let explication: string;
  let nombres: string;
  if (modele === 'ajout') {
    const [a, b] = addition(hasard, niveau >= 3 ? 2 : 1, retenue);
    enonce = `${p.nom} a ${a} ${p.objets}. ${Il} en reçoit ${b} de plus. Combien en a-t-${il} maintenant ?`;
    reponse = a + b;
    explication = `${Il} en a plus qu'avant : on ajoute, ${a} + ${b} = ${reponse}.`;
    nombres = `${a}+${b}`;
  } else if (modele === 'retrait') {
    const [a, b] = soustraction(hasard, niveau >= 3 ? 2 : 1, retenue);
    enonce = `${p.nom} a ${a} ${p.objets}. ${Il} en donne ${b}. Combien lui en reste-t-il ?`;
    reponse = a - b;
    explication = `${Il} en a moins qu'avant : on enlève, ${a} − ${b} = ${reponse}.`;
    nombres = `${a}-${b}`;
  } else if (modele === 'reunion') {
    const [a, b] = addition(hasard, 2, retenue);
    enonce = `${p.nom} a ${a} ${p.objets} rouges et ${b} ${p.objets} bleus. Combien de ${p.objets} a-t-${il} en tout ?`;
    reponse = a + b;
    explication = `En tout, c'est les rouges et les bleus ensemble : ${a} + ${b} = ${reponse}.`;
    nombres = `${a}+${b}`;
  } else {
    const paquets = entre(hasard, 2, 5);
    const parPaquet = choisir(hasard, [2, 3, 4, 5, 10]);
    enonce = `${p.nom} range ses ${p.objets} en ${paquets} paquets de ${parPaquet}. Combien a-t-${il} de ${p.objets} ?`;
    reponse = paquets * parPaquet;
    explication = `${paquets} paquets de ${parPaquet}, c'est ${paquets} × ${parPaquet} = ${reponse}.`;
    nombres = `${paquets}x${parPaquet}`;
  }
  return { id: `pb-${modele}:${nombres}`, enonce, probleme: true, voix: enonce, reponse: String(reponse), explication };
}

/** Un exercice au niveau demandé. Un sur trois environ est un problème, à partir du niveau 2. */
export function genererExercice(niveau: number, hasard: Hasard, gens: readonly Personne[]): Exercice {
  const n = Math.max(NIVEAU_MIN, Math.min(NIVEAU_MAX, niveau));
  if (n >= 2 && gens.length > 0 && hasard() < 0.35) return probleme(hasard, n, gens);
  const signe = hasard() < 0.5 ? '+' : '−';
  // 1 : 2 chiffres et 1 chiffre sans retenue ; 2 : 2 et 2 sans retenue ;
  // 3 : 2 et 1 avec retenue ; 4 et 5 : 2 et 2 avec retenue.
  const chiffresB = n === 1 || n === 3 ? 1 : 2;
  const retenue = n >= 3;
  const [a, b] = signe === '+' ? addition(hasard, chiffresB, retenue) : soustraction(hasard, chiffresB, retenue);
  return calcul(signe, a, b, retenue);
}
