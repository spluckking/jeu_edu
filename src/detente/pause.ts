// La pause calme : obligatoire au milieu de la séance du jour, jamais notée.
// Deux exercices qui alternent d'un jour à l'autre : le ballon qui respire (cohérence
// cardiaque, 5 s pour inspirer, 5 s pour souffler) et une courte pleine conscience.

import { sortieSon } from '../son/bruitages.ts';
import { dire } from '../son/voix.ts';
import { ETAPES_SENS, INSPIRER, RESPIRATIONS, SOUFFLER, type ExercicePause } from './regles.ts';

export { exerciceDuJour, pauseDue } from './regles.ts';

const attendre = (secondes: number): Promise<void> => new Promise((r) => window.setTimeout(r, secondes * 1000));

/** Un son très doux qui monte (inspirer) ou descend (souffler). */
function souffle(monte: boolean, duree: number): void {
  const son = sortieSon();
  if (!son) return;
  const { contexte: c, volume } = son;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(monte ? 196 : 294, t);
  o.frequency.linearRampToValueAtTime(monte ? 294 : 196, t + duree);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.8);
  g.gain.setValueAtTime(0.06, t + duree - 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  o.connect(g).connect(volume);
  o.start(t);
  o.stop(t + duree + 0.1);
}

function element<K extends keyof HTMLElementTagNameMap>(balise: K, classe: string, texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(balise);
  e.className = classe;
  e.textContent = texte;
  return e;
}

/**
 * Joue la pause et se résout quand l'enfant retourne jouer. facteur raccourcit les durées
 * (essais seulement ; 1 en jeu).
 */
export async function jouerPause(exercice: ExercicePause, facteur = 1): Promise<void> {
  const fond = element('div', 'pause-fond');
  const carte = element('div', 'pause');
  const titre = element('p', 'lecture-titre', exercice === 'ballon' ? 'Pause calme : le ballon qui respire' : 'Pause calme : mes cinq sens');
  const ballon = element('div', 'pause-ballon');
  const consigne = element('p', 'pause-consigne');
  const compte = element('ol', 'pause-compte');
  const fin = element('button', 'bouton-principal', 'Je retourne jouer');
  fin.type = 'button';
  fin.hidden = true;
  carte.append(titre, ballon, consigne, compte, fin);
  fond.append(carte);
  document.body.append(fond);

  // Le ballon respire tout le temps, au rythme de la cohérence cardiaque.
  const respirer = async (n: number, parler: boolean): Promise<void> => {
    for (let i = 0; i < n; i++) {
      compte.querySelectorAll('li')[i]?.classList.add('fait');
      ballon.style.transitionDuration = `${INSPIRER * facteur}s`;
      ballon.classList.add('gonfle');
      consigne.textContent = 'Inspire doucement par le nez…';
      if (parler && i < 2) dire('Inspire');
      souffle(true, INSPIRER * facteur);
      await attendre(INSPIRER * facteur);
      ballon.style.transitionDuration = `${SOUFFLER * facteur}s`;
      ballon.classList.remove('gonfle');
      consigne.textContent = 'Souffle tout doucement…';
      if (parler && i < 2) dire('Souffle');
      souffle(false, SOUFFLER * facteur);
      await attendre(SOUFFLER * facteur);
    }
  };

  try {
    if (exercice === 'ballon') {
      compte.append(...Array.from({ length: RESPIRATIONS }, () => element('li', '')));
      consigne.textContent = 'Regarde le ballon et respire avec lui.';
      dire('Pause calme. Regarde le ballon, et respire avec lui.');
      await attendre(4 * facteur);
      await respirer(RESPIRATIONS, true);
    } else {
      compte.append(...ETAPES_SENS.map(() => element('li', '')));
      for (const [i, [phrase, duree]] of ETAPES_SENS.entries()) {
        compte.querySelectorAll('li')[i]?.classList.add('fait');
        consigne.textContent = phrase;
        dire(phrase);
        // Le ballon continue de respirer lentement pendant chaque étape.
        const cycles = Math.max(1, Math.round(duree / (INSPIRER + SOUFFLER)));
        const debut = performance.now();
        for (let c = 0; c < cycles; c++) {
          ballon.style.transitionDuration = `${INSPIRER * facteur}s`;
          ballon.classList.add('gonfle');
          await attendre(INSPIRER * facteur);
          ballon.style.transitionDuration = `${SOUFFLER * facteur}s`;
          ballon.classList.remove('gonfle');
          await attendre(SOUFFLER * facteur);
        }
        const reste = duree * facteur - (performance.now() - debut) / 1000;
        if (reste > 0) await attendre(reste);
      }
    }
    consigne.textContent = 'Bravo, tu as pris une vraie pause. On repart !';
    dire('Bravo, tu as pris une vraie pause. On repart !');
    fin.hidden = false;
    await new Promise<void>((r) => fin.addEventListener('click', () => r(), { once: true }));
  } finally {
    fond.remove();
  }
}
