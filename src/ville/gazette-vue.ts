// La Gazette à l'écran : une page de journal (le nom en grand, la date, des colonnes), l'histoire
// de la semaine, les quêtes (avec « Voir sur la carte »), puis le questionnaire, à côté de
// l'article : chaque question doit être juste ; après une erreur, la phrase qui contient la
// réponse s'allume dans l'article et on réessaie.

import T from '../../content/ville/gazette.json';
import { bruitage } from '../son/bruitages.ts';
import type { Edition, Question } from './gazette.ts';
import { remplir, texteALire } from './interface.ts';

export interface VueGazette {
  edition: Edition;
  questions: Question[];
  /** La date en toutes lettres (« vendredi 20 novembre »). */
  date: string;
  /** Le numéro de la semaine de jeu. */
  semaine: number;
  /** Montre les quêtes sur la carte (toute la ville, un repère par quête). */
  visiter(): Promise<void>;
}

const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texte?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
};

/** Ouvre la Gazette ; rend vrai si elle est lue et son questionnaire réussi. */
export function lireLaGazette(v: VueGazette): Promise<boolean> {
  return new Promise((fini) => {
    const fond = creer('div', 'gazette-fond');
    const page = creer('article', 'gazette-page');
    const tete = creer('header', 'gazette-tete');
    tete.append(creer('p', 'gazette-nom', T.nom), creer('p', 'gazette-date', `${v.date} — Semaine ${v.semaine}`));
    const article = creer('div', 'gazette-article');
    const phrases = new Map<string, HTMLElement>();
    const paragraphe = (lignes: string[]): HTMLElement => {
      const p = creer('div', 'gazette-texte');
      for (const l of lignes) {
        const s = texteALire(l, 'gazette-phrase texte-a-lire');
        phrases.set(l, s);
        p.append(s, ' ');
      }
      return p;
    };
    const e = v.edition;
    if (e.type === 'histoire') article.append(creer('h2', 'gazette-rubrique', T.textes.histoire), creer('h3', 'gazette-titre', e.histoire.titre), paragraphe(e.histoire.phrases));
    if (e.type === 'bilan') article.append(paragraphe([T.textes.bilan]));
    if (e.type !== 'bilan' && e.quetes.length) {
      article.append(creer('h2', 'gazette-rubrique', T.textes.quetes));
      for (const q of e.quetes) article.append(creer('h3', 'gazette-titre', q.titre), paragraphe(q.phrases));
      const carte = creer('button', 'bouton-secondaire gazette-carte', T.textes.carte);
      carte.type = 'button';
      carte.addEventListener('click', () => {
        bruitage.touche();
        fond.hidden = true;
        void v.visiter().then(() => (fond.hidden = false));
      });
      article.append(carte);
    }
    if (e.type !== 'histoire' && !e.quetes.length) article.append(paragraphe([T.textes.rien]));

    // Le questionnaire, dans la colonne de droite.
    const cote = creer('aside', 'gazette-cote');
    const fermer = creer('button', 'bouton-secondaire', 'Fermer');
    fermer.type = 'button';
    fermer.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini(false);
    });
    const terminer = (): void => {
      cote.replaceChildren(texteALire(T.textes.fini, 'gazette-bravo texte-a-lire'));
      const b = creer('button', 'bouton-principal', T.textes.sortir);
      b.type = 'button';
      b.addEventListener('click', () => {
        bruitage.touche();
        fond.remove();
        fini(true);
      });
      cote.append(b);
    };
    const poser = (i: number): void => {
      const q = v.questions[i];
      if (!q) return terminer();
      for (const s of phrases.values()) s.classList.remove('brille');
      const choix = [...q.choix].map((c, k) => ({ c, juste: k === 0 }));
      for (let k = choix.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [choix[k], choix[j]] = [choix[j]!, choix[k]!];
      }
      const retour = creer('p', 'gazette-retour');
      const boutons = choix.map(({ c, juste }) => {
        const b = creer('button', 'choix gazette-choix', c);
        b.type = 'button';
        b.addEventListener('click', () => {
          if (juste) {
            bruitage.reussite();
            b.classList.add('juste');
            retour.textContent = T.textes.juste;
            for (const x of boutons) x.disabled = true;
            setTimeout(() => poser(i + 1), 900);
            return;
          }
          bruitage.erreur();
          b.classList.add('faux');
          b.disabled = true;
          retour.textContent = T.textes.faux;
          const s = q.indice ? phrases.get(q.indice) : undefined;
          if (s) {
            s.classList.add('brille');
            s.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        return b;
      });
      const liste = creer('div', 'gazette-choix-liste');
      liste.append(...boutons);
      cote.replaceChildren(
        creer('p', 'gazette-numero', remplir(T.textes.question, { n: i + 1, total: v.questions.length })),
        texteALire(q.question, 'gazette-question texte-a-lire'),
        liste,
        retour,
      );
    };
    const commencer = creer('button', 'bouton-principal', v.questions.length ? T.textes.questionnaire : T.textes.jaiLu);
    commencer.type = 'button';
    commencer.addEventListener('click', () => {
      bruitage.touche();
      if (v.questions.length) poser(0);
      else terminer();
    });
    cote.append(commencer, fermer);

    const corps = creer('div', 'gazette-corps');
    corps.append(article, cote);
    page.append(tete, corps);
    fond.append(page);
    document.body.append(fond);
  });
}
