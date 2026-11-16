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

## Phase 1 — Skills

18 skills audités et copiés dans `.claude/skills/` depuis un commit figé : les 12 `threejs-*` (sauf React), plus `game-feel`, `game-ui-ux`, `audio-design`, `performance-optimization`, `save-systems` et `procedural-gen`. `create-game-assets` est écarté : il sert à générer des images, ce qui est inutile pour un jeu dessiné en code. Le détail de l'audit est dans `.claude/skills/PROVENANCE.md`.

## Phase 2 — Direction visuelle

Trois directions possibles, toutes dessinées en code (pas de modèle à télécharger) :

| | A. Douillet pastel (retenue) | B. Jouet vif (l'actuel, poli) | C. Livre d'images |
|---|---|---|---|
| Esprit | Jeux de vie « cosy » : herbe fleurie, couleurs crème et dragée, personnages ronds à grosse tête | Plastique brillant, couleurs primaires | Aquarelle, contours dessinés, papier |
| Palette | crème `#fff8ee`, dragée `#f6b3c9`, menthe `#b6e3c8`, ciel `#9fd6f0`, beurre `#ffe27a`, lilas `#c8a7f0` | rouge, jaune, bleu marine, vert vif | tons délavés, contour brun |
| Éclairage | ombrage en 3 aplats doux (toon), ciel dégradé, ombres rondes sous les objets | lumière physique avec reflet de velours | aplats, texture papier |
| Caméra | haute et fixe en promenade, zoom de trois quarts devant un stand | à l'épaule | haute |
| Coût | **plus léger qu'aujourd'hui** : le matériau toon coûte moins cher que le matériau physique à reflet de velours | actuel | contours = un passage de rendu en plus |

La direction A suit les images d'exemple du parent sans les copier : décor, personnages et interface sont originaux.

**Maquette** : `prototypes/style-douillet/` (captures dans `docs/captures/maquette/`) :
- une promenade en vue haute, où l'on voit l'herbe fleurie, l'allée en dalles, le manège de tasses, les distributeurs et la barrière dragée ;
- un zoom de trois quarts sur le stand dès qu'on s'en approche, avec le bouton « Entrer » ;
- une garde-robe : le personnage sur un tapis à gauche, des onglets ronds (chapeaux, lunettes, hauts, chaussures, objets), une grille de vignettes avec coche, et les boutons « Mes tenues » et « C'est parti ! » ;
- un HUD avec une mini-carte ronde, une ligne de quête et des icônes rondes crème.

## Phase 3 — Graphismes

| Passe | Ce qui a changé | i/s (PC de mesure) |
|---|---|---|
| 3.1 Lumière | Ciel clair, soleil chaud venu de la gauche, brouillard bleu pâle, ombrage en 3 aplats doux (toon) à la place du matériau physique à reflet de velours | porte : 38 → **60** |
| 3.2 Matériaux et textures | Palette pastel (toutes les couleurs adoucies vers le crème), herbe semée de fleurs, allées en dalles crème, barrières dragée | 60 |
| Caméra | Vue haute et fixe en promenade ; zoom de trois quarts en arrivant devant un stand ; regard porté vers la grande porte sur l'allée ; portique masqué une fois dans la fête | 60 (59 appels de dessin à l'arrivée) |
| 3.3 Effets | Confettis pastel à chaque bonne réponse et en fin de manche, coupés si « moins de mouvement » est demandé | 60 |
| 3.4 Personnages | Personnages ronds à grosse tête et grands yeux ; accessoires séparés (6 chapeaux, 3 lunettes, 8 hauts, 4 chaussures, 5 objets) ; garde-robe à vignettes ; le personnage s'efface pendant les exercices pour laisser voir le forain | 60 |
| 3.5 Post-traitement | **Non ajouté.** Un bloom même léger double le coût de chaque image sur tablette ; l'ombrage toon et les couleurs donnent déjà le rendu voulu | — |
| 3.6 Interface | Palette d'interface pastel, bulle de texte rangée en haut à gauche, joystick crème, **plus aucun flou CSS sur la 3D** (cause des 18 i/s fenêtre ouverte) | 60 |

