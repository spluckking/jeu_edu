// La voix. Chaque consigne est lue à voix haute : d'abord par une voix neurale enregistrée à
// l'avance (public/voix/, générée par scripts/generer-voix.mjs, jouée hors ligne), sinon par la
// synthèse vocale de la tablette, en français (phrases avec un prénom ou un nombre tiré au sort).

import { estMuet, sortieSon } from './bruitages.ts';
import { cleVoix } from './cle-voix.ts';
import { fichierSalutation, SALUTATIONS } from './salutations.ts';

let voix: SpeechSynthesisVoice | null = null;
let vitesse = 0.92;
let volume = 1;

/** Vitesse de la voix de la tablette, réglée par le parent (la dictée reste un peu plus lente). */
export function reglerVoix(v: number): void {
  vitesse = Math.max(0.6, Math.min(1.1, v));
}

/** Volume de la voix (0 à 1), réglé par le parent, à part de la musique et des bruitages. */
export function reglerVolumeVoix(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (enCours) enCours.volume = volume;
}

function choisirVoix(): void {
  const francaises = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  voix = francaises.find((v) => v.lang === 'fr-FR' && v.localService) ?? francaises[0] ?? null;
}

if ('speechSynthesis' in window) {
  choisirVoix();
  speechSynthesis.addEventListener('voiceschanged', choisirVoix);
}

// Le manifeste des voix enregistrées : clé de la phrase → fichier MP3. Mis en cache hors ligne.
const DOSSIER = `${import.meta.env.BASE_URL}voix/`;
let enregistrees: Record<string, string> = {};
void fetch(`${DOSSIER}manifest.json`)
  .then((r) => (r.ok ? r.json() : null))
  .then((m: { fichiers?: Record<string, string> } | null) => {
    if (m?.fichiers) enregistrees = m.fichiers;
  })
  .catch(() => undefined);

let enCours: HTMLAudioElement | null = null;

