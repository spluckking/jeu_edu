// L'espace parent, ouvert depuis la ville (l'ancien jeu est archivé) : le même que dans le jeu
// d'avant, sur la même sauvegarde (celle des stands). La ville fait aussi l'échange avec le dépôt
// privé du rêve, à l'arrivée et à la demande du parent, comme le faisait le jeu d'avant.

import { chargerFeuilleton, lireSemaine, type Semaine } from '../histoire/feuilleton.ts';
import { MODE_ESSAI } from '../app/essai.ts';
import { jourDe } from '../memoire/jours.ts';
import { ouvrirEspaceParent, porteParent } from '../parent/espace.ts';
import type { Preparation } from '../reve/preparation.ts';
import { lireAcces, synchroniser, type Envoi } from '../reve/synchro.ts';
import { appliquerReglagesDuJeu, remplacerSauvegarde, sauvegardeDuJeu, sauverLeJeu, standsDuJeu } from './fete-ville.ts';

const aujourdhui = (): ReturnType<typeof jourDe> => jourDe(new Date());

/** Les semaines de feuilleton proposées par le rêve (le parent les valide ou non). */
function semainesProposees(): Semaine[] {
  const duDepot = chargerFeuilleton();
  return (sauvegardeDuJeu().preparation?.feuilleton ?? []).flatMap((brut, i) => {
    const lu = lireSemaine(brut, `proposition ${i + 1}`);
    return Array.isArray(lu) || duDepot.some((s) => s.id === lu.id) ? [] : [lu];
  });
}

/** Une préparation nouvelle du rêve : ses niveaux conseillés deviennent ceux des stands. */
function appliquerPreparation(p: Preparation): void {
  const s = sauvegardeDuJeu();
  const neuf = { reussitesDeSuite: 0, erreursDeSuite: 0 };
  if (p.niveaux.defis) s.niveauDefis = { niveau: p.niveaux.defis, ...neuf };
  if (p.niveaux.horloge) s.niveauHorloge = { niveau: p.niveaux.horloge, ...neuf };
  if (p.niveaux.peche) s.niveauPeche = { niveau: p.niveaux.peche, ...neuf };
  s.preparation = p;
}

/** Ce que la ville ajoute à l'échange (la dictée) : les fichiers à déposer, puis la suite. */
export interface ExtraEchange {
  envois(): Promise<Envoi[]>;
  apres(chemins: readonly string[], brut: unknown): Promise<void>;
}
let extra: ExtraEchange | null = null;
export function ajouterALEchange(x: ExtraEchange): void {
  extra = x;
}

let echangeEnCours = false;
/** Un échange avec le dépôt privé, s'il y a une clé et du réseau ; renvoie un message pour le parent. */
export async function echanger(): Promise<string> {
  if (MODE_ESSAI) return 'Mode essai : rien n’est envoyé au rêve.';
  const acces = lireAcces();
  if (!acces) return 'Pas de clé enregistrée : aucun échange.';
  if (!navigator.onLine) return 'Pas de réseau : l’échange se fera plus tard.';
  if (echangeEnCours) return 'Un échange est déjà en cours.';
  echangeEnCours = true;
  const s = sauvegardeDuJeu();
  try {
    const r = await synchroniser(s, acces, aujourdhui(), fetch, extra ? await extra.envois() : []);
    if (extra) await extra.apres(r.chemins, r.brut);
    s.synchro = { derniere: new Date().toISOString() };
    if (r.preparation && r.preparation.jour !== s.preparation?.jour) appliquerPreparation(r.preparation);
    else if (r.preparation) s.preparation = { ...r.preparation };
    sauverLeJeu();
    return `Échange réussi : ${r.envoyes} fichier${r.envoyes > 1 ? 's' : ''} déposé${r.envoyes > 1 ? 's' : ''}${r.preparation ? ', préparation reçue' : ''}.`;
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : 'Échange impossible.';
    s.synchro = { ...s.synchro, probleme: message };
    sauverLeJeu();
    return message;
  } finally {
    echangeEnCours = false;
  }
}

/** Le bouton discret de l'espace parent : un appui long l'ouvre (un toucher ne fait rien). */
/** ville : les réglages de la ville, un bouton chacun dans l'espace parent. */
export function installerParent(peutOuvrir: () => boolean, ville: Array<{ titre: string; ouvrir(): void | Promise<unknown> }> = []): void {
  const b = document.body.appendChild(Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-parent-ville', ariaLabel: 'Espace parent' }));
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  porteParent(b, () => {
    if (!peutOuvrir()) return;
    void ouvrirEspaceParent({
      sauvegarde: sauvegardeDuJeu,
      sauver: sauverLeJeu,
      jour: aujourdhui(),
      stands: standsDuJeu(),
      propositions: () => semainesProposees().filter((s) => !sauvegardeDuJeu().validations[s.id]),
      appliquer: () => {
        appliquerReglagesDuJeu();
        sauverLeJeu();
      },
      synchroniser: echanger,
      remplacer: remplacerSauvegarde,
      ville,
    });
  });
}
