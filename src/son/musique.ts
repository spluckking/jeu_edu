// La musique. Chaque moment a son morceau enregistré (public/sons/musique-*.mp3, généré par
// scripts/generer-sons.mjs) : promenade, exercices, détente, pause. Il boucle avec un fondu
// enchaîné, et passer d'un moment à l'autre fond aussi un morceau dans l'autre.
// Repli, tant qu'un fichier manque : la musique calme fabriquée ici (sinus et triangle, une
// petite mélodie pentatonique), seulement pour les exercices et la détente, comme avant.

import { charger, sortieSon, volumes } from './bruitages.ts';

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

function demarrerFabriquee(): void {
  const son = sortieSon();
  if (!son || bus || volumes.musique <= 0) return;
  bus = son.contexte.createGain();
  bus.gain.setValueAtTime(0.0001, son.contexte.currentTime);
  bus.gain.exponentialRampToValueAtTime(Math.max(0.0002, VOLUME * volumes.musique), son.contexte.currentTime + 1.5);
  bus.connect(son.volume);
  prochainTemps = son.contexte.currentTime + 0.1;
  pas = 0;
  programmer();
  minuterie = window.setInterval(programmer, 100);
}

function arreterFabriquee(): void {
  const son = sortieSon();
  window.clearInterval(minuterie);
  if (!son || !bus) return;
  const b = bus;
  bus = null;
  b.gain.setTargetAtTime(0.0001, son.contexte.currentTime, 0.3);
  window.setTimeout(() => b.disconnect(), 1500);
}

// --- Les morceaux enregistrés ------------------------------------------------------------------
/** Le lieu : la promenade, un stand de révision, un jeu d'adresse ou la pause. */
export type Piste = 'ville' | 'promenade' | 'pause' | 'chamboule' | 'confiserie' | 'chantier' | 'horloge' | 'peche' | 'autos' | 'trampoline' | 'glaces';
const ADRESSE: readonly Piste[] = ['autos', 'trampoline', 'glaces'];
/** Volume de chaque morceau : discret pendant les révisions, plus présent dans les jeux d'adresse. */
function niveau(piste: Piste): number {
  if (piste === 'promenade') return 0.4;
  if (piste === 'ville') return 0.3;
  if (piste === 'pause') return 0.35;
  return ADRESSE.includes(piste) ? 0.45 : 0.28;
}
const FONDU = 2.5;

interface Lecture {
  piste: Piste;
  gain: GainNode;
  sources: AudioBufferSourceNode[];
  minuterie: number;
}
let lecture: Lecture | null = null;
let voulue: Piste | null = null;

/** Joue une boucle : chaque tour commence FONDU secondes avant la fin du précédent, en fondu. */
function boucler(l: Lecture, tampon: AudioBuffer, debut: number): void {
  const son = sortieSon();
  if (!son || lecture !== l) return;
  const c = son.contexte;
  const source = c.createBufferSource();
  source.buffer = tampon;
  const g = c.createGain();
  const duree = tampon.duration;
  g.gain.setValueAtTime(0.0001, debut);
  g.gain.linearRampToValueAtTime(1, debut + FONDU);
  g.gain.setValueAtTime(1, debut + duree - FONDU);
  g.gain.linearRampToValueAtTime(0.0001, debut + duree);
  source.connect(g).connect(l.gain);
  source.start(debut);
  source.stop(debut + duree + 0.1);
  l.sources.push(source);
  if (l.sources.length > 3) l.sources.shift();
  const suivant = debut + duree - FONDU;
  l.minuterie = window.setTimeout(() => boucler(l, tampon, suivant), Math.max(0, (suivant - c.currentTime - 1) * 1000));
}

function couper(l: Lecture): void {
  const son = sortieSon();
  window.clearTimeout(l.minuterie);
  if (!son) return;
  l.gain.gain.cancelScheduledValues(son.contexte.currentTime);
  l.gain.gain.setValueAtTime(l.gain.gain.value, son.contexte.currentTime);
  l.gain.gain.linearRampToValueAtTime(0.0001, son.contexte.currentTime + 1.2);
  window.setTimeout(() => {
    for (const s of l.sources) s.stop();
    l.gain.disconnect();
  }, 1400);
}

// --- L'ambiance sous la musique, très bas : à la fête (foule lointaine, orgue de manège), en ville
// (oiseaux, petit vent). Une seule à la fois, en fondu.
let fond: { id: string; source: AudioBufferSourceNode; gain: GainNode } | null = null;
const AMBIANCES: Partial<Record<Piste, string>> = { promenade: 'ambiance-fete', ville: 'ambiance-ville' };
function ambiance(piste: Piste | null): void {
  const son = sortieSon();
  if (!son) return;
  const c = son.contexte;
  const id = piste ? AMBIANCES[piste] : undefined;
  if (fond && fond.id !== id) {
    const f = fond;
    fond = null;
    f.gain.gain.setTargetAtTime(0.0001, c.currentTime, 0.4);
    window.setTimeout(() => f.source.stop(), 2000);
  }
  if (!id || fond) return;
  void charger(id).then((tampon) => {
    if (!tampon || fond || !piste || voulue !== piste) return;
    const source = c.createBufferSource();
    source.buffer = tampon;
    source.loop = true;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.linearRampToValueAtTime(0.16 * volumes.musique, c.currentTime + 2);
    source.connect(gain).connect(son.volume);
    source.start();
    fond = { id, source, gain };
  });
}

export const musique = {
  /** Lance le morceau de ce lieu, en fondu depuis le précédent. */
  demarrer(piste: Piste): void {
    voulue = piste;
    const son = sortieSon();
    if (!son || volumes.musique <= 0) return;
    ambiance(piste);
    if (lecture?.piste === piste) return;
    void charger(`musique-${piste}`).then((tampon) => {
      if (voulue !== piste || lecture?.piste === piste) return;
      if (!tampon) {
        // Pas de fichier : la musique fabriquée, seulement là où elle existait avant.
        if (lecture) couper(lecture);
        lecture = null;
        if (piste !== 'promenade' && piste !== 'pause' && piste !== 'ville') demarrerFabriquee();
        else arreterFabriquee();
        return;
      }
      arreterFabriquee();
      if (lecture) couper(lecture);
      const c = son.contexte;
      const gain = c.createGain();
      gain.gain.value = niveau(piste) * volumes.musique;
      gain.connect(son.volume);
      const l: Lecture = { piste, gain, sources: [], minuterie: 0 };
      lecture = l;
      boucler(l, tampon, c.currentTime + 0.05);
    });
  },
  /** Le morceau qui joue (ou qui se charge), s'il y en a un. */
  actuelle(): Piste | null {
    return sortieSon() ? voulue : null;
  },
  arreter(): void {
    voulue = null;
    ambiance(null);
    arreterFabriquee();
    if (lecture) couper(lecture);
    lecture = null;
  },
};
