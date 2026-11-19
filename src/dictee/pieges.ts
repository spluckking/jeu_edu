// Les pièges d'orthographe d'un mot, détectés automatiquement, et les lieux de piège de la
// ville où chaque mot « habite » (méthode des lieux). Repris de Dictée-Blocs (js/traps.js) :
// marche avec n'importe quelle nouvelle liste. Pur, sans navigateur.

export type IdLieu = 'tion' | 'muette' | 'double' | 'mbp' | 'h' | 'accent' | 'sons' | 'simple';

export const LIEUX: Record<IdLieu, { nom: string; regle: string; couleur: string }> = {
  tion: { nom: 'L’île des -tion', regle: 'Le son « sion » à la fin d’un mot s’écrit souvent t-i-o-n.', couleur: '#2f9fd0' },
  muette: { nom: 'Le château des lettres muettes', regle: 'Une lettre qu’on n’entend pas : il faut la voir dans sa tête !', couleur: '#8a46c8' },
  double: { nom: 'La tour des lettres doubles', regle: 'Deux lettres pareilles côte à côte : ll, mm, tt, ff…', couleur: '#d2483c' },
  mbp: { nom: 'Le pont du m', regle: 'Devant m, b et p, on écrit m et pas n.', couleur: '#c8662e' },
  h: { nom: 'Le puits du h muet', regle: 'Le h ne se prononce pas, mais il est bien là.', couleur: '#5a6470' },
  accent: { nom: 'La grotte des accents', regle: 'é, è, ê : écoute le son et pense au chapeau.', couleur: '#e0a800' },
  sons: { nom: 'La forêt des sons cachés', regle: 'Plusieurs lettres pour un seul son : ph, ai, ei, au, eau, oi, ill, an, en…', couleur: '#3f9d3a' },
  simple: { nom: 'La prairie des mots tranquilles', regle: 'Ce mot s’écrit comme il se prononce : écoute bien chaque son.', couleur: '#8a5a36' },
};

/** Ordre de priorité pour choisir le lieu principal d'un mot. */
export const ORDRE: readonly IdLieu[] = ['tion', 'muette', 'double', 'mbp', 'h', 'accent', 'sons'];

export interface Piege {
  lieu: IdLieu;
  debut: number;
  /** Exclu. */
  fin: number;
}

const VOYELLES = 'aeiouyéèêëàâîïôûùœ';
const estV = (c: string | undefined): boolean => !!c && VOYELLES.includes(c);
const SONS = ['eau', 'ill', 'ain', 'ein', 'oin', 'ph', 'ai', 'ei', 'au', 'oi', 'gn', 'qu'];

