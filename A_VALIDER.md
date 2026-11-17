# À valider

Questions qui peuvent attendre. Elles ne bloquent pas le jeu.

1. **Mesure sur la tablette** : ouvrir le jeu avec `?fps` et noter les i/s à la porte, au milieu de la fête et dans un stand. Budget : 60 i/s.
2. **Voix** : écouter `docs/voix-essais/` (Denise, Henri, Eloise ; 4 phrases chacune). Denise est utilisée pour l'instant. Pour changer : `npm run voix -- --voix fr-FR-HenriNeural`.
3. **Musiques** : 10 morceaux générés (promenade, un par stand, un par jeu d'adresse, pause) et une ambiance de fête. À écouter dans le jeu ; `npm run sons -- --refaire musique-autos` pour en refaire un.
4. **Bruitages** : les écouter dans le jeu ; `npm run sons -- --refaire bruitage-reussite` pour en refaire un.
5. **Voix des textes dynamiques** : les mots ajoutés chaque semaine peuvent être générés sur le PC (`npm run voix`). Les faire générer par le rêve du soir demanderait de confier la clé Azure à la routine dans le cloud : à décider.
6. **Blender** n'est pas installé : les personnages sont dessinés en code. Le résultat suffit-il ?
7. **Salutations des forains** (une est tirée au hasard à l'entrée du stand, voix différente pour chacun) :
   - chamboule-tout : « Bonjour ! Prêt à faire tomber les boîtes ? » / « Ah, te revoilà ! On lance quelques balles ? »
   - confiserie : « Coucou ! Mes sucettes t’attendent ! » / « Bienvenue à la confiserie ! On écrit de jolis mots ? »
   - chantier : « Salut, petit bricoleur ! On construit ensemble ? » / « Bonjour ! J’ai des défis tout neufs pour toi. »
   - horloge : « Bonjour ! Tic-tac… Quelle heure est-il ? » / « Te voilà ! Mes horloges t’attendaient. »
   - pêche : « Ohé ! Les canards sont prêts à nager ! » / « Bonjour ! On va pêcher quelques canards ? »
   Pour changer un texte : `src/son/salutations.ts`, puis `npm run voix -- --forains`.
8. **Couleurs** : quatre palettes dans le même style (Pastel, Couleurs vives, Été, Bonbon), captures dans `docs/captures/palettes/`. Choix dans l'espace parent, « Couleurs de la fête » (le jeu redémarre). Pastel reste celle par défaut.
9. **Mise en ligne** : tout est sur la branche `amelioration`, rien n'est poussé.
