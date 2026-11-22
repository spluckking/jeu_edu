// La Gazette à l'écran : une page de journal (le nom en grand, la date, des colonnes), l'histoire
// de la semaine, les quêtes (avec « Voir sur la carte »), puis le questionnaire, à côté de
// l'article : chaque question doit être juste. Après une erreur, les réponses se bloquent : il faut
// d'abord toucher, dans l'article, la phrase qui donne la réponse (au bout de deux phrases
// fausses, le passage qui la contient s'allume). Taper au hasard devient plus long que lire. Les
// réponses justes du premier coup donnent la prime du reporter (au premier essai du jour).

import T from '../../content/ville/gazette.json';
import L from '../../content/ville/lecons.json';
import { bruitage } from '../son/bruitages.ts';
import { euros, somme } from './argent.ts';
import { primeDuReporter, type Edition, type Question } from './gazette.ts';
import { remplir, texteALire } from './interface.ts';

export interface VueGazette {
  edition: Edition;
  questions: Question[];
  /** D'autres questions de la même édition : à la deuxième erreur, la question change. */
  reserve: Question[];
  /** La date en toutes lettres (« vendredi 20 novembre »). */
  date: string;
  /** Le numéro de la semaine de jeu. */
  semaine: number;
  /** Montre les quêtes sur la carte (toute la ville, un repère par quête). */
  visiter(): Promise<void>;
  /** Vrai au premier questionnaire du jour : seul celui-là donne la prime. */
  primeOuverte: boolean;
  /** Le questionnaire commence (pour ne donner la prime qu'au premier essai). */
  commence(): void;
  /** La première réponse à chaque question (pour les statistiques). */
  noter?(q: Question, juste: boolean, reponse: string, duree: number): void;
}

/** Le questionnaire réussi : combien de réponses justes du premier coup, et la prime gagnée. */
export interface Resultat {
  premierCoup: number;
  total: number;
  prime: number[];
}

const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texte?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
};