**Sauvegarde** : version 7. Les anciens lots (tenues, maillots) sont convertis en accessoires sans rien perdre (testé).

## Phase 4 — Voix

- `npm run voix` (`scripts/generer-voix.mjs`) rassemble les phrases connues d'avance et les fait lire par Azure (voix `fr-FR-DeniseNeural` par défaut, débit −6 %, dictée à −28 % avec des pauses). Les MP3 vont dans `public/voix/`, nommés par une empreinte du texte, du mode et de la voix, avec `public/voix/manifest.json`. Seules les phrases nouvelles sont générées, les inutiles sont retirées.
- **152 phrases, 2,5 Mo** : consignes fixes, pause calme, tables de 0 × 0 à 10 × 10, mots de dictée et corrections.
- **Trois voix à écouter** dans `docs/voix-essais/` (Denise, Henri, Eloise ; mêmes 4 phrases). Pour changer : `npm run voix -- --voix fr-FR-HenriNeural`.
- Le jeu joue le MP3 s'il existe, sinon la voix de la tablette (comme avant). Volume de la voix réglable à part dans l'espace parent. Les MP3 sont mis en cache hors ligne par le service worker.

**Textes dynamiques (lus par la voix de la tablette)** :
- les phrases avec le prénom d'un forain (choisi par l'enfant) ;
- les messages qui dépendent de la journée (tickets, stands restants) ;
- les défis du chantier, les questions de l'horloge et les phrases de la pêche, tirés au sort ;
- le feuilleton (il contient les prénoms des forains) ;
- les listes de mots ajoutées par le parent sur la tablette.

Proposition : pour les mots ajoutés chaque semaine, lancer `npm run voix` sur le PC quand on les ajoute au dépôt (sans rien de plus). Les faire générer par le rêve du soir demanderait de confier la clé Azure à la routine dans le cloud : à décider (voir `A_VALIDER.md`).

## Phase 5 — Musiques et bruitages (ElevenLabs)

Avant : une seule musique, fabriquée dans le code (sinus et triangle, 76 BPM, sans fin), jouée dans les stands et la détente. Cinq bruitages fabriqués dans le code.

Le parent a demandé que je génère moi-même musiques et bruitages avec son compte ElevenLabs. `npm run sons` (`scripts/generer-sons.mjs`) crée ce qui manque dans `public/sons/` ; `npm run sons -- --liste` affiche les descriptions envoyées.

| Fichier | Moment | Ambiance | Tempo | Durée |
|---|---|---|---|---|
| `musique-promenade` | dans la fête | joyeuse, ukulélé, glockenspiel, sifflet | 104 | 60 s |
| `musique-exercice` | dans un stand | calme, lo-fi, piano électrique, marimba | 80 | 60 s |
| `musique-detente` | autos, trampoline, glaces | funk-pop bondissante, piano jouet | 118 | 60 s |
| `musique-pause` | pause respiration | ambiance très calme, kalimba, carillons | ~60 | 60 s |

- **Les 6 bruitages sont générés** (touche, ouverture, réussite, erreur douce, fin de manche, ticket : 87 ko en tout) et joués par le jeu. Le son fabriqué reste en repli.
- **Les 4 musiques ne sont pas générées** : la clé ElevenLabs n'a pas la permission « génération de musique ». Le reste est prêt. Il suffit d'ajouter cette permission à la clé (ElevenLabs → API keys → modifier la clé) et que l'abonnement inclue la musique, puis de lancer `npm run sons`.
- Lecteur prêt : chaque morceau boucle avec un fondu enchaîné de 2,5 s, et changer de moment fond un morceau dans l'autre. Tant qu'un fichier manque, la musique fabriquée joue comme avant (exercices, détente).
- Volumes séparés : musique, bruitages, voix (espace parent).
- Budget : environ 3,5 Mo pour 4 minutes de musique à 96 kbit/s, et 90 ko de bruitages. Le tout est mis en cache hors ligne.
