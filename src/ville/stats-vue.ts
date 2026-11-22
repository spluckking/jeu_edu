// L'écran des statistiques de l'espace parent : le programme de la semaine, les points faibles,
// puis chaque domaine (touché : le détail de ses compétences). Juste = du premier coup, sans aide.

import T from '../../content/ville/stats.json';
import type { Jour } from '../memoire/jours.ts';
import { bruitage } from '../son/bruitages.ts';
import { pointsFaibles, statistiques, taux, type Reponse, type Stat } from '../stats/stats.ts';
import { lundiDe } from './gazette.ts';
import { bouton, creer } from './interface.ts';
import type { Programme } from './programme.ts';

const DOMAINES = T.domaines as Record<string, string>;
const nomDe = (c: string): string => DOMAINES[c] ?? c;
const pourcent = (n: number | null): string => (n === null ? '–' : `${n} %`);

function ligne(c: string, s: Stat, classe: string): HTMLTableRowElement {
  const tr = creer('tr', classe);
  const r = taux(s.recents);
  const a = taux(s.avant);
  // La tendance : mieux ou moins bien qu'avant (5 points d'écart au moins).
  const tendance = r !== null && a !== null ? (r - a >= 5 ? ' ↗' : a - r >= 5 ? ' ↘' : '') : '';
  const cellules = [classe === 'stats-domaine' ? nomDe(c) : c.split('.').slice(1).join(' › '), String(s.total), `${pourcent(r)}${tendance} (${s.recents.total})`, `${pourcent(a)} (${s.avant.total})`, s.duree ? `${s.duree} s` : '–', s.dernier];
  for (const t of cellules) tr.append(creer('td', '', t));
  return tr;
}

export function ouvrirStats(journal: readonly Reponse[], jour: Jour, prog: Programme): Promise<void> {
  return new Promise((fini) => {
    const f = creer('div', 'exercice-fond propositions-fond');
    const s = creer('section', 'exercice propositions stats');
    const stats = statistiques(journal, jour);
    s.append(creer('p', 'exercice-titre', T.titre), creer('p', 'proposition-petit', T.aide));

    // Le programme de la semaine.
    const semaine = prog.semaines.find((x) => x.valide && x.lundi === lundiDe(jour));
    s.append(creer('h3', '', T.programme));
    if (!semaine) s.append(creer('p', 'proposition-texte', T.pasDeProgramme));
    else {
      s.append(creer('p', 'proposition-texte', semaine.titre));
      const l = creer('ul', 'stats-liste');
      for (const [stand, atelier] of Object.entries(semaine.ateliers)) l.append(creer('li', '', `${stand} : ${nomDe(atelier ?? '')}`));
      s.append(l);
    }

    // Les points faibles.
    s.append(creer('h3', '', T.pointsFaibles));
    const faibles = pointsFaibles(stats);
    if (!faibles.length) s.append(creer('p', 'proposition-texte', T.aucunPointFaible));
    else {
      const l = creer('ul', 'stats-liste');
      for (const c of faibles.slice(0, 10)) l.append(creer('li', '', `${nomDe(c.split('.')[0]!)} › ${c.split('.').slice(1).join(' › ')} : ${pourcent(taux(stats[c]!.recents))}`));
      s.append(l);
    }

    // Le tableau : les domaines, et leur détail quand on les touche.
    const domaines = Object.keys(stats).filter((c) => !c.includes('.'));
    if (!domaines.length) s.append(creer('p', 'proposition-texte', T.rien));
    else {
      const table = creer('table', 'stats-table');
      const tete = creer('tr', '');
      for (const t of T.colonnes) tete.append(creer('th', '', t));
      table.append(tete);
      for (const d of domaines.sort((x, y) => stats[y]!.total - stats[x]!.total)) {
        const tr = ligne(d, stats[d]!, 'stats-domaine');
        const details = Object.keys(stats)
          .filter((c) => c.startsWith(`${d}.`))
          .map((c) => ligne(c, stats[c]!, `stats-detail niveau-${c.split('.').length}`));
        for (const x of details) x.hidden = true;
        tr.addEventListener('click', () => {
          bruitage.touche();
          for (const x of details) x.hidden = !x.hidden;
        });
        table.append(tr, ...details);
      }
      s.append(table);
    }
    const fermer = bouton('bouton-principal', T.fermer);
    fermer.addEventListener('click', () => {
      f.remove();
      fini();
    });
    s.append(fermer);
    f.append(s);
    document.body.append(f);
  });
}
