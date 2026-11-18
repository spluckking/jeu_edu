// Découpage approximatif en syllabes écrites, façon école (pom-me, che-vaux, en-sem-ble),
// pour la fiche d'étude. Repris de Dictée-Blocs (js/syllables.js). Pur, sans navigateur.

const VOYELLES = 'aeiouyéèêëàâîïôûùœæ';
const estV = (c: string): boolean => VOYELLES.includes(c.toLowerCase());
const DIGRAMMES = ['ch', 'ph', 'gn', 'th', 'rh'];
const LIQUIDE_OK = 'bcdfgkptv';

interface Unite {
  t: 'V' | 'C';
  s: string;
}

function unites(mot: string): Unite[] {
  const sortie: Unite[] = [];
  let i = 0;
  while (i < mot.length) {
    const c = mot[i] as string;
    const deux = mot.slice(i, i + 2).toLowerCase();
    if (estV(c)) {
      let j = i;
      while (j < mot.length && estV(mot[j] as string)) j++;
      sortie.push({ t: 'V', s: mot.slice(i, j) });
      i = j;
    } else if ((deux === 'qu' || (deux === 'gu' && /[eéèêiy]/i.test(mot[i + 2] ?? ''))) && i + 2 < mot.length) {
      sortie.push({ t: 'C', s: mot.slice(i, i + 2) });
      i += 2;
    } else if (DIGRAMMES.includes(deux)) {
      sortie.push({ t: 'C', s: mot.slice(i, i + 2) });
      i += 2;
    } else {
      sortie.push({ t: 'C', s: c });
      i++;
    }
  }
  return sortie;
}

const inseparables = (a: string, b: string): boolean => a.length === 1 && b.length === 1 && LIQUIDE_OK.includes(a.toLowerCase()) && 'lr'.includes(b.toLowerCase());

function decouperMot(mot: string): string[] {
  const u = unites(mot);
  const v: number[] = [];
  u.forEach((x, k) => {
    if (x.t === 'V') v.push(k);
  });
  if (v.length < 2) return [mot];
  const coupes: number[] = [];
  for (let p = 0; p < v.length - 1; p++) {
    const a = v[p] as number;
    const b = v[p + 1] as number;
    const k = b - a - 1;
    if (k <= 1) coupes.push(a + 1);
    else if (k === 2) coupes.push(inseparables((u[a + 1] as Unite).s, (u[a + 2] as Unite).s) ? a + 1 : a + 2);
    else coupes.push(inseparables((u[b - 2] as Unite).s, (u[b - 1] as Unite).s) ? b - 2 : b - 1);
  }
  const syllabes: string[] = [];
  let debut = 0;
  for (const c of [...coupes, u.length]) {
    syllabes.push(
      u
        .slice(debut, c)
        .map((x) => x.s)
        .join(''),
    );
    debut = c;
  }
  return syllabes.filter(Boolean);
}

/** Découpe une expression (espaces, tirets et apostrophes gardés à part). */
export function syllabes(texte: string): string[] {
  const sortie: string[] = [];
  for (const p of texte.split(/([\s\-'’]+)/)) {
    if (!p) continue;
    if (/^[\s\-'’]+$/.test(p)) sortie.push(p);
    else sortie.push(...decouperMot(p));
  }
  return sortie.filter((s) => s.trim());
}
