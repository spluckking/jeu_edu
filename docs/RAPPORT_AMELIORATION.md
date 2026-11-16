# Rapport d'amélioration

Branche `amelioration`. Une section par phase, complétée au fil de l'eau.

## Phase 0 — État des lieux

### Architecture

- Vite 8, TypeScript strict, Three.js 0.186, vite-plugin-pwa (hors ligne complet), Vitest (15 fichiers, 91 tests).
- Une seule scène 3D dessinée en code (`src/scene/`) : les décors immobiles sont fusionnés par l'`Atelier`, les personnages sont des formes simples (`personne.ts`).
- Interface en DOM/CSS au-dessus du canvas : HUD, panneau d'exercice, vitrines, espace parent.
- Sauvegarde IndexedDB, version 6, avec migrations testées. Échange optionnel avec le dépôt privé du rêve.
- Point faible de code : `src/main.ts` fait près de 1 300 lignes (promenade, stands, récompenses, échange, introduction). Les phases graphiques le toucheront : on en sortira des morceaux au passage, sans tout réécrire.

### Points faibles graphiques

1. **Caméra à l'épaule** : le personnage occupe un quart de l'écran et cache ce qu'il y a devant lui. Dans les stands, sa tête masque le premier plan (capture `13-stand-peche`).
2. **Éclairage plat** : une lumière d'ambiance et un soleil, pas de vraies ombres (une simple tache sous les personnages), couleurs primaires saturées (rouge, jaune, bleu marine) plutôt que douces.
3. **Personnages** : faits de cylindres, peu expressifs. Les tenues sont rares (4 tenues et des maillots), et l'écran « Mes lots » n'affiche que deux cases de texte (`15-lots`).
4. **HUD** : la barre du haut est chargée (cadenas, tickets, semaine, histoire, tenue). La bulle cache l'enseigne de la porte (`02-arrivee-porte`). Le joystick rouge vif attire l'œil.
5. **Décor** : sol vert uni sans texture, allées plates, barrières bleu marine et jaune un peu dures.

### Bugs repérés

- **Corrigé** : depuis l'écran d'accueil, la fenêtre du code parent s'ouvrait *derrière* la carte « La fête foraine », qui cachait son bouton (plans CSS 9 contre 10).
- **Chute des i/s quand une fenêtre s'ouvre** : avec « Mes lots » ouvert, 18 i/s et un gel de 0,9 s (`15-lots`). Le flou d'arrière-plan CSS posé sur la 3D en mouvement coûte très cher. À traiter en phase 3.6 (fond flou figé ou 3D en pause derrière une fenêtre).
- Caméra des stands : le personnage se met entre la caméra et le comptoir (voir point 1).

### Performances (PC de mesure : Intel UHD 630, rendu 2 800 × 1 870 px, pixelRatio 1,75)

| Moment | i/s | Appels de dessin | Triangles |
|---|---|---|---|
| Arrivée à la grande porte | 38 | 193 | 458 k |
| Milieu de la fête | 60 | 128 | 407 k |
| Exercice au stand | 60 | 90 | 378 k |
| Introduction (cinématique) | 37 | — | — |

- Budget de 150 appels dépassé à la porte : l'allée, ses haies et ses lampadaires ne sont pas fusionnés.
- **Sur la tablette, pas encore mesuré.** Le compteur est prêt : ajouter `?fps` à l'adresse affiche i/s, pire image, appels de dessin et triangles en bas de l'écran.
- Chargement du jeu en ligne : 224 ko transférés (JS 675 ko avant compression). Premier chargement à froid : environ 9 s (serveur GitHub froid). Relance : environ 1,2 s grâce au service worker.

### Captures de référence

`docs/captures/avant/`, prises par `node scripts/captures.mjs docs/captures/avant` (Playwright, 1 600 × 1 068 CSS, ×2, sauvegarde d'essai locale) : accueil, porte, promenade, devant un stand, les cinq stands et leurs exercices, lots, histoire du jour, espace parent, pause calme, introduction. Les mesures brutes sont dans `mesures.json`.
