// L'espace parent : derrière un appui long puis un code. Progression, éléments fragiles,
// résumé du dernier rêve, textes à valider, ajout rapide d'une liste, stands à éteindre,
// réglages et clé du dépôt privé.

import type { Semaine } from '../histoire/feuilleton.ts';
import { FORAINS, METIERS, nettoyerPrenom, PROPOSITIONS } from '../histoire/lecture.ts';
import type { IdStand } from '../scene/fete.ts';
import { PALETTES } from '../scene/palette.ts';
import { ajouterJours, type Jour } from '../memoire/jours.ts';
import { semaineDe } from '../recompenses/recompenses.ts';
import { DEPOT_VALIDE, ecrireAcces, lireAcces } from '../reve/synchro.ts';
import { exporterSauvegarde, importerSauvegarde, type Import } from '../sauvegarde/export.ts';
import type { Sauvegarde } from '../sauvegarde/format.ts';
import { bilanDepuis, elementsFragiles, lisible, minutesParJour } from './bilan.ts';

export interface OptionsEspace {
  sauvegarde(): Sauvegarde;
  sauver(): void;
  jour: Jour;
  /** Les stands que le parent peut éteindre. */
  stands: Array<{ id: string; titre: string }>;
  /** Semaines de feuilleton proposées par le rêve, pas encore décidées. */
  propositions(): Semaine[];
  /** Réglages modifiés : le jeu les applique tout de suite. */
  appliquer(): void;
  /** Lance un échange avec le dépôt privé ; renvoie un message pour le parent. */
  synchroniser(): Promise<string>;
  /** Rejouer l'introduction du jeu d'avant (absent dans la ville : pas de bouton). */
  rejouerIntroduction?(): void;
  /** Remplace toute la sauvegarde par celle d'un fichier, puis relance le jeu. */
  remplacer(s: Sauvegarde): Promise<void>;
  /** Les réglages de la ville (mots de la semaine, photos, statistiques…) : un bouton chacun ; on
   *  ferme l'espace parent avant d'ouvrir le réglage. */
  ville?: Array<{ titre: string; ouvrir(): void }>;
}

function el<K extends keyof HTMLElementTagNameMap>(balise: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  if (e instanceof HTMLButtonElement) e.type = 'button';
  return e;
}

const NOMS_STANDS: Record<string, string> = {
  chamboule: 'Chamboule-tout',
  confiserie: 'Confiserie',
  chantier: 'Défis du chantier',
  horloge: 'Horloge',
  peche: 'Pêche aux canards',
};

/** Le code : 4 chiffres, choisi la première fois. Se résout à vrai si la porte s'ouvre. */
function demanderCode(s: Sauvegarde, sauver: () => void): Promise<boolean> {
  return new Promise((fini) => {
    const fond = el('div', 'vitrine-fond');
    const carte = el('div', 'vitrine');
    const nouveau = !s.codeParent;
    const titre = el('p', 'lecture-titre', nouveau ? 'Espace parent : choisis un code de 4 chiffres' : 'Espace parent');
    const champ = el('input', 'champ-prenom');
    champ.inputMode = 'numeric';
    champ.type = 'password';
    champ.maxLength = 4;
    champ.autocomplete = 'off';
    champ.setAttribute('aria-label', 'Code');
    const message = el('p', 'lecture-texte', nouveau ? 'Il protège cet espace. Ne le donne pas à ton enfant.' : 'Tape le code.');
    const ok = el('button', 'bouton-principal', 'Entrer');
    const annuler = el('button', 'bouton-secondaire', 'Annuler');
    let premier = '';
    const fermer = (resultat: boolean): void => {
      fond.remove();
      fini(resultat);
    };
    ok.addEventListener('click', () => {
      const code = champ.value.trim();
      if (!/^\d{4}$/.test(code)) {
        message.textContent = 'Le code a 4 chiffres.';
        return;
      }
      if (!nouveau) {
        if (code === s.codeParent) fermer(true);
        else {
          message.textContent = 'Ce n’est pas le bon code.';
          champ.value = '';
        }
        return;
      }
      if (!premier) {
        premier = code;
        champ.value = '';
        message.textContent = 'Tape-le une deuxième fois.';
        return;
      }
      if (premier !== code) {
        premier = '';
        champ.value = '';
        message.textContent = 'Les deux codes sont différents. Recommence.';
        return;
      }
      s.codeParent = code;
      sauver();
      fermer(true);
    });
    champ.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') ok.click();
    });
    annuler.addEventListener('click', () => fermer(false));
    const boutons = el('div', 'lecture-boutons');
    boutons.append(annuler, ok);
    carte.append(titre, message, champ, boutons);
    fond.append(carte);
    document.body.append(fond);
    champ.focus();
  });
}

