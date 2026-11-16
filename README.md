# La fête foraine

Jeu de révision pour un enfant de CE2 : une fête foraine en 3D où chaque stand fait réviser quelque chose (tables, dictée, défis, heure, homophones). PWA hors ligne, publiée sur GitHub Pages.

Pile : Vite, TypeScript strict, Three.js, vite-plugin-pwa, Vitest, Playwright (captures).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (visible sur le Wi-Fi : ouvrir l'adresse sur la tablette) |
| `npm run build` | Vérifie les types et construit `dist/` |
| `npm test` | Tests unitaires |
| `npm run voix` | Génère les voix (Azure) des phrases connues d'avance dans `public/voix/` |
| `npm run sons` | Génère musiques et bruitages (ElevenLabs) dans `public/sons/` |
| `node scripts/captures.mjs <dossier>` | Captures au format tablette et mesures (serveur de dev lancé sur le port 5175) |

Adresses d'essai : `?fps` affiche les images par seconde ; `?essai` expose des commandes de test ; `?jour=AAAA-MM-JJ` simule un autre jour.

## Voix (Azure AI Speech)

1. Mettre dans `.env` (jamais commité) : `AZURE_SPEECH_KEY=…` et `AZURE_SPEECH_REGION=…`.
2. `npm run voix -- --essai` : trois voix sur les mêmes phrases, dans `docs/voix-essais/`.
3. `npm run voix` : génère ce qui manque (voix par défaut `fr-FR-DeniseNeural`). Pour une autre voix : `npm run voix -- --voix fr-FR-HenriNeural`.
4. Relancer après avoir ajouté des mots ou des phrases. Les phrases avec un prénom ou tirées au sort sont lues par la voix de la tablette.

## Musiques et bruitages (ElevenLabs)

1. Mettre dans `.env` : `ELEVENLABS_API_KEY=…`. La clé doit avoir les permissions « Sound effects » et « Music generation ».
2. `npm run sons` génère ce qui manque ; `npm run sons -- --refaire musique-promenade` refait un morceau ; `npm run sons -- --liste` montre les descriptions.
3. Un fichier absent est remplacé par le son fabriqué dans le code.

## Documentation

- `CONTEXT.md` : vocabulaire du jeu.
- `docs/REVE.md` : le rêve du soir (préparation de la séance suivante).
- `docs/RAPPORT_AMELIORATION.md` : la dernière série d'améliorations, avec captures et mesures.
