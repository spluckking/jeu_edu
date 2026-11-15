// Musique calme et discrète pendant les exercices : sinus et triangle, sans batterie,
// une petite mélodie pentatonique qui se promène sur des accords doux. Tout est fabriqué ici.

import { sortieSon } from './bruitages.ts';

const TEMPO = 76;
const NOIRE = 60 / TEMPO;
/** Gamme pentatonique de do majeur, sur deux octaves (Hz). */
const GAMME = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
/** Basses : do, la, fa, sol (une par mesure de 4 temps). */
const BASSES = [130.81, 110.0, 87.31, 98.0];
const VOLUME = 0.32;

let bus: GainNode | null = null;
let minuterie = 0;
let prochainTemps = 0;
let pas = 0;
let degre = 4;

function note(c: AudioContext, sortie: AudioNode, frequence: number, debut: number, duree: number, force: number, forme: OscillatorType): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = forme;
  o.frequency.value = frequence;
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.exponentialRampToValueAtTime(force, debut + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  o.connect(g).connect(sortie);
  o.start(debut);
  o.stop(debut + duree + 0.05);
}

/** Programme les notes un peu en avance, pour une musique régulière même si l'image saccade. */
function programmer(): void {
  const son = sortieSon();
  if (!son || !bus) return;
  const c = son.contexte;
  while (prochainTemps < c.currentTime + 0.3) {
    const temps = pas % 16;
    if (temps % 4 === 0) {
      const basse = BASSES[Math.floor(pas / 4) % BASSES.length] ?? 130.81;
      note(c, bus, basse, prochainTemps, NOIRE * 3.8, 0.1, 'sine');
      note(c, bus, basse * 1.5, prochainTemps, NOIRE * 3.8, 0.04, 'sine');
    }
    // Une note sur deux environ, qui avance par petits pas : pas de saut brusque.
    if (temps % 2 === 0 && Math.random() < 0.75) {
      degre = Math.max(0, Math.min(GAMME.length - 1, degre + Math.round((Math.random() - 0.5) * 3)));
      note(c, bus, GAMME[degre] ?? 440, prochainTemps, NOIRE * 1.6, 0.05, 'triangle');
    }
    prochainTemps += NOIRE / 2;
    pas++;
  }
}

export const musique = {
  demarrer(): void {
    const son = sortieSon();
    if (!son || bus) return;
    bus = son.contexte.createGain();
    bus.gain.setValueAtTime(0.0001, son.contexte.currentTime);
    bus.gain.exponentialRampToValueAtTime(VOLUME, son.contexte.currentTime + 1.5);
    bus.connect(son.volume);
    prochainTemps = son.contexte.currentTime + 0.1;
    pas = 0;
    programmer();
    minuterie = window.setInterval(programmer, 100);
  },
  arreter(): void {
    const son = sortieSon();
    window.clearInterval(minuterie);
    if (!son || !bus) return;
    const b = bus;
    bus = null;
    b.gain.setTargetAtTime(0.0001, son.contexte.currentTime, 0.3);
    window.setTimeout(() => b.disconnect(), 1500);
  },
};
