// La correction d'un mot, lettre à lettre et bienveillante : lettres justes, accent oublié,
// lettre fausse, manquante ou en trop. Le déterminant (et le « se » d'un verbe pronominal)
// peut être omis. Repris de Dictée-Blocs (js/align.js). Pur, sans navigateur.

export function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/** Espaces en trop, apostrophes typographiques ; minuscules si le mot attendu n'a pas de majuscule. */
export function nettoyer(reponse: string, attendu: string): string {
  let s = reponse.normalize('NFC').replace(/[’‘`´]/g, "'").replace(/\s+/g, ' ').trim();
  const t = attendu.normalize('NFC');
  if (t && t === t.toLowerCase()) s = s.toLowerCase();
  return s;
}

export function levenshtein(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  let prec = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cour = [i];
    for (let j = 1; j <= y.length; j++) {
      cour[j] = Math.min((prec[j] as number) + 1, (cour[j - 1] as number) + 1, (prec[j - 1] as number) + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prec = cour;
  }
  return prec[y.length] as number;
}

const cout = (x: string, y: string): number => (x === y ? 0 : sansAccents(x) === sansAccents(y) ? 0.5 : 1);

export interface Operation {
  op: 'juste' | 'accent' | 'fausse' | 'manque' | 'trop';
  attendu: string;
  donne: string;
}

/** Aligne la réponse sur le mot juste, dans l'ordre du mot. */
export function aligner(donne: string, attendu: string): Operation[] {
  const a = Array.from(donne);
  const b = Array.from(attendu);
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d.push(new Array<number>(b.length + 1).fill(0));
    (d[i] as number[])[0] = i;
  }
  for (let j = 0; j <= b.length; j++) (d[0] as number[])[j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      (d[i] as number[])[j] = Math.min(
        (d[i - 1] as number[])[j - 1] as number + cout(a[i - 1] as string, b[j - 1] as string),
        ((d[i - 1] as number[])[j] as number) + 1,
        ((d[i] as number[])[j - 1] as number) + 1,
      );
    }
  }
  const ops: Operation[] = [];
  let i = a.length;
  let j = b.length;
  const egal = (x: number, y: number): boolean => Math.abs(x - y) < 1e-9;
  const v = (x: number, y: number): number => (d[x] as number[])[y] as number;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && egal(v(i, j), v(i - 1, j - 1) + cout(a[i - 1] as string, b[j - 1] as string))) {
      const c = cout(a[i - 1] as string, b[j - 1] as string);
      ops.push({ op: c === 0 ? 'juste' : c < 1 ? 'accent' : 'fausse', attendu: b[j - 1] as string, donne: a[i - 1] as string });
      i--;
      j--;
    } else if (j > 0 && egal(v(i, j), v(i, j - 1) + 1)) {
      ops.push({ op: 'manque', attendu: b[j - 1] as string, donne: '' });
      j--;
    } else {
      ops.push({ op: 'trop', attendu: '', donne: a[i - 1] as string });
      i--;
    }
  }
  return ops.reverse();
}

const DETERMINANT = /^(le|la|les|l'|un|une|des|du|de la|de l'|au|aux|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|ce|cet|cette|ces|se|s')(?:\s+|(?<='))(?=\S)/i;

/** « l'attention » → { det: "l'", coeur: "attention" }. */
export function separerDeterminant(mot: string): { det: string; coeur: string } {
  const t = mot.normalize('NFC').trim().replace(/[’‘]/g, "'");
  const m = t.match(DETERMINANT);
  if (!m) return { det: '', coeur: t };
  return { det: m[1] as string, coeur: t.slice(m[0].length) };
}

export interface Verdict {
  juste: boolean;
  accentSeulement: boolean;
  ops: Operation[];
  reponse: string;
  /** La forme comparée (le mot sans déterminant si l'enfant ne l'a pas écrit). */
  cible: string;
}

export function corriger(reponse: string, attendu: string): Verdict {
  let t = attendu.normalize('NFC').trim().replace(/[’‘]/g, "'");
  const r = nettoyer(reponse, t);
  const { det, coeur } = separerDeterminant(t);
  if (det && !separerDeterminant(r).det && coeur) t = coeur;
  const juste = r === t;
  return { juste, accentSeulement: !juste && r.length > 0 && sansAccents(r) === sansAccents(t), ops: aligner(r, t), reponse: r, cible: t };
}
