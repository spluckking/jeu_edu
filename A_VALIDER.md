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
9. **Cadeaux des manèges** (noms et phrases nouveaux, `src/detente/objectifs.ts` et `src/recompenses/recompenses.ts`) :
   - décorations : Bouquet de ballons, Lampions, Mât à fanions, Coupe dorée, Massif de fleurs, Grande étoile, Gros nounours ;
   - accessoires : Casque de pilote, Volant d’auto (autos), Serre-tête étoile, Chaussures à ressorts (trampoline), Lunettes miroir, Pull à paillettes (palais des glaces) ;
   - phrases : « Cadeau gagné : … ! », « C’est installé à côté du manège : va voir en sortant ! », « C’est déjà sur ton personnage, et rangé dans ta garde-robe. », « Prochain cadeau : … », « Tout est gagné ici pour l’instant ! », « Un tour coûte un jeton. Finis une manche à un stand de révision pour en gagner un. Quand ta séance du jour est finie, les manèges sont gratuits ! ».
   - paliers : autos et trampoline 10, 25, 45, 70, 100 puis tous les 35 ; glaces 1, 3, 6, 10, 15 puis tous les 5. À ajuster selon ce qu’on voit sur la tablette.
