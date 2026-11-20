// Pour le parent (depuis l'espace parent) : les statistiques de la dictée, mot par mot, et les
// écritures du jour à vérifier. Le temps d'écriture n'est montré qu'ici, jamais à l'enfant.

import { chances, type FicheMot } from '../dictee/memoire.ts';
import type { EtatDictee } from '../dictee/etat.ts';
import { aujourdhui } from '../dictee/leitner.ts';
import { bruitage } from '../son/bruitages.ts';
import { changerEcriture, toutesLesEcritures, verdict, type Ecriture } from './ecritures.ts';

const creer = <K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  return e;
};
const bouton = (classe: string, texte: string): HTMLButtonElement => Object.assign(creer('button', classe, texte), { type: 'button' as const });

function fenetre(titre: string, contenu: HTMLElement[]): Promise<void> {
  return new Promise((fini) => {
    const fond = creer('div', 'parent-fond');
    const panneau = creer('div', 'parent');
    const tete = creer('div', 'parent-tete');
    const sortir = bouton('bouton-principal', 'Fermer');
    sortir.addEventListener('click', () => {
      bruitage.touche();
      fond.remove();
      fini();
    });
    tete.append(creer('h1', '', titre), sortir);
    panneau.append(tete, ...contenu);
    fond.append(panneau);
    document.body.append(fond);
  });
}

const jours = (s: number): string => (s < 1 ? 'moins d’un jour' : s < 60 ? `${Math.round(s)} jour${Math.round(s) > 1 ? 's' : ''}` : `${Math.round(s / 30)} mois`);
const secondes = (ms: number): string => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/** Une ligne par mot : difficulté, stabilité, chances aujourd'hui, réussite, temps, erreurs. */
function tableauDesMots(mots: string[], fiches: Record<string, FicheMot>, jour: string): HTMLElement {
  const t = creer('table', 'parent-tableau');
  const tete = creer('tr');
  for (const x of ['Mot', 'Difficulté', 'Tient', 'Chances aujourd’hui', 'Réussite', 'Temps par lettre', 'Erreurs lues']) tete.append(creer('th', '', x));
  t.append(creer('thead'));
  t.tHead?.append(tete);
  const corps = creer('tbody');
  const tries = [...mots].sort((a, b) => (fiches[a] ? chances(fiches[a], jour) : 0) - (fiches[b] ? chances(fiches[b], jour) : 0));
  for (const m of tries) {
    const f = fiches[m];
    const tr = creer('tr');
    const essais = f?.essais ?? [];
    const justes = essais.filter((e) => e.juste).length;
    const temps = essais.filter((e) => e.juste && e.lettres > 0 && e.ms > 0).map((e) => e.ms / e.lettres);
    const moyen = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const erreurs = [...new Set(essais.filter((e) => !e.juste && e.ecrit).map((e) => e.ecrit as string))];
    for (const v of [
      m,
      f ? `${f.d.toFixed(1).replace('.', ',')} / 10` : '—',
      f?.dernier ? jours(f.s) : 'pas encore vu',
      f?.dernier ? `${Math.round(chances(f, jour) * 100)} %` : '—',
      essais.length ? `${justes} sur ${essais.length}` : '—',
      moyen ? secondes(moyen) : '—',
      erreurs.join(', ') || '—',
    ])
      tr.append(creer('td', '', v));
    corps.append(tr);
  }
  t.append(corps);
  return t;
}

