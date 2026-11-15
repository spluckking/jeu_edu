// La voix : synthèse vocale de la tablette, en français. Chaque consigne est lue à voix haute.

import { estMuet } from './bruitages.ts';

let voix: SpeechSynthesisVoice | null = null;
let vitesse = 0.92;

/** Vitesse de la voix, réglée par le parent (la dictée reste un peu plus lente). */
export function reglerVoix(v: number): void {
  vitesse = Math.max(0.6, Math.min(1.1, v));
}

function choisirVoix(): void {
  const francaises = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  voix = francaises.find((v) => v.lang === 'fr-FR' && v.localService) ?? francaises[0] ?? null;
}

if ('speechSynthesis' in window) {
  choisirVoix();
  speechSynthesis.addEventListener('voiceschanged', choisirVoix);
}

/**
 * Lit une phrase, en coupant celle en cours. dictee : le mot d'une dictée, lu plus lentement
 * et même quand le son est coupé (sans lui, l'exercice est impossible).
 */
export function dire(texte: string, dictee = false): void {
  if (!('speechSynthesis' in window) || (estMuet() && !dictee)) return;
  speechSynthesis.cancel();
  const phrase = new SpeechSynthesisUtterance(texte);
  phrase.lang = 'fr-FR';
  if (voix) phrase.voice = voix;
  phrase.rate = dictee ? vitesse * 0.87 : vitesse;
  phrase.pitch = 1.05;
  speechSynthesis.speak(phrase);
}
