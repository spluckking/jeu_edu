// Les histoires et leurs questions de lecture : format, vérification, tirage des questions.
// Fonctions pures, testées. Les textes sont dans content/histoires/*.json et passent par le parent.

import type { IdStand } from '../scene/fete.ts';

export const FORAINS: readonly IdStand[] = ['chamboule', 'confiserie', 'chantier'];

/** Les prénoms proposés à l'enfant pour chaque forain ; il peut aussi taper le sien. */
export const PROPOSITIONS: Record<IdStand, readonly string[]> = {
  chamboule: ['Marcel', 'Gaston', 'Léon'],
  confiserie: ['Lila', 'Rose', 'Nina'],
  chantier: ['Bruno', 'Hugo', 'Victor'],
};

/** Comment on désigne le forain avant qu'il ait un prénom. */
export const METIERS: Record<IdStand, string> = {
  chamboule: 'le forain du chamboule-tout',
  confiserie: 'la foraine de la confiserie',
  chantier: 'le forain du chantier',
};

export type Noms = Partial<Record<IdStand, string>>;

export const VUES = ['survol', 'chamboule', 'confiserie', 'chantier', 'fin'] as const;
export type Vue = (typeof VUES)[number];

export interface Plan {
  vue: Vue;
  texte: string;
  /** Le forain qui salue pendant ce plan. */
  salue?: IdStand;
  /** Après ce plan, l'enfant donne un prénom à ce forain. */
  nommer?: IdStand;
  /** Le personnage de l'enfant marche jusqu'à ce stand pendant le plan. */
  marche?: IdStand;
}

/** Une question à trois choix : le premier choix est la bonne réponse (mélangé à l'affichage). */
export type QuestionLecture =
  | { question: string; choix: [string, string, string] }
  /** Question sur le prénom d'un forain : les choix viennent des prénoms. */
  | { question: string; nom: IdStand };

export interface Histoire {
  id: string;
  titre: string;
  plans: Plan[];
  questions: QuestionLecture[];
}

const ID_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MARQUE = /\{([^}]*)\}/g;

function estForain(valeur: unknown): valeur is IdStand {
  return typeof valeur === 'string' && (FORAINS as readonly string[]).includes(valeur);
}

function texteValide(valeur: unknown): valeur is string {
  if (typeof valeur !== 'string' || valeur.trim() === '') return false;
  return [...valeur.matchAll(MARQUE)].every((m) => estForain(m[1]));
}

/** Vérifie une histoire brute. Renvoie la liste des problèmes trouvés, ou l'histoire. */
export function lireHistoire(brut: unknown, source: string): Histoire | string[] {
  if (typeof brut !== 'object' || brut === null) return [`${source} : ce n'est pas un objet`];
  const o = brut as Record<string, unknown>;
  const problemes: string[] = [];
  if (typeof o.id !== 'string' || !ID_VALIDE.test(o.id)) problemes.push(`${source} : « id » invalide`);
  if (typeof o.titre !== 'string' || o.titre.trim() === '') problemes.push(`${source} : « titre » manque`);

  const plans: Plan[] = [];
  if (!Array.isArray(o.plans) || o.plans.length === 0) problemes.push(`${source} : « plans » doit être une liste non vide`);
  else {
    o.plans.forEach((brutPlan: unknown, i) => {
      const p = (brutPlan ?? {}) as Record<string, unknown>;
      const ou = `${source}, plan ${i + 1}`;
      if (!(VUES as readonly unknown[]).includes(p.vue)) problemes.push(`${ou} : « vue » inconnue (${String(p.vue)})`);
      if (!texteValide(p.texte)) problemes.push(`${ou} : « texte » vide ou marque {…} inconnue`);
      for (const cle of ['salue', 'nommer', 'marche'] as const) {
        if (p[cle] !== undefined && !estForain(p[cle])) problemes.push(`${ou} : « ${cle} » n'est pas un forain`);
      }
      plans.push(p as unknown as Plan);
    });
    // Un prénom ne s'utilise qu'une fois donné.
    const nommes = new Set<string>();
    plans.forEach((p, i) => {
      for (const m of typeof p.texte === 'string' ? p.texte.matchAll(MARQUE) : []) {
        if (!nommes.has(m[1] ?? '')) problemes.push(`${source}, plan ${i + 1} : {${m[1]}} avant qu'il ait un prénom`);
      }
      if (p.nommer) nommes.add(p.nommer);
    });
  }

  const questions: QuestionLecture[] = [];
  if (!Array.isArray(o.questions) || o.questions.length < 4) problemes.push(`${source} : il faut au moins 4 questions`);
  else {
    o.questions.forEach((brutQ: unknown, i) => {
      const q = (brutQ ?? {}) as Record<string, unknown>;
      const ou = `${source}, question ${i + 1}`;
      if (!texteValide(q.question)) problemes.push(`${ou} : « question » vide ou marque {…} inconnue`);
      if (q.nom !== undefined) {
        if (!estForain(q.nom)) problemes.push(`${ou} : « nom » n'est pas un forain`);
      } else if (
        !Array.isArray(q.choix) ||
        q.choix.length !== 3 ||
        !q.choix.every(texteValide) ||
        new Set(q.choix).size !== 3
      ) {
        problemes.push(`${ou} : il faut trois choix différents`);
      }
      questions.push(q as unknown as QuestionLecture);
    });
  }

  if (problemes.length > 0) return problemes;
  return { id: o.id as string, titre: o.titre as string, plans, questions };
}