export async function statistiquesDictee(e: EtatDictee): Promise<void> {
  const jour = aujourdhui();
  const fiches = e.fiches ?? {};
  const semaine = e.mots.map((m) => m.w);
  const anciens = Object.keys(e.memoire);
  const concours = [...e.concours].reverse().map((c) => creer('li', '', `${c.date} : ${c.justes} sur ${c.total}${c.rates.length ? ` (à revoir : ${c.rates.join(', ')})` : ''}`));
  const section = (titre: string, ...x: HTMLElement[]): HTMLElement => {
    const s = creer('section', 'parent-section');
    s.append(creer('h2', '', titre), ...x);
    return s;
  };
  const listeConcours = creer('ul', 'parent-liste');
  listeConcours.append(...(concours.length ? concours : [creer('li', '', 'Pas encore de concours.')]));
  const sus = creer('p', 'lecture-texte', e.retires.length ? e.retires.map((r) => r.w).join(', ') : 'Aucun pour l’instant.');
  await fenetre('Statistiques de la dictée', [
    section(
      `La liste de la semaine${e.titre ? ` : ${e.titre}` : ''}`,
      creer('p', 'lecture-texte', 'Du plus fragile au plus solide. « Tient » : combien de temps le mot reste en mémoire avant de commencer à s’oublier. « Chances aujourd’hui » : ses chances de l’écrire juste aujourd’hui.'),
      semaine.length ? tableauDesMots(semaine, fiches, jour) : creer('p', 'lecture-texte', 'Pas de liste pour l’instant.'),
    ),
    section('Les anciens mots, encore en mémoire', anciens.length ? tableauDesMots(anciens, fiches, jour) : creer('p', 'lecture-texte', 'Aucun.')),
    section('Les concours d’écriture', listeConcours),
    section('Sus pour toujours', sus),
  ]);
}

/** Les écritures, jour par jour (le plus récent d'abord) : le parent dit si c'est juste. */
export async function ecrituresDuSoir(appliquer: (e: Ecriture, juste: boolean) => void): Promise<void> {
  const toutes = (await toutesLesEcritures()).filter((x) => x.sorte !== 'reprise');
  const parJour = new Map<string, Ecriture[]>();
  for (const x of toutes) parJour.set(x.jour, [...(parJour.get(x.jour) ?? []), x]);
  const contenu: HTMLElement[] = [
    creer('p', 'lecture-texte', 'Chaque mot écrit au stylet, avec ce que l’enfant a dit en comparant. Touche « Juste » ou « Faux » pour corriger : la mémoire du mot en tient compte, et le rêve aussi.'),
  ];
  if (!toutes.length) contenu.push(creer('p', 'lecture-texte', 'Aucune écriture pour l’instant.'));
  for (const [jour, liste] of [...parJour].reverse()) {
    const s = creer('section', 'parent-section');
    s.append(creer('h2', '', jour));
    for (const x of liste) {
      const rangee = creer('div', 'comparaison');
      const img = creer('img', 'comparaison-image');
      img.src = URL.createObjectURL(x.image);
      const mot = creer('span', 'comparaison-mot', x.mot);
      const avis = creer('span', 'lecture-texte', avisDe(x));
      const juste = bouton('choix-petit', 'Juste');
      const faux = bouton('choix-petit', 'Faux');
      const marquer = (): void => {
        const v = verdict(x);
        juste.classList.toggle('choisi', x.parent === true || (x.parent === null && v === true));
        faux.classList.toggle('choisi', x.parent === false || (x.parent === null && v === false));
        avis.textContent = avisDe(x);
      };
      for (const [b, oui] of [
        [juste, true],
        [faux, false],
      ] as const) {
        b.addEventListener('click', () => {
          bruitage.touche();
          x.parent = oui;
          void changerEcriture(x.id, { parent: oui });
          appliquer(x, oui);
          marquer();
        });
      }
      marquer();
      rangee.append(img, mot, avis, faux, juste);
      s.append(rangee);
    }
    contenu.push(s);
  }
  await fenetre('Les écritures', contenu);
}

function avisDe(x: Ecriture): string {
  const dit = (v: boolean | null): string => (v === null ? '?' : v ? 'juste' : 'faux');
  const morceaux = [`Lui : ${dit(x.enfant)}`];
  if (x.reve !== null) morceaux.push(`Rêve : ${dit(x.reve)}${x.lu ? ` (« ${x.lu} »)` : ''}`);
  if (x.parent !== null) morceaux.push(`Toi : ${dit(x.parent)}`);
  morceaux.push(secondes(x.ms));
  return morceaux.join(' · ');
}