// --- Jouer un fichier enregistré ------------------------------------------------------------
// Par le moteur audio du jeu (comme la musique et les bruitages) : le fichier est lu puis décodé.
// Un lecteur <audio> ne sait souvent pas lire un MP3 venu du cache hors ligne de l'appli
// installée (il demande des morceaux du fichier) : sur la tablette, les voix restaient muettes.
// Le lecteur <audio> ne sert plus que si le moteur audio n'est pas encore démarré.
const tampons = new Map<string, Promise<AudioBuffer | null>>();
function tampon(fichier: string, c: AudioContext): Promise<AudioBuffer | null> {
  let t = tampons.get(fichier);
  if (!t) {
    t = fetch(`${DOSSIER}${fichier}`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((o) => (o ? c.decodeAudioData(o) : null))
      .catch(() => null);
    tampons.set(fichier, t);
  }
  return t;
}
/** Ce qui joue en ce moment sur chaque canal (le principal, et celui des salutations). */
const canaux: Record<'principal' | 'salut', { source: AudioBufferSourceNode | null; numero: number }> = {
  principal: { source: null, numero: 0 },
  salut: { source: null, numero: 0 },
};
function couper(canal: 'principal' | 'salut'): void {
  const c = canaux[canal];
  c.numero++;
  try {
    c.source?.stop();
  } catch {
    // Déjà fini.
  }
  c.source = null;
}
/** Joue le fichier sur ce canal ; secours si le fichier manque ou ne se lit pas. */
function jouer(fichier: string, canal: 'principal' | 'salut', secours: () => void): void {
  const son = sortieSon();
  if (!son) {
    const audio = new Audio(`${DOSSIER}${fichier}`);
    audio.volume = volume;
    if (canal === 'principal') enCours = audio;
    audio.addEventListener('error', secours);
    audio.play().catch(secours);
    return;
  }
  const c = canaux[canal];
  const numero = c.numero;
  void tampon(fichier, son.contexte).then((t) => {
    if (c.numero !== numero) return;
    if (!t) return secours();
    if (son.contexte.state === 'suspended') void son.contexte.resume();
    const source = son.contexte.createBufferSource();
    source.buffer = t;
    const gain = son.contexte.createGain();
    gain.gain.value = volume;
    // Directement vers la sortie : la voix de la dictée se fait entendre même son coupé.
    source.connect(gain).connect(son.contexte.destination);
    source.start();
    c.source = source;
    source.addEventListener('ended', () => {
      if (c.source === source) c.source = null;
    });
  });
}

function arreter(): void {
  if (enCours) {
    enCours.pause();
    enCours = null;
  }
  couper('principal');
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function parSynthese(texte: string, dictee: boolean, suivi?: (r: string) => void): void {
  if (!('speechSynthesis' in window)) {
    suivi?.('pas de voix de tablette dans ce navigateur');
    return;
  }
  if (!voix) choisirVoix();
  const phrase = new SpeechSynthesisUtterance(texte);
  phrase.lang = 'fr-FR';
  if (voix) phrase.voice = voix;
  phrase.rate = dictee ? vitesse * 0.87 : vitesse;
  phrase.pitch = 1.05;
  phrase.volume = volume;
  phrase.addEventListener('start', () => suivi?.('la voix de la tablette parle'));
  phrase.addEventListener('error', (e) => suivi?.(`erreur de la voix de la tablette : ${(e as SpeechSynthesisErrorEvent).error}`));
  // Sur Chrome pour Android, parler juste après « cancel » peut ne rien dire : on laisse un instant.
  window.setTimeout(() => speechSynthesis.speak(phrase), speechSynthesis.speaking || speechSynthesis.pending ? 120 : 0);
}

/** Pour l'espace parent : ce que la tablette sait faire avec les voix. */
export function etatDesVoix(mots: readonly string[]): { manifeste: number; avecVoix: string[]; sansVoix: string[]; francaises: string[]; moteur: string } {
  const avecVoix = mots.filter((m) => enregistrees[cleVoix(m, 'dictee')]);
  return {
    manifeste: Object.keys(enregistrees).length,
    avecVoix,
    sansVoix: mots.filter((m) => !avecVoix.includes(m)),
    francaises: 'speechSynthesis' in window ? speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr')).map((v) => `${v.name} (${v.lang})`) : [],
    moteur: sortieSon()?.contexte.state ?? 'pas encore démarré (touche l’écran)',
  };
}

/** Pour l'espace parent : joue un mot enregistré, ou le dit avec la voix de la tablette, et
 *  raconte ce qui s'est passé. */
export function essayerUneVoix(texte: string, tablette: boolean, suivi: (r: string) => void): void {
  arreter();
  if (tablette) return parSynthese(texte, true, suivi);
  const fichier = enregistrees[cleVoix(texte, 'dictee')];
  if (!fichier) return suivi('pas d’enregistrement pour ce mot');
  const son = sortieSon();
  if (!son) return suivi('le moteur audio n’est pas démarré');
  void tampon(fichier, son.contexte).then((t) => {
    if (!t) return suivi(`le fichier ${fichier} ne se lit pas`);
    jouer(fichier, 'principal', () => suivi('échec de lecture'));
    suivi(`enregistrement joué (${t.duration.toFixed(1)} s, moteur : ${son.contexte.state})`);
  });
}

/**
 * Lit une phrase, en coupant celle en cours. dictee : le mot d'une dictée, lu plus lentement
 * et même quand le son est coupé (sans lui, l'exercice est impossible).
 */
export function dire(texte: string, dictee = false): void {
  if (estMuet() && !dictee) return;
  arreter();
  const fichier = enregistrees[cleVoix(texte, dictee ? 'dictee' : 'normal')];
  if (!fichier) {
    parSynthese(texte, dictee);
    return;
  }
  // Si le fichier ne se lit pas, la voix de la tablette prend le relais.
  jouer(fichier, 'principal', () => parSynthese(texte, dictee));
}

// --- Les salutations doublées des forains ---------------------------------------------------

const dernieres = new Map<string, number>();

/** Le forain dit bonjour quand l'enfant entre dans son stand (une phrase au hasard, jamais deux fois de suite). */
export function saluer(forain: string): void {
  const d = SALUTATIONS[forain];
  if (!d || estMuet()) return;
  let rang = Math.floor(Math.random() * d.phrases.length);
  if (d.phrases.length > 1 && rang === dernieres.get(forain)) rang = (rang + 1) % d.phrases.length;
  dernieres.set(forain, rang);
  couper('salut');
  // Un canal à part : une consigne lue ensuite ne coupe pas la salutation.
  jouer(fichierSalutation(forain, rang), 'salut', () => undefined);
}

/** Une phrase enregistrée avec la voix d'un personnage (fichier relatif au dossier des voix) ; si le
 *  fichier manque ou ne se lit pas, la voix de la tablette la dit. */
export function direEnregistre(fichier: string | null, texte: string): void {
  if (estMuet()) return;
  arreter();
  if (!fichier) return parSynthese(texte, false);
  jouer(fichier, 'principal', () => parSynthese(texte, false));
}
