# À valider

Questions qui peuvent attendre. Elles ne bloquent pas le jeu.

1. **Mesure sur la tablette** : ouvrir le jeu avec `?fps` et noter les i/s à la porte, au milieu de la fête et dans un stand. Budget : 60 i/s.
2. **Voix** : écouter `docs/voix-essais/` (Denise, Henri, Eloise ; 4 phrases chacune). Denise est utilisée pour l'instant. Pour changer : `npm run voix -- --voix fr-FR-HenriNeural`.
3. **Musiques** : la clé ElevenLabs n'a pas la permission « Music generation ». L'ajouter (ElevenLabs → API keys → modifier la clé, si l'abonnement inclut la musique), puis `npm run sons`. Les descriptions des 4 morceaux sont dans `scripts/generer-sons.mjs`.
4. **Bruitages** : les écouter dans le jeu ; `npm run sons -- --refaire bruitage-reussite` pour en refaire un.
5. **Voix des textes dynamiques** : les mots ajoutés chaque semaine peuvent être générés sur le PC (`npm run voix`). Les faire générer par le rêve du soir demanderait de confier la clé Azure à la routine dans le cloud : à décider.
6. **Blender** n'est pas installé : les personnages sont dessinés en code. Le résultat suffit-il ?
7. **Mise en ligne** : tout est sur la branche `amelioration`, rien n'est poussé.
