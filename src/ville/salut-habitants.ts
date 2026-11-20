// Les habitants de la ville disent bonjour quand l'enfant leur parle : une phrase enregistrée au
// hasard (jamais deux fois de suite), avec la voix de chacun. Pas plus d'une fois toutes les
// 20 secondes par habitant, pour ne pas répéter en boucle.

import T from '../../content/ville/salutations-habitants.json';
import { direEnregistre } from '../son/voix.ts';
import { fichierForain } from './voix-forains.ts';

const derniere = new Map<string, { rang: number; quand: number }>();

/** nom : le nom affiché sur le bouton (« L'épicière »…). Rien si ce n'est pas un habitant. */
export function saluerHabitant(nom: string): void {
  const trouve = Object.entries(T.habitants).find(([, h]) => h.nom === nom);
  if (!trouve) return;
  const [id, h] = trouve;
  const avant = derniere.get(id);
  const maintenant = performance.now();
  if (avant && maintenant - avant.quand < 20000) return;
  let rang = Math.floor(Math.random() * h.phrases.length);
  if (h.phrases.length > 1 && rang === avant?.rang) rang = (rang + 1) % h.phrases.length;
  derniere.set(id, { rang, quand: maintenant });
  const phrase = h.phrases[rang] ?? '';
  direEnregistre(fichierForain(id, phrase), phrase);
}