function section(titre: string, ...contenu: HTMLElement[]): HTMLElement {
  const s = el('section', 'parent-section');
  s.append(el('h2', '', titre), ...contenu);
  return s;
}

function curseur(etiquette: string, valeur: number, min: number, max: number, pas: number, changer: (v: number) => void, format = (v: number) => String(v)): HTMLElement {
  const ligne = el('label', 'parent-ligne');
  const texte = el('span', '', `${etiquette} : ${format(valeur)}`);
  const entree = el('input');
  entree.type = 'range';
  entree.min = String(min);
  entree.max = String(max);
  entree.step = String(pas);
  entree.value = String(valeur);
  entree.addEventListener('input', () => {
    const v = Number(entree.value);
    texte.textContent = `${etiquette} : ${format(v)}`;
    changer(v);
  });
  ligne.append(texte, entree);
  return ligne;
}

function construire(o: OptionsEspace, fermer: () => void): HTMLElement {
  const s = o.sauvegarde();
  const panneau = el('div', 'parent');
  const tete = el('div', 'parent-tete');
  const sortir = el('button', 'bouton-principal', 'Revenir au jeu');
  sortir.addEventListener('click', fermer);
  tete.append(el('h1', '', 'Espace parent'), sortir);

  // Progression de la semaine.
  const lundi = semaineDe(o.jour)[0] ?? o.jour;
  const bilan = bilanDepuis(s.journal, ajouterJours(o.jour, -6));
  const tableau = el('table', 'parent-tableau');
  tableau.innerHTML = '<thead><tr><th>Stand</th><th>Réponses</th><th>Justes</th><th>Avec indice</th></tr></thead>';
  const corps = el('tbody');
  for (const l of bilan) {
    const tr = el('tr');
    for (const v of [NOMS_STANDS[l.stand] ?? l.stand, String(l.reponses), `${Math.round((100 * l.justes) / Math.max(1, l.reponses))} %`, String(l.aides)]) tr.append(el('td', '', v));
    corps.append(tr);
  }
  tableau.append(corps);
  const jours = semaineDe(o.jour);
  const minutes = minutesParJour(s.journees, jours);
  const seances = jours.filter((j) => s.journees[j]?.finie).length;
  const resume = el(
    'p',
    '',
    `Cette semaine (depuis le lundi ${lundi.slice(8)}/${lundi.slice(5, 7)}) : ${seances} séance${seances > 1 ? 's' : ''} finie${seances > 1 ? 's' : ''}, ${minutes.reduce((a, b) => a + b, 0)} minutes de jeu. Tickets : ${s.tickets}, grande roue : ${s.roue}/10.`,
  );

  // Éléments fragiles.
  const fragiles = elementsFragiles(s.etats);
  const liste = el('ul', 'parent-liste');
  if (fragiles.length === 0) liste.append(el('li', '', 'Rien ne résiste pour l’instant.'));
  for (const f of fragiles) liste.append(el('li', '', `${lisible(f.id)} : ${f.echecs} erreurs, ${f.reussites} réussites${f.sangsue ? ' (résiste : le rêve va changer de méthode)' : ''}`));

  // Résumé du dernier rêve.
  const reve = el('p', '', s.preparation ? `${s.preparation.jour} : ${s.preparation.resume || '(pas de résumé)'}` : 'Aucun rêve reçu pour l’instant.');

  // Textes à valider.
  const attente = el('div', 'parent-attente');
  const remplirAttente = (): void => {
    const semaines = o.propositions();
    attente.replaceChildren();
    if (semaines.length === 0) attente.append(el('p', '', 'Aucun texte en attente.'));
    for (const semaine of semaines) {
      const bloc = el('details', 'parent-semaine');
      bloc.append(el('summary', '', `Feuilleton : ${semaine.titre} (${semaine.episodes.length} épisodes)`));
      for (const [i, e] of semaine.episodes.entries()) {
        const p = el('div', 'parent-episode');
        p.append(el('strong', '', `${i + 1}. ${e.titre}`), el('p', '', e.phrases.join(' ')), el('p', '', `Question : ${e.question} → ${e.choix[0]} (autres : ${e.choix[1]}, ${e.choix[2]})`));
        bloc.append(p);
      }
      const valider = el('button', 'bouton-principal', 'Valider la semaine');
      const refuser = el('button', 'bouton-secondaire', 'Refuser');
      const decider = (d: 'validee' | 'refusee'): void => {
        s.validations[semaine.id] = d;
        o.sauver();
        o.appliquer();
        remplirAttente();
      };
      valider.addEventListener('click', () => decider('validee'));
      refuser.addEventListener('click', () => decider('refusee'));
      const boutons = el('div', 'lecture-boutons');
      boutons.append(refuser, valider);
      bloc.append(boutons);
      attente.append(bloc);
    }
  };
  remplirAttente();

  // Ajout rapide d'une liste de mots.
  const titreListe = el('input', 'parent-champ');
  titreListe.placeholder = 'Titre (par exemple : mots de la semaine)';
  const zone = el('textarea', 'parent-zone');
  zone.placeholder = 'Un mot par ligne, avec ses accents';
  zone.rows = 6;
  const ajout = el('button', 'bouton-secondaire', 'Ajouter cette liste à la confiserie');
  const ajoutMessage = el('p', 'lecture-texte');
  ajout.addEventListener('click', () => {
    const mots = [...new Set(zone.value.split(/\n+/).map((m) => m.trim()).filter((m) => m.length > 0))];
    const mauvais = mots.filter((m) => !/^[\p{L}'’ -]+$/u.test(m));
    if (mots.length === 0 || mauvais.length > 0) {
      ajoutMessage.textContent = mots.length === 0 ? 'La liste est vide.' : `À corriger : ${mauvais.join(', ')}`;
      return;
    }
    s.listesRapides.push({ id: `liste-${o.jour}-${s.listesRapides.length + 1}`, titre: titreListe.value.trim() || `Liste du ${o.jour}`, mots });
    o.sauver();
    o.appliquer();
    zone.value = '';
    titreListe.value = '';
    ajoutMessage.textContent = `${mots.length} mots ajoutés : ils arrivent dès aujourd’hui à la confiserie, en priorité jusqu’à jeudi.`;
  });

  // Prénoms des forains : on peut corriger un prénom mal tapé.
  const prenoms = el('div');
  const champsPrenoms = new Map<IdStand, HTMLInputElement>();
  for (const id of FORAINS) {
    const ligne = el('label', 'parent-ligne');
    const champ = el('input', 'parent-champ');
    champ.value = s.forains[id] ?? '';
    champ.placeholder = PROPOSITIONS[id][0] ?? '';
    champ.maxLength = 14;
    champsPrenoms.set(id, champ);
    ligne.append(el('span', 'parent-etiquette', METIERS[id].replace(/^./, (c) => c.toUpperCase())), champ);
    prenoms.append(ligne);
  }
  const enregistrerPrenoms = el('button', 'bouton-secondaire', 'Enregistrer les prénoms');
  const messagePrenoms = el('p', 'lecture-texte');
  enregistrerPrenoms.addEventListener('click', () => {
    for (const [id, champ] of champsPrenoms) {
      const propre = nettoyerPrenom(champ.value);
      if (propre.length >= 2) s.forains[id] = propre;
      champ.value = s.forains[id] ?? '';
    }
    o.sauver();
    o.appliquer();
    messagePrenoms.textContent = 'Prénoms enregistrés.';
  });
  prenoms.append(enregistrerPrenoms, messagePrenoms);

  // Stands à éteindre.
  const stands = el('div', 'parent-cases');
  for (const st of o.stands) {
    const ligne = el('label', 'parent-ligne');
    const caseACocher = el('input');
    caseACocher.type = 'checkbox';
    caseACocher.checked = !s.reglages.standsEteints.includes(st.id);
    caseACocher.addEventListener('change', () => {
      s.reglages.standsEteints = caseACocher.checked ? s.reglages.standsEteints.filter((x) => x !== st.id) : [...s.reglages.standsEteints, st.id];
      o.sauver();
      o.appliquer();
    });
    ligne.append(caseACocher, el('span', '', st.titre));
    stands.append(ligne);
  }

  // Réglages.
  const changer = (): void => {
    o.sauver();
    o.appliquer();
  };
  const reglages = el('div');
  reglages.append(
    curseur('Musique', Math.round(s.reglages.volumeMusique * 100), 0, 100, 10, (v) => ((s.reglages.volumeMusique = v / 100), changer()), (v) => `${v} %`),
    curseur('Bruitages', Math.round(s.reglages.volumeBruitages * 100), 0, 100, 10, (v) => ((s.reglages.volumeBruitages = v / 100), changer()), (v) => `${v} %`),
    curseur('Voix', Math.round((s.reglages.volumeVoix ?? 1) * 100), 0, 100, 10, (v) => ((s.reglages.volumeVoix = v / 100), changer()), (v) => `${v} %`),
    curseur('Vitesse de la voix (tablette)', s.reglages.vitesseVoix, 0.6, 1.1, 0.05, (v) => ((s.reglages.vitesseVoix = v), changer()), (v) => (v < 0.85 ? 'lente' : v > 0.97 ? 'rapide' : 'normale')),
  );
  // Couleurs de la fête : même style, palettes différentes. Le jeu redémarre pour les appliquer.
  const ligneCouleurs = el('label', 'parent-ligne');
  const choixCouleurs = el('select', 'parent-champ');
  for (const [cle, pal] of Object.entries(PALETTES)) {
    const option = el('option', '', pal.nom);
    option.value = cle;
    option.selected = (s.reglages.palette ?? ((s.reglages.qualite ?? 'haute') === 'haute' ? 'naturelle' : 'pastel')) === cle;
    choixCouleurs.append(option);
  }
  choixCouleurs.addEventListener('change', () => {
    s.reglages.palette = choixCouleurs.value;
    void o.remplacer(s);
  });
  ligneCouleurs.append(el('span', 'parent-etiquette', 'Couleurs de la fête'), choixCouleurs);
  // Qualité graphique : « haute » (ombres, herbe en brins, matières) ou « standard » si la tablette peine.
  const ligneQualite = el('label', 'parent-ligne');
  const choixQualite = el('select', 'parent-champ');
  for (const [cle, nom] of [['haute', 'Haute (ombres, herbe, matières)'], ['standard', 'Standard (plus léger)']] as const) {
    const option = el('option', '', nom);
    option.value = cle;
    option.selected = (s.reglages.qualite ?? 'haute') === cle;
    choixQualite.append(option);
  }
  choixQualite.addEventListener('change', () => {
    s.reglages.qualite = choixQualite.value;
    void o.remplacer(s);
  });
  ligneQualite.append(el('span', 'parent-etiquette', 'Qualité graphique'), choixQualite);
  reglages.append(ligneCouleurs, ligneQualite);
  if (o.rejouerIntroduction) {
    const rejouerIntro = o.rejouerIntroduction;
    const rejouer = el('button', 'bouton-secondaire', 'Rejouer l’introduction');
    rejouer.addEventListener('click', () => {
      fermer();
      rejouerIntro();
    });
    reglages.append(rejouer);
  }

  // Clé du dépôt privé.
  const acces = lireAcces();
  const depot = el('input', 'parent-champ');
  depot.placeholder = 'propriétaire/nom-du-dépôt';
  depot.value = acces?.depot ?? '';
  const cle = el('input', 'parent-champ');
  cle.type = 'password';
  cle.placeholder = acces ? 'Clé enregistrée (laisser vide pour la garder)' : 'Clé d’accès au dépôt privé';
  cle.autocomplete = 'off';
  const etat = el('p', 'lecture-texte', s.synchro.derniere ? `Dernier échange : ${new Date(s.synchro.derniere).toLocaleString('fr-FR')}` : 'Aucun échange pour l’instant.');
  if (s.synchro.probleme) etat.textContent += ` Dernier problème : ${s.synchro.probleme}`;
  const enregistrer = el('button', 'bouton-secondaire', 'Enregistrer');
  const echanger = el('button', 'bouton-principal', 'Échanger maintenant');
  const oublier = el('button', 'bouton-secondaire', 'Oublier la clé');
  enregistrer.addEventListener('click', () => {
    const d = depot.value.trim();
    const c = cle.value.trim() || acces?.cle || '';
    if (!DEPOT_VALIDE.test(d) || c === '') {
      etat.textContent = 'Il faut le nom du dépôt (propriétaire/nom) et la clé.';
      return;
    }
    ecrireAcces({ depot: d, cle: c });
    cle.value = '';
    etat.textContent = 'Clé enregistrée sur cette tablette.';
  });
  echanger.addEventListener('click', async () => {
    etat.textContent = 'Échange en cours…';
    etat.textContent = await o.synchroniser();
    reve.textContent = s.preparation ? `${s.preparation.jour} : ${s.preparation.resume || '(pas de résumé)'}` : reve.textContent;
    remplirAttente();
  });
  oublier.addEventListener('click', () => {
    ecrireAcces(null);
    depot.value = '';
    etat.textContent = 'Clé oubliée : plus aucun échange.';
  });
  const boutonsDepot = el('div', 'lecture-boutons');
  boutonsDepot.append(enregistrer, echanger, oublier);

  // Copie de secours : télécharger la sauvegarde, ou la recharger depuis un fichier.
  const exporter = el('button', 'bouton-principal', 'Exporter la sauvegarde');
  const importer = el('button', 'bouton-secondaire', 'Importer une sauvegarde');
  const fichier = el('input');
  fichier.type = 'file';
  fichier.accept = '.json,application/json';
  fichier.hidden = true;
  const messageSecours = el('p', 'lecture-texte');
  const confirmer = el('button', 'bouton-principal', 'Remplacer la sauvegarde');
  const renoncer = el('button', 'bouton-secondaire', 'Annuler');
  const boutonsConfirmer = el('div', 'lecture-boutons');
  boutonsConfirmer.append(renoncer, confirmer);
  boutonsConfirmer.hidden = true;
  let enAttente: Import | null = null;
  exporter.addEventListener('click', () => {
    const { nom, texte } = exporterSauvegarde(s, o.jour);
    const adresse = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
    const lien = el('a');
    lien.href = adresse;
    lien.download = nom;
    document.body.append(lien);
    lien.click();
    lien.remove();
    window.setTimeout(() => URL.revokeObjectURL(adresse), 10_000);
    messageSecours.textContent = `Fichier « ${nom} » enregistré dans les téléchargements. Garde-le en lieu sûr.`;
  });
  importer.addEventListener('click', () => fichier.click());
  fichier.addEventListener('change', async () => {
    const choisi = fichier.files?.[0];
    fichier.value = '';
    if (!choisi) return;
    try {
      enAttente = importerSauvegarde(await choisi.text());
    } catch (erreur) {
      enAttente = null;
      boutonsConfirmer.hidden = true;
      messageSecours.textContent = erreur instanceof Error ? erreur.message : 'Fichier illisible.';
      return;
    }
    const n = enAttente.sauvegarde;
    const date = enAttente.exportee ? new Date(enAttente.exportee).toLocaleString('fr-FR') : 'date inconnue';
    messageSecours.textContent = `Sauvegarde du ${date} : ${n.tickets} tickets, grande roue ${n.roue}/10, ${Object.keys(n.journees).length} jours de jeu. Elle remplacera entièrement la sauvegarde actuelle.`;
    boutonsConfirmer.hidden = false;
  });
  renoncer.addEventListener('click', () => {
    enAttente = null;
    boutonsConfirmer.hidden = true;
    messageSecours.textContent = 'Rien n’a changé.';
  });
  confirmer.addEventListener('click', () => {
    if (!enAttente) return;
    confirmer.disabled = true;
    messageSecours.textContent = 'Remplacement en cours, le jeu va redémarrer…';
    void o.remplacer(enAttente.sauvegarde);
  });
  const boutonsSecours = el('div', 'lecture-boutons');
  boutonsSecours.append(exporter, importer);

  const ville = el('div', 'lecture-boutons parent-ville');
  for (const v of o.ville ?? []) {
    const b = el('button', 'bouton-secondaire', v.titre);
    b.addEventListener('click', () => {
      fermer();
      v.ouvrir();
    });
    ville.append(b);
  }
  panneau.append(
    tete,
    ...(o.ville?.length ? [section('MiniVille', ville)] : []),
    section('Progression', resume, tableau),
    section('Éléments fragiles', liste),
    section('Dernier rêve', reve),
    section('Textes à valider', attente),
    section('Ajout rapide d’une liste', titreListe, zone, ajout, ajoutMessage),
    section('Prénoms des forains', prenoms),
    section('Stands allumés', stands),
    section('Réglages', reglages),
    section(
      'Dépôt privé (rêve du soir)',
      el('p', 'lecture-texte', 'La clé reste sur cette tablette. Elle ne doit donner accès qu’au dépôt privé du rêve.'),
      depot,
      cle,
      boutonsDepot,
      etat,
    ),
    section(
      'Copie de secours',
      el(
        'p',
        'lecture-texte',
        'Avant de vider le cache ou de changer de tablette, exporte la sauvegarde : tickets, lots, progression, prénoms et réglages. La clé du dépôt privé n’est pas dans le fichier.',
      ),
      boutonsSecours,
      fichier,
      messageSecours,
      boutonsConfirmer,
    ),
  );
  return panneau;
}

/** Ouvre l'espace parent (après le code). */
export async function ouvrirEspaceParent(o: OptionsEspace): Promise<void> {
  if (!(await demanderCode(o.sauvegarde(), o.sauver))) return;
  await new Promise<void>((fini) => {
    const fond = el('div', 'parent-fond');
    const fermer = (): void => {
      fond.remove();
      fini();
    };
    fond.append(construire(o, fermer));
    document.body.append(fond);
  });
}

/** Un appui long (2 s) sur ce bouton ouvre la porte ; un appui court ne fait rien. */
export function porteParent(bouton: HTMLElement, ouvrir: () => void): void {
  let minuterie = 0;
  let doigt: number | null = null;
  const annuler = (): void => {
    window.clearTimeout(minuterie);
    doigt = null;
    bouton.classList.remove('appui');
  };
  // Sur tablette, un appui long déclenche le menu du navigateur et annule le geste :
  // on l'empêche, et le doigt reste « capturé » par le bouton même s'il glisse un peu.
  bouton.addEventListener('contextmenu', (e) => e.preventDefault());
  bouton.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doigt = e.pointerId;
    try {
      bouton.setPointerCapture(e.pointerId);
    } catch {
      // Pas de capture possible : l'appui long marche quand même si le doigt ne bouge pas.
    }
    bouton.classList.add('appui');
    window.clearTimeout(minuterie);
    minuterie = window.setTimeout(() => {
      annuler();
      ouvrir();
    }, 1500);
  });
  bouton.addEventListener('pointerup', (e) => {
    if (e.pointerId === doigt) annuler();
  });
}
