# Provenance des skills tiers

Copiés à la main depuis une copie locale figée, sans `npx skills` ni téléchargement au moment de l'installation. Ne jamais les mettre à jour automatiquement : pour une nouvelle version, on ré-audite le diff.

| Source | Commit audité | Licence | Skills |
|---|---|---|---|
| github.com/cloudai-x/threejs-skills | `0e181866f095b5f06d005133876e926515390d95` (2026-10-19) | MIT | les 12 `threejs-*`, **sauf** `threejs-react-three-fiber` |
| github.com/gamedev-skills/awesome-gamedev-agent-skills | `c6ca6c41c839b68319ffc08430b99ab768debc32` (2026-11-12) | Apache 2.0 | `game-feel`, `game-ui-ux`, `audio-design`, `performance-optimization`, `save-systems`, `procedural-gen` |

## Audit (2026-11-16)

Tous les fichiers ont été passés au crible : commandes, téléchargements, adresses, envoi de données, accès hors du projet, consignes qui pousseraient l'agent à agir sans demander. Les scripts ont été lus en entier.

- **Aucun skill retenu ne contient de script.** Ce sont des textes de méthode. Les liens pointent vers des documentations (Godot, Unity, Microsoft, W3C).
- `threejs-fundamentals` montre des import maps vers un CDN (jsdelivr). **À ne pas suivre ici** : le jeu n'a ni CDN ni script extérieur ; Three.js vient de `node_modules`.
- `threejs-asset-pipeline` propose `npx @gltf-transform/cli …` et `npx gltfjsx`. Ces commandes téléchargent un outil depuis npm quand on les lance. À n'utiliser que pour des modèles `.glb`, après accord ; le jeu n'en a pas aujourd'hui.
- `threejs-loaders` a un exemple de chargement depuis `cdn.example.com` : exemple fictif, à ne pas reproduire.
- `performance-optimization` vise surtout Godot, Unity, Unreal et Roblox ; ses principes de mesure restent utiles.

**Écarté** : `create-game-assets`. Il sert à produire des images de jeu (sprites) avec un skill de génération d'images absent ici. Il demande d'installer Pillow avec pip. Ses deux scripts Python, lus en entier, ne font qu'inspecter des images en local et sont inoffensifs. Mais il est inutile pour un jeu dessiné en code.