/** Ouvre la Gazette ; rend le résultat si elle est lue et son questionnaire réussi (null sinon). */
export function lireLaGazette(v: VueGazette): Promise<Resultat | null> {
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
    // La grande aventure d'abord : le chapitre du jour (ou la fin).
    if (e.aventure) article.append(creer('h2', 'gazette-rubrique', T.textes.aventure), creer('h3', 'gazette-titre', e.aventure.titre), creer('p', 'gazette-sous-titre', e.aventure.sousTitre), paragraphe(e.aventure.phrases));
    // La leçon du jour, dans un encadré.
    if (e.lecon) {
      const encadre = creer('section', 'gazette-lecon');
      encadre.append(creer('h2', 'gazette-rubrique', `${L.rubrique} — ${e.lecon.matiere}`), creer('h3', 'gazette-titre', e.lecon.titre), paragraphe(e.lecon.phrases));
      article.append(encadre);
    }
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
    if (e.type !== 'histoire' && !e.quetes.length && !e.aventure) article.append(paragraphe([T.textes.rien]));

    // Le questionnaire, dans la colonne de droite.
    const cote = creer('aside', 'gazette-cote');
    const fermer = creer('button', 'bouton-secondaire', 'Fermer');
    fermer.type = 'button';
    fermer.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini(null);
    });
    const total = v.questions.length;
    let premierCoup = 0;
    const terminer = (): void => {
      cote.replaceChildren(texteALire(T.textes.fini, 'gazette-bravo texte-a-lire'));
      const prime = v.primeOuverte ? primeDuReporter(premierCoup, total) : [];
      if (total >= 3) {
        cote.append(creer('p', 'gazette-premier-coup', remplir(T.textes.premierCoup, { n: premierCoup, total })));
        const message = prime.length ? remplir(T.textes.prime, { euros: euros(somme(prime)) }) : v.primeOuverte ? T.textes.pasDePrime : T.textes.primeDejaJouee;
        cote.append(texteALire(message, prime.length ? 'gazette-prime texte-a-lire' : 'gazette-retour texte-a-lire'));
        if (prime.length) bruitage.reussite();
      }
      // À la fin d'une grande aventure, la morale, après la question pour réfléchir.
      if (e.aventure?.morale) cote.append(texteALire(remplir(T.textes.morale, { morale: e.aventure.morale }), 'gazette-morale texte-a-lire'));
      const b = creer('button', 'bouton-principal', T.textes.sortir);
      b.type = 'button';
      b.addEventListener('click', () => {
        bruitage.touche();
        fond.remove();
        fini({ premierCoup, total, prime });
      });
      cote.append(b);
    };

    // Chercher la phrase : après une erreur, on touche dans l'article la phrase de la réponse.
    let recherche: { cible: HTMLElement; rates: number; retour: HTMLElement; trouvee(): void } | null = null;
    const finirRecherche = (): void => {
      recherche = null;
      article.classList.remove('gazette-cherche');
      for (const p of article.querySelectorAll('.piste')) p.classList.remove('piste');
    };
    article.addEventListener('click', (ev) => {
      const r = recherche;
      const touchee = (ev.target as HTMLElement | null)?.closest<HTMLElement>('.gazette-phrase');
      if (!r || !touchee) return;
      if (touchee === r.cible) {
        bruitage.reussite();
        touchee.classList.add('brille');
        r.retour.textContent = T.textes.trouvee;
        finirRecherche();
        r.trouvee();
        return;
      }
      bruitage.erreur();
      r.rates++;
      touchee.classList.remove('pas-celle');
      void touchee.offsetWidth;
      touchee.classList.add('pas-celle');
      if (r.rates >= 2) {
        r.cible.closest('.gazette-texte')?.classList.add('piste');
        r.retour.textContent = T.textes.piste;
      } else r.retour.textContent = T.textes.pasCettePhrase;
    });

    const reste = [...v.reserve];
    const poser = (i: number, autre = false): void => {
      const q = v.questions[i];
      if (!q) return terminer();
      finirRecherche();
      for (const s of phrases.values()) s.classList.remove('brille');
      const choix = [...q.choix].map((c, k) => ({ c, juste: k === 0 }));
      for (let k = choix.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [choix[k], choix[j]] = [choix[j]!, choix[k]!];
      }
      const retour = creer('p', 'gazette-retour', autre ? T.textes.autre : '');
      let erreurs = 0;
      let notee = false;
      const debut = performance.now();
      const boutons = choix.map(({ c, juste }) => {
        const b = creer('button', 'choix gazette-choix', c);
        b.type = 'button';
        b.addEventListener('click', () => {
          if (!notee) {
            notee = true;
            v.noter?.(q, juste, c, Math.round(performance.now() - debut));
          }
          if (juste) {
            bruitage.reussite();
            b.classList.add('juste');
            retour.textContent = T.textes.juste;
            if (!autre && erreurs === 0) premierCoup++;
            for (const x of boutons) x.disabled = true;
            setTimeout(() => poser(i + 1), 900);
            return;
          }
          bruitage.erreur();
          erreurs++;
          // Deuxième erreur : une autre question à la place (s'il en reste).
          const nouvelle = erreurs >= 2 ? reste.shift() : undefined;
          if (nouvelle) {
            v.questions[i] = nouvelle;
            setTimeout(() => poser(i, true), 700);
            for (const x of boutons) x.disabled = true;
            return;
          }
          b.classList.add('faux');
          b.disabled = true;
          const s = q.indice ? phrases.get(q.indice) : undefined;
          // Pas de phrase à chercher (une question pour réfléchir) : on réessaie tout de suite.
          if (!s || s.classList.contains('brille')) {
            retour.textContent = T.textes.fauxSansPhrase;
            return;
          }
          // Les réponses attendent qu'on ait trouvé la phrase dans l'article.
          for (const x of boutons) x.disabled = true;
          retour.textContent = T.textes.faux;
          article.classList.add('gazette-cherche');
          recherche = {
            cible: s,
            rates: 0,
            retour,
            trouvee: () => {
              for (const x of boutons) if (!x.classList.contains('faux')) x.disabled = false;
            },
          };
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
      v.commence();
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