/** Pièges d'un mot (seul le dernier mot est analysé : « la jungle » → jungle). */
export function detecter(mot: string): { lieu: IdLieu; pieges: Piege[] } {
  const entier = mot.normalize('NFC');
  const m = entier.match(/^(.*[\s'’])?([^\s'’]+)$/);
  const decalage = m?.[1] ? m[1].length : 0;
  const w = (m?.[2] ?? entier).toLowerCase();
  const pieges: Piege[] = [];
  const ajout = (lieu: IdLieu, d: number, f: number): void => {
    pieges.push({ lieu, debut: decalage + d, fin: decalage + f });
  };

  const k = w.search(/tions?$/);
  if (k >= 0) ajout('tion', k, k + 4);

  const finale = w.match(/[tdsxpg]+$/);
  if (finale && finale.index !== undefined && w.length > 2 && !(k >= 0 && finale.index >= k)) ajout('muette', finale.index, w.length);

  for (const d of w.matchAll(/([bcdfglmnprst])\1/g)) {
    const i = d.index ?? 0;
    if (!(d[1] === 'l' && w[i - 1] === 'i')) ajout('double', i, i + 2);
  }
  for (const d of w.matchAll(/m(?=[bp])/g)) ajout('mbp', d.index ?? 0, (d.index ?? 0) + 1);
  for (const d of w.matchAll(/h/g)) {
    const i = d.index ?? 0;
    const avant = w[i - 1];
    if (!avant || !'cpst'.includes(avant)) ajout('h', i, i + 1);
  }
  for (const d of w.matchAll(/[éèêëàâîïôûùç]/g)) ajout('accent', d.index ?? 0, (d.index ?? 0) + 1);

  // Sons à plusieurs lettres, sans chevauchement.
  const pris = new Array<boolean>(w.length).fill(false);
  for (const p of pieges.filter((x) => x.lieu === 'tion')) for (let i = p.debut - decalage; i < p.fin - decalage; i++) pris[i] = true;
  const prendre = (d: number, f: number): boolean => {
    for (let i = d; i < f; i++) if (pris[i]) return false;
    for (let i = d; i < f; i++) pris[i] = true;
    ajout('sons', d, f);
    return true;
  };
  for (let i = 0; i < w.length; i++) {
    for (const s of SONS) {
      // ain, ein, oin ne sont nasals que devant une consonne ou en fin de mot.
      if (/n$/.test(s) && s.length === 3 && estV(w[i + 3])) continue;
      if (w.startsWith(s, i) && prendre(i, i + s.length)) {
        i += s.length - 1;
        break;
      }
    }
  }
  for (const d of w.matchAll(/[aei][nm](?![aeiouyéèênm])/g)) {
    const i = d.index ?? 0;
    if (!estV(w[i - 1]) || w[i - 1] === 'i') prendre(i, i + 2);
  }
  if (/er$/.test(w) && w.length > 3) prendre(w.length - 2, w.length);
  for (let i = 1; i < w.length - 1; i++) {
    if (w[i] === 's' && estV(w[i - 1]) && estV(w[i + 1])) prendre(i, i + 1);
  }

  pieges.sort((a, b) => a.debut - b.debut);
  const lieu = ORDRE.find((l) => pieges.some((p) => p.lieu === l)) ?? 'simple';
  return { lieu, pieges };
}

export interface Morceau {
  texte: string;
  piege: IdLieu | null;
  /** Début d'une nouvelle syllabe. */
  coupe: boolean;
}

/** Les morceaux à afficher sur la fiche d'étude : syllabes, et chaque piège en couleur. */
export function morceaux(mot: string, syllabes: string[]): Morceau[] {
  const entier = mot.normalize('NFC');
  const { pieges } = detecter(entier);
  const rang = (p: Piege): number => {
    const r = ORDRE.indexOf(p.lieu);
    return r < 0 ? 99 : r;
  };
  const piegeA = (i: number): number => {
    let meilleur = -1;
    pieges.forEach((x, k) => {
      if (i >= x.debut && i < x.fin && (meilleur < 0 || rang(x) < rang(pieges[meilleur] as Piege))) meilleur = k;
    });
    return meilleur;
  };
  const coeur = entier.match(/^(.*[\s'’])?[^\s'’]+$/);
  const debutCoeur = coeur?.[1] ? coeur[1].length : 0;
  const debuts = new Set<number>();
  let pos = debutCoeur;
  for (const s of syllabes.filter((x) => !/^[\s\-'’]+$/.test(x))) {
    const i = entier.indexOf(s, pos);
    if (i >= 0) {
      debuts.add(i);
      pos = i + s.length;
    }
  }
  const sortie: Morceau[] = [];
  let precedent = -2;
  Array.from(entier).forEach((c, i) => {
    const k = piegeA(i);
    const coupe = debuts.has(i) && i > 0 && !/[\s'’]/.test(entier[i - 1] ?? '');
    const dernier = sortie[sortie.length - 1];
    if (dernier && k === precedent && !coupe) dernier.texte += c;
    else sortie.push({ texte: c, piege: k >= 0 ? (pieges[k] as Piege).lieu : null, coupe });
    precedent = k;
  });
  return sortie;
}
