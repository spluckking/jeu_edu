// La voix. Chaque consigne est lue à voix haute : d'abord par une voix neurale enregistrée à
// l'avance (public/voix/, générée par scripts/generer-voix.mjs, jouée hors ligne), sinon par la
// synthèse vocale de la tablette, en français (phrases avec un prénom ou un nombre tiré au sort).

import { estMuet } from './bruitages.ts';
import { cleVoix } from './cle-voix.ts';

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

function arreter(): void {
  if (enCours) {
    enCours.pause();
    enCours = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function parSynthese(texte: string, dictee: boolean): void {
  if (!('speechSynthesis' in window)) return;
  const phrase = new SpeechSynthesisUtterance(texte);
  phrase.lang = 'fr-FR';
  if (voix) phrase.voice = voix;
  phrase.rate = dictee ? vitesse * 0.87 : vitesse;
  phrase.pitch = 1.05;
  phrase.volume = volume;
  speechSynthesis.speak(phrase);
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
  const audio = new Audio(`${DOSSIER}${fichier}`);
  audio.volume = volume;
  enCours = audio;
  // Si le navigateur refuse (son pas encore débloqué), la voix de la tablette prend le relais.
  audio.play().catch(() => {
    if (enCours === audio) {
      enCours = null;
      parSynthese(texte, dictee);
    }
  });
}
