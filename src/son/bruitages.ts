// Bruitages fabriqués dans le code avec Web Audio : aucun fichier, aucune dépendance.
// Un son court par action ; le son d'erreur est doux et neutre, jamais une sanction.

let contexte: AudioContext | null = null;
let volume: GainNode | null = null;
const CLE_MUET = 'jeu-edu:muet';
let muet = lireMuet();

/** Le choix « muet » est une préférence de la tablette : il est mémorisé à part de la sauvegarde. */
function lireMuet(): boolean {
  try {
    return localStorage.getItem(CLE_MUET) === '1';
  } catch {
    return false;
  }
}

/** À appeler au premier toucher : les navigateurs n'autorisent le son qu'après un geste. */
export function demarrerSon(): void {
  if (!contexte) {
    contexte = new AudioContext();
    volume = contexte.createGain();
    volume.gain.value = muet ? 0 : 0.7;
    volume.connect(contexte.destination);
  }
  if (contexte.state === 'suspended') void contexte.resume();
}

/** Volumes séparés réglés par le parent (0 à 1). */
export const volumes = { bruitages: 1, musique: 1 };

export function reglerVolumes(bruitages: number, musique: number): void {
  volumes.bruitages = Math.max(0, Math.min(1, bruitages));
  volumes.musique = Math.max(0, Math.min(1, musique));
}

/** La sortie son commune (null tant que l'enfant n'a pas touché l'écran). Le muet y coupe tout. */
export function sortieSon(): { contexte: AudioContext; volume: GainNode } | null {
  return contexte && volume ? { contexte, volume } : null;
}

export function estMuet(): boolean {
  return muet;
}

export function basculerMuet(): boolean {
  muet = !muet;
  if (volume && contexte) volume.gain.setTargetAtTime(muet ? 0 : 0.7, contexte.currentTime, 0.02);
  if (muet) speechSynthesis.cancel();
  try {
    localStorage.setItem(CLE_MUET, muet ? '1' : '0');
  } catch {
    // Stockage indisponible : le choix vaudra pour cette fois seulement.
  }
  return muet;
}

/** Une note douce : attaque rapide, extinction en douceur. */
function note(frequence: number, debut: number, duree: number, forceDemandee = 0.25, forme: OscillatorType = 'sine'): void {
  if (!contexte || !volume || volumes.bruitages <= 0) return;
  const force = Math.max(0.0002, forceDemandee * volumes.bruitages);
  const t = contexte.currentTime + debut;
  const oscillateur = contexte.createOscillator();
  const enveloppe = contexte.createGain();
  oscillateur.type = forme;
  oscillateur.frequency.setValueAtTime(frequence, t);
  enveloppe.gain.setValueAtTime(0.0001, t);
  enveloppe.gain.exponentialRampToValueAtTime(force, t + 0.012);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  oscillateur.connect(enveloppe).connect(volume);
  oscillateur.start(t);
  oscillateur.stop(t + duree + 0.05);
}

/** Un souffle de bruit filtré (balle qui part, boîtes qui tombent). */
function souffle(debut: number, duree: number, frequence: number, forceDemandee: number, glisse = 1): void {
  if (!contexte || !volume || volumes.bruitages <= 0) return;
  const force = Math.max(0.0002, forceDemandee * volumes.bruitages);
  const t = contexte.currentTime + debut;
  const echantillons = Math.ceil(contexte.sampleRate * duree);
  const tampon = contexte.createBuffer(1, echantillons, contexte.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < echantillons; i++) donnees[i] = Math.random() * 2 - 1;
  const source = contexte.createBufferSource();
  source.buffer = tampon;
  const filtre = contexte.createBiquadFilter();
  filtre.type = 'bandpass';
  filtre.Q.value = 1.4;
  filtre.frequency.setValueAtTime(frequence, t);
  filtre.frequency.exponentialRampToValueAtTime(frequence * glisse, t + duree);
  const enveloppe = contexte.createGain();
  enveloppe.gain.setValueAtTime(0.0001, t);
  enveloppe.gain.exponentialRampToValueAtTime(force, t + 0.01);
  enveloppe.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  source.connect(filtre).connect(enveloppe).connect(volume);
  source.start(t);
}

export const bruitage = {
  /** Toucher une touche du clavier. */
  touche(): void {
    note(880, 0, 0.06, 0.08, 'triangle');
  },
  /** Ouvrir un stand. */
  ouverture(): void {
    [523, 659, 784].forEach((f, i) => note(f, i * 0.08, 0.25, 0.12, 'triangle'));
  },
  /** Bonne réponse : la balle part, la pyramide tombe, petit carillon. */
  reussite(): void {
    souffle(0, 0.35, 900, 0.25, 2.5);
    for (let i = 0; i < 5; i++) souffle(0.42 + i * 0.07 + Math.random() * 0.03, 0.12, 1800 + Math.random() * 1500, 0.35);
    note(784, 0.55, 0.3, 0.18);
    note(1047, 0.67, 0.45, 0.18);
  },
  /** Erreur : deux notes basses et douces, sans rien de punitif. */
  erreur(): void {
    note(392, 0, 0.22, 0.12);
    note(349, 0.16, 0.32, 0.1);
  },
  /** Fin de manche : petite fanfare. */
  finDeManche(): void {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.4, 0.14, 'triangle'));
    note(1319, 0.5, 0.7, 0.12);
  },
};
