// L'espace parent, côté aventures : les grandes quêtes et les demandes écrites par le rêve,
// que le parent lit puis valide ou refuse (rien n'est joué sans lui), et le sujet qu'il propose
// pour la prochaine grande quête (envoyé au rêve à l'échange suivant).

import T from '../../content/ville/propositions.json';
import { bruitage } from '../son/bruitages.ts';
import { lireDemandeRecue, PRODUITS } from './aventure-ville.ts';
import type { EtatVille } from './etat.ts';
import { sauvegardeDuJeu, sauverLeJeu } from './fete-ville.ts';
import { lireGrandeQuete, type GrandeQuete } from './grande-quete.ts';
import { bouton, creer, remplir } from './interface.ts';
import { nomDe, type Demande } from './demandes-ville.ts';
import { enMots } from './demandes.ts';

interface Contexte {
  etat(): EtatVille;
  sauver(): void;
  jour: string;
}

/** La clé d'une décision du parent (gardée avec celles du feuilleton, envoyée au rêve). */
export const cleQuete = (id: string): string => `quete:${id}`;
export const cleDemande = (id: string): string => `demande:${id}`;

type Proposition = { sorte: 'quete'; brut: unknown; lue: GrandeQuete } | { sorte: 'demande'; brut: unknown; lue: Demande } | { sorte: 'refusee'; titre: string; raison: string };

/** Les propositions du rêve pas encore décidées. */
function propositions(e: EtatVille): Proposition[] {
  const p = sauvegardeDuJeu().preparation;
  const v = sauvegardeDuJeu().validations;
  const r: Proposition[] = [];
  for (const brut of p?.quetes ?? []) {
    const q = lireGrandeQuete(brut, PRODUITS);
    if (typeof q === 'string') r.push({ sorte: 'refusee', titre: String((brut as { titre?: unknown })?.titre ?? '?'), raison: q });
    else if (!v[cleQuete(q.id)] && !e.quetesRecues.some((x) => (x as { id?: unknown })?.id === q.id)) r.push({ sorte: 'quete', brut, lue: q });
  }
  for (const brut of p?.demandes ?? []) {
    const d = lireDemandeRecue(brut);
    if (typeof d === 'string') r.push({ sorte: 'refusee', titre: String((brut as { id?: unknown })?.id ?? '?'), raison: d });
    else if (!v[cleDemande(d.id)]) r.push({ sorte: 'demande', brut, lue: d });
  }
  return r;
}

function fond(): HTMLElement {
  const f = creer('div', 'exercice-fond propositions-fond');
  document.body.append(f);
  return f;
}

const paragraphe = (texte: string, classe = 'proposition-texte'): HTMLElement => creer('p', classe, texte);

/** Le texte d'une grande quête, en entier, pour la relire. */
function texteQuete(q: GrandeQuete): HTMLElement {
  const d = creer('div', 'proposition-detail');
  q.chapitres.forEach((c, i) => {
    d.append(creer('h4', '', remplir(T.chapitre, { n: i + 1, titre: c.titre })), paragraphe(c.phrases.join(' ')));
    for (const x of c.questions) d.append(paragraphe(`${T.question} ${x.question} (${x.choix.join(' / ')})`, 'proposition-petit'));
    d.append(paragraphe(`${T.tache} ${c.tache.texte}`, 'proposition-petit'));
  });
  d.append(creer('h4', '', remplir(T.fin, { titre: q.fin.titre })), paragraphe(q.fin.phrases.join(' ')));
  d.append(paragraphe(`${T.question} ${q.fin.reflexion.question} (${q.fin.reflexion.choix.join(' / ')})`, 'proposition-petit'), paragraphe(`${T.morale} ${q.fin.morale}`, 'proposition-petit'));
  return d;
}

