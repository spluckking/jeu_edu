// Les contenus : ce que l'enfant doit réviser, séparé du code, dans content/packs/*.json.
// Deux types : le calcul (une multiplication, au chamboule-tout) et les mots (une dictée, à la confiserie).

export interface ElementCalcul {
  type: 'calcul';
  /** Identifiant stable : 6 × 7 et 7 × 6 sont le même élément. */
  id: string;
  a: number;
  b: number;
  reponse: string;
}

export interface ElementMot {
  type: 'mots';
  id: string;
  /** Le mot à écrire, tel que l'enfant doit l'écrire. */
  mot: string;
  /** Une phrase qui donne le sens du mot à l'oral (utile pour les homophones). */
  phrase?: string;
  reponse: string;
}

/** Une place de défi du chantier : l'exercice lui-même est généré au moment de le poser. */
export interface ElementDefi {
  type: 'defi';
  id: string;
}

export type Element = ElementCalcul | ElementMot | ElementDefi;
export type TypeContenu = Element['type'];

export interface Contenu {
  id: string;
  titre: string;
  type: TypeContenu;
  elements: Element[];
}

export function idCalcul(a: number, b: number): string {
  return `x-${Math.min(a, b)}-${Math.max(a, b)}`;
}

/** Un mot s'écrit en minuscules sauf s'il commence par une majuscule (nom propre) : la majuscule ne compte pas. */
export function idMot(mot: string): string {
  return `m-${mot.normalize('NFC').toLocaleLowerCase('fr').trim()}`;
}

const ID_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Lettres françaises, apostrophe et trait d'union, avec des espaces simples (« petit à petit »). */
const MOT_VALIDE = /^[a-zA-ZàâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛŒÆ'’-]+( [a-zA-ZàâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛŒÆ'’-]+)*$/;

function nombreValide(valeur: unknown): valeur is number {
  return typeof valeur === 'number' && Number.isInteger(valeur) && valeur >= 0 && valeur <= 12;
}

/** Vérifie un contenu brut et le transforme. Renvoie la liste des problèmes trouvés, ou le contenu. */
export function lireContenu(brut: unknown, source: string): Contenu | string[] {
  const problemes: string[] = [];
  if (typeof brut !== 'object' || brut === null) return [`${source} : ce n'est pas un objet`];
  const objet = brut as Record<string, unknown>;

  if (typeof objet.id !== 'string' || !ID_VALIDE.test(objet.id)) {
    problemes.push(`${source} : « id » doit être en minuscules, chiffres et tirets`);
  }
  if (typeof objet.titre !== 'string' || objet.titre.trim() === '') {
    problemes.push(`${source} : « titre » manque`);
  }
  const type = objet.type;
  if (type !== 'calcul' && type !== 'mots') {
    problemes.push(`${source} : « type » inconnu (${String(type)})`);
    return problemes;
  }
  if (!Array.isArray(objet.elements) || objet.elements.length === 0) {
    problemes.push(`${source} : « elements » doit être une liste non vide`);
    return problemes;
  }

  const elements: Element[] = [];
  const vus = new Set<string>();
  objet.elements.forEach((element: unknown, rang) => {
    const brutElement = (element ?? {}) as Record<string, unknown>;
    const ou = `${source}, élément ${rang + 1}`;
    let lu: Element;
    if (type === 'calcul') {
      const { a, b } = brutElement;
      if (!nombreValide(a) || !nombreValide(b)) {
        problemes.push(`${ou} : « a » et « b » doivent être des nombres de 0 à 12`);
        return;
      }
      lu = { type, id: idCalcul(a, b), a, b, reponse: String(a * b) };
    } else {
      const { mot, phrase } = brutElement;
      if (typeof mot !== 'string' || !MOT_VALIDE.test(mot.normalize('NFC'))) {
        problemes.push(`${ou} : « mot » doit être écrit en lettres (${String(mot)})`);
        return;
      }
      if (phrase !== undefined && (typeof phrase !== 'string' || phrase.trim() === '')) {
        problemes.push(`${ou} : « phrase » est vide`);
        return;
      }
      const propre = mot.normalize('NFC').replace(/’/g, "'");
      lu = { type, id: idMot(propre), mot: propre, reponse: propre, ...(phrase ? { phrase } : {}) };
    }
    if (vus.has(lu.id)) {
      problemes.push(`${ou} : déjà dans ce contenu`);
      return;
    }
    vus.add(lu.id);
    elements.push(lu);
  });

  if (problemes.length > 0) return problemes;
  return { id: objet.id as string, titre: objet.titre as string, type, elements };
}

/** Tous les contenus du dossier content/packs, vérifiés au chargement. */
export function chargerContenus(): Contenu[] {
  const fichiers = import.meta.glob<unknown>('/content/packs/*.json', { eager: true, import: 'default' });
  const contenus: Contenu[] = [];
  for (const [chemin, brut] of Object.entries(fichiers)) {
    const lu = lireContenu(brut, chemin);
    if (Array.isArray(lu)) {
      console.error(lu.join('\n'));
      continue;
    }
    contenus.push(lu);
  }
  return contenus;
}
