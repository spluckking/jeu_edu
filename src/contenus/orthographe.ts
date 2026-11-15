// Comparer un mot écrit au mot attendu, lettre à lettre, pour montrer l'endroit exact de l'erreur.
// Un accent faux compte comme une erreur ; une majuscule non.

export interface Lettre {
  lettre: string;
  /** Faux : lettre en trop ou fausse (dans ce qu'il a écrit), oubliée ou à corriger (dans le mot attendu). */
  ok: boolean;
}

export interface Comparaison {
  juste: boolean;
  ecrit: Lettre[];
  attendu: Lettre[];
}

/** Forme comparée : minuscules, apostrophe droite, espaces simples. */
export function normaliser(mot: string): string {
  return mot.normalize('NFC').toLocaleLowerCase('fr').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
}

export function comparer(ecritBrut: string, attenduBrut: string): Comparaison {
  const e = [...normaliser(ecritBrut)];
  const a = [...normaliser(attenduBrut)];
  // Distance d'édition, puis on remonte le chemin pour savoir quelles lettres sont fausses.
  const d: number[][] = Array.from({ length: e.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  const cout = (i: number, j: number): number => d[i]?.[j] ?? 0;
  for (let i = 1; i <= e.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const pareil = e[i - 1] === a[j - 1] ? 0 : 1;
      (d[i] as number[])[j] = Math.min(cout(i - 1, j) + 1, cout(i, j - 1) + 1, cout(i - 1, j - 1) + pareil);
    }
  }
  const okEcrit = e.map(() => true);
  const okAttendu = a.map(() => true);
  let i = e.length;
  let j = a.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cout(i, j) === cout(i - 1, j - 1) + (e[i - 1] === a[j - 1] ? 0 : 1)) {
      if (e[i - 1] !== a[j - 1]) {
        okEcrit[i - 1] = false;
        okAttendu[j - 1] = false;
      }
      i--;
      j--;
    } else if (i > 0 && cout(i, j) === cout(i - 1, j) + 1) {
      okEcrit[i - 1] = false;
      i--;
    } else {
      okAttendu[j - 1] = false;
      j--;
    }
  }
  return {
    juste: e.join('') === a.join(''),
    ecrit: e.map((lettre, k) => ({ lettre, ok: okEcrit[k] ?? true })),
    attendu: a.map((lettre, k) => ({ lettre, ok: okAttendu[k] ?? true })),
  };
}