/** Les propositions du rêve, une par une : Valider, Refuser, ou Plus tard. */
export function ouvrirPropositions(c: Contexte): Promise<void> {
  return new Promise((fini) => {
    const f = fond();
    const dessiner = (): void => {
      const liste = propositions(c.etat());
      const s = creer('section', 'exercice propositions');
      s.append(creer('p', 'exercice-titre', T.titre));
      if (!liste.length) s.append(paragraphe(T.aucune));
      for (const p of liste) {
        const carte = creer('div', 'proposition');
        if (p.sorte === 'refusee') {
          carte.append(creer('h3', '', p.titre), paragraphe(remplir(T.illisible, { raison: p.raison }), 'proposition-petit'));
          s.append(carte);
          continue;
        }
        const decider = (oui: boolean): void => {
          bruitage.touche();
          const e = c.etat();
          const sv = sauvegardeDuJeu();
          if (p.sorte === 'quete') {
            sv.validations[cleQuete(p.lue.id)] = oui ? 'validee' : 'refusee';
            if (oui) e.quetesRecues = [...e.quetesRecues, p.brut];
          } else {
            sv.validations[cleDemande(p.lue.id)] = oui ? 'validee' : 'refusee';
            if (oui) e.demandesRecues = [...e.demandesRecues, p.brut];
          }
          sauverLeJeu();
          c.sauver();
          dessiner();
        };
        const valider = bouton('bouton-principal', T.valider);
        valider.addEventListener('click', () => decider(true));
        const refuser = bouton('bouton-secondaire', T.refuser);
        refuser.addEventListener('click', () => decider(false));
        const actions = creer('div', 'exercice-actions');
        actions.append(refuser, valider);
        if (p.sorte === 'quete') carte.append(creer('h3', '', remplir(T.titreQuete, { titre: p.lue.titre })), texteQuete(p.lue), actions);
        else
          carte.append(
            creer('h3', '', remplir(T.titreDemande, { besoin: enMots(p.lue.besoin, nomDe) })),
            paragraphe(p.lue.texte),
            paragraphe(`${T.merci} ${p.lue.merci}`, 'proposition-petit'),
            actions,
          );
        s.append(carte);
      }
      const fermer = bouton('bouton-principal', T.fermer);
      fermer.addEventListener('click', () => {
        f.remove();
        fini();
      });
      s.append(fermer);
      f.replaceChildren(s);
    };
    dessiner();
  });
}

/** Le sujet de la prochaine grande quête (pour le rêve). */
export function ouvrirSujet(c: Contexte): Promise<void> {
  return new Promise((fini) => {
    const f = fond();
    const s = creer('section', 'exercice propositions');
    const zone = creer('textarea', 'proposition-sujet');
    zone.maxLength = 300;
    zone.rows = 4;
    zone.value = c.etat().sujet.texte;
    zone.placeholder = T.sujetExemple;
    const enregistrer = bouton('bouton-principal', T.enregistrer);
    enregistrer.addEventListener('click', () => {
      c.etat().sujet = { texte: zone.value.trim(), date: c.jour };
      c.sauver();
      f.remove();
      fini();
    });
    const annuler = bouton('bouton-secondaire', T.fermer);
    annuler.addEventListener('click', () => {
      f.remove();
      fini();
    });
    const actions = creer('div', 'exercice-actions');
    actions.append(annuler, enregistrer);
    s.append(creer('p', 'exercice-titre', T.sujetTitre), paragraphe(T.sujetAide), zone, actions);
    f.replaceChildren(s);
    zone.focus();
  });
}

/** Ce que la ville envoie au rêve pour l'aventure : où on en est, ce qui est validé, le sujet. */
export function envoisAventure(e: EtatVille): { chemin: string; contenu: unknown } {
  return {
    chemin: 'ville/aventure.json',
    contenu: {
      enCours: e.grandeQuete.id,
      chapitre: e.grandeQuete.chapitre,
      finies: e.grandeQuete.finies,
      quetesValidees: e.quetesRecues.map((q) => (q as { id?: unknown })?.id).filter((x) => typeof x === 'string'),
      demandesValidees: e.demandesRecues.map((d) => (d as { id?: unknown })?.id).filter((x) => typeof x === 'string'),
      demandesFaites: e.demandes.historique,
      sujet: e.sujet,
    },
  };
}