/** Remplace {chamboule}, {confiserie}, {chantier} par les prénoms donnés. */
export function remplir(texte: string, noms: Noms): string {
  return texte.replace(MARQUE, (tout, cle: string) => (estForain(cle) ? (noms[cle] ?? PROPOSITIONS[cle][0] ?? tout) : tout));
}

/** Le texte entier de l'histoire, pour le relire d'un coup. */
export function texteEntier(histoire: Histoire, noms: Noms): string[] {
  return histoire.plans.map((p) => remplir(p.texte, noms));
}

/** Nombre de mots d'un texte (la ponctuation seule ne compte pas). */
export function mots(texte: string): number {
  return texte.split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
}

/**
 * Tire les questions suivantes, jamais posées dans ce cycle. Quand il n'en reste plus assez,
 * un nouveau cycle commence, sans les dernières posées. Renvoie les rangs tirés et le cycle mis à jour.
 */
export function tirerQuestions(
  total: number,
  dejaPosees: readonly number[],
  hasard: () => number,
  combien = 2,
): { tirees: number[]; posees: number[] } {
  const tous = Array.from({ length: total }, (_, i) => i);
  let posees = [...dejaPosees];
  let candidates = tous.filter((i) => !posees.includes(i));
  if (candidates.length < combien) {
    const dernieres = posees.slice(-combien);
    posees = [];
    candidates = tous.filter((i) => !dernieres.includes(i));
  }
  const tirees: number[] = [];
  while (tirees.length < combien && candidates.length > 0) {
    const rang = Math.floor(hasard() * candidates.length);
    tirees.push(...candidates.splice(rang, 1));
  }
  return { tirees, posees: [...posees, ...tirees] };
}

/** Les trois choix à afficher, mélangés, et le rang du bon. */
export function choixAffiches(q: QuestionLecture, noms: Noms, hasard: () => number): { choix: string[]; bonne: number } {
  let bons: string;
  let autres: string[];
  if ('nom' in q) {
    bons = noms[q.nom] ?? PROPOSITIONS[q.nom][0] ?? '';
    autres = PROPOSITIONS[q.nom].filter((p) => p.toLowerCase() !== bons.toLowerCase()).slice(0, 2);
  } else {
    bons = remplir(q.choix[0], noms);
    autres = q.choix.slice(1).map((c) => remplir(c, noms));
  }
  const choix = [bons, ...autres];
  for (let i = choix.length - 1; i > 0; i--) {
    const j = Math.floor(hasard() * (i + 1));
    [choix[i], choix[j]] = [choix[j] ?? '', choix[i] ?? ''];
  }
  return { choix, bonne: choix.indexOf(bons) };
}

/** Un prénom tapé par l'enfant : lettres, tiret, apostrophe ; première lettre en majuscule. */
export function nettoyerPrenom(brut: string): string {
  const propre = brut
    .replace(/[^\p{L}' -]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14);
  return propre.charAt(0).toLocaleUpperCase('fr') + propre.slice(1);
}

/** Toutes les histoires du dossier content/histoires, vérifiées au chargement. */
export function chargerHistoires(): Map<string, Histoire> {
  const fichiers = import.meta.glob<unknown>('/content/histoires/*.json', { eager: true, import: 'default' });
  const histoires = new Map<string, Histoire>();
  for (const [chemin, brut] of Object.entries(fichiers)) {
    const lu = lireHistoire(brut, chemin);
    if (Array.isArray(lu)) console.error(lu.join('\n'));
    else histoires.set(lu.id, lu);
  }
  return histoires;
}
