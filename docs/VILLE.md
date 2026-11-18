# La ville : document de conception

Ce document rassemble ce qui a été décidé avec le parent pour la nouvelle version du jeu. Il sert de cahier des charges : rien n'est construit avant sa validation. Le vocabulaire est celui de `CONTEXT.md` ; le pourquoi est dans `docs/adr/0002-la-ville.md`.

## Le but

Un jeu solo, hors ligne, pour un enfant de CE2, qui l'aide à progresser en autonomie et **apprend sans qu'il s'en rende compte**. Il ne remplace pas l'école : il suit ce que la classe étudie, sans être trop difficile ni frustrant, et garde l'équilibre entre se divertir et apprendre.

Principes retenus :

- **apprendre en agissant** : le savoir est l'action (payer, mesurer, lire pour savoir quoi faire), pas un quiz posé par-dessus ;
- **se rappeler plutôt que relire**, **espacer** les révisions, **mélanger** les types d'exercices ;
- **autonomie, compétence et lien aux autres** : l'enfant choisit, réussit, et se lie aux habitants ;
- **l'erreur est une information**, jamais une sanction ; pas de chrono, pas de vie perdue, pas de tirage au sort ;
- **ne jamais punir l'absence** ;
- **ne jamais récompenser les corvées de la maison** dans le jeu.

## La journée

- La ville suit la **vraie date** : saisons, fêtes (Halloween, Noël, printemps…), anniversaire de l'enfant fêté par les habitants (date saisie dans l'espace parent, gardée sur la tablette).
- Environ **1 heure de jeu par jour**, dont une **séance du jour d'environ 15 minutes réelles** :
  1. **la dictée d'abord** (mots de la liste de dictée, puis les mots qui reviennent de la mémoire) ;
  2. **2 demandes du jour** ;
  3. la **pause calme** au milieu, proposée par une habitante (respiration, retour au calme), jamais notée.
- Les autres demandes et les stands allumés de la fête foraine restent proposés, mais hors de la séance obligatoire. Le journal mesure les durées réelles et le rêve ajuste le nombre de demandes.
- Fin nette : un petit moment de fête en ville, puis le choix d'un **lot** (vêtement ou meuble), puis le **jeu libre** sans limite (le contrôle parental de la tablette fixe le temps).

## Les lieux

| Lieu | Ce qu'on y fait | Ce qu'on apprend |
|---|---|---|
| Place | se retrouver, le tableau d'affichage | — |
| Maison de l'enfant | décorer avec ses meubles | — |
| Épicerie | acheter, vendre ses récoltes | monnaie, rendre la monnaie |
| Poste | trier et livrer le courrier | lecture, adresses, ordre alphabétique |
| Jardin | planter, arroser, récolter | besoins des plantes, durées, jours |
| Rivière et forêt | pêcher, cueillir | compter, grouper (multiplication) |
| Fête foraine | stands de révision et manèges | tables, mots, homophones ; détente |
| Boulangerie (grand projet) | suivre une recette | grammes, litres, fractions, consignes |
| Musée (grand projet) | exposer ses trouvailles | sciences, monde, lecture documentaire |
| Bibliothèque (grand projet) | feuilleton, livres, mur des mots | lecture suivie |
| Mairie (grand projet) | grands projets, plan de la ville, concours d'écriture | se repérer, règles de vie |
| Caserne (grand projet) | petits incidents | numéros d'urgence, sécurité |
| Centre de tri (grand projet) | trier les déchets | tri sélectif |

Les **lieux de piège** d'orthographe (mots en -tion, lettres doubles, m devant m, b, p, h muet, accents, sons cachés…) sont de vrais endroits de la carte : chaque mot de dictée y « habite ».

## Les quêtes

1. **Demandes** des habitants : une mini-histoire que l'enfant lit lui-même, un besoin à comprendre, une action utile. **L'action prouve la compréhension** (rapporter 3 pommes rouges), sans QCM. En cas d'erreur, l'habitant montre gentiment l'écart et laisse réessayer.
2. **Grands projets** : réunir des récoltes, un peu d'euros et quelques demandes liées pour construire un lieu ; un projet tous les 7 à 10 jours ; l'enfant choisit le suivant entre deux.
3. **Musée** : chaque nouvelle trouvaille ouvre une fiche documentaire courte à lire.
4. **Feuilleton** : un épisode par jour, avec ses questions de compréhension (comme aujourd'hui).
5. **Amitié** : cachée, sans jauge ; aux étapes, une lettre, une photo, un secret de l'habitant. Les émotions se travaillent par des situations (un habitant déçu, deux voisins fâchés, quelqu'un qui ose dire non), jamais en leçon.
6. **Défis du jour** au tableau d'affichage.

## Lire et entendre

- L'enfant **lit lui-même** tous les textes (demandes, histoires, lettres, fiches).
- S'il bloque : il **touche un mot** pour l'entendre (un seul mot, jamais la phrase), et des petites images accompagnent les mots-clés. Les mots touchés vont au journal ; le rêve adapte la longueur et la difficulté des textes.
- À voix haute (Azure, une voix et une intonation par personnage) : les **salutations** des habitants importants (les 5 forains, le maire, l'épicière, le facteur, l'habitant anglophone), les **mots de dictée** et certaines **consignes d'exercice**.
- Les autres habitants font une petite exclamation (ElevenLabs).
- **Anglais** : un habitant anglophone (salutations, météo, couleurs, nombres), sans leçon ni quiz.

## La dictée

Dictée-Blocs est intégré à la ville (une seule application) ; ses données sont importées par un fichier exporté.

- **Méthode reprise de Dictée-Blocs** : boîtes de Leitner planifiées jusqu'au jour de la dictée (une montée de boîte par jour au plus, « Sûr de moi / J'hésite », indice qui ne fait pas monter), fiche d'étude à la découverte, mots découverts par paquets de 5, correction lettre à lettre bienveillante.
- **Saisie** : fiche d'étude, puis le mot est caché, puis il le reconstitue avec des **tuiles** (pas de stylet). **Jamais de fausse orthographe montrée** (pas de choix entre plusieurs graphies), pour ne pas risquer de faire retenir une erreur.
- **Le lieu de chaque mot** est calculé automatiquement (méthode de Dictée-Blocs) : un ordre de priorité entre les pièges, et un lieu par défaut pour les mots sans piège.
- **Les tuiles** : les lettres du mot (sans son déterminant), plus deux lettres au hasard, mélangées. Reconstituer le mot compte comme l'écrire (il peut monter jusqu'à la boîte 3), puisque c'est la seule saisie.
- Les mots et leurs phrases sont lus par la voix enregistrée s'il y en a une, sinon par la voix de la tablette (à générer avec `npm run voix` quand la liste change).
- **Où** : dans les demandes (étiquettes de l'épicier, pancarte du jardin, adresse d'une lettre), dans les lieux de piège, et au stand de révision de la confiserie pour s'entraîner librement.
- **La veille de la dictée** : le **concours d'écriture** de la mairie (tous les mots, sans aide) ; les mots ratés sont repris aussitôt ; le parent voit le résultat.
- **Après la semaine** : chaque mot garde sa propre mémoire et revient dans les demandes et les stands ; un mot su pour toujours est gravé sur le **mur des mots** de la bibliothèque.

## L'économie

- Une seule monnaie : de **vrais euros et centimes**, avec des prix qui suivent le niveau (euros ronds, puis centimes).
- On gagne des euros en aidant les habitants et en vendant ses récoltes ; on paie soi-même et on vérifie la monnaie rendue ; on peut économiser plusieurs jours pour un objet cher.
- **Pas d'argent sans fin en jeu libre** : l'épicière n'achète qu'un nombre limité de récoltes par jour (environ 5), et les fruits repoussent en 2 ou 3 jours. Le jeu libre sert surtout à explorer, décorer et aller aux manèges.
- Le **lot** de fin de séance : un vêtement ou un meuble, choisi, jamais tiré au sort.
- Les tickets et les jetons disparaissent ; les tickets de l'enfant deviennent des euros de départ.

## Le parent et le rêve

- Le parent apporte les **listes** (comme aujourd'hui) et un **thème de la semaine** (une ligne ou une photo de la leçon), fixe le **jour de la dictée** et la date d'anniversaire.
- Le **rêve** analyse le journal chaque soir et peut : régler et choisir parmi ce qui est validé ; **proposer de nouvelles demandes, fiches, exercices et épisodes** à partir de ce qui résiste et du thème de la semaine ; **chercher sur Internet** des idées pédagogiques générales. Rien sur l'enfant ne sort ; tout texte nouveau attend la validation du parent.

## Le passage depuis le jeu actuel

Une petite histoire raconte que les forains s'installent en ville. L'enfant garde ses forains et leurs prénoms, ses accessoires, toute sa mémoire des révisions ; ses tickets deviennent des euros.

## Les habitants et les modèles

- Des **humains** façon jouet (dont les forains), avec quelques animaux de compagnie ; rien qui copie l'apparence d'Animal Crossing.
- Modèles 3D : image de concept, puis **Tripo** en « image vers 3D », puis allègement. Deux voies : l'API (script, crédits API) ou **Tripo Studio** avec l'abonnement (image Nano Banana gratuite, HD Model, export GLB à la racine du projet, puis `node scripts/generer-modeles.mjs --depuis FICHIER ID`). Depuis la rivière, tout se fait dans Studio.
- **Budget par modèle** : environ 10 000 triangles par personnage, 15 000 par bâtiment, 3 000 par petit objet ; textures de 1024 pixels au plus, en WebP, et en KTX2 compressé si la mémoire graphique de la tablette sature.
- **Les tenues du héros** sont des **modèles complets** (le héros avec son chapeau, son sac…), un par tenue : les accessoires dessinés en code n'allaient pas avec un modèle Tripo. Chaque tenue coûte environ 95 crédits (image, modèle, squelette, 3 animations) ; le jeu prend le modèle dont la tenue (champ `tenue` de `content/modeles/modeles.json`) correspond à ce que l'enfant porte.
- **Animation** : l'auto-rig de Tripo est testé dès la tranche 0 sur un forain. S'il ne donne rien de propre, les personnages restent rigides (ou en 2 ou 3 pièces : corps, tête, accessoire) et sont animés en code (sautiller, se pencher, saluer), dans l'esprit « jouet ».

## Les tranches

Chaque tranche est testée sur la tablette (plaisir, niveau de lecture, fluidité) avant la suivante. Le jeu actuel reste en ligne en attendant.

1. **Tranche 0, le socle** : la place et un bâtiment, déplacements tactiles fluides, textes en HTML avec mots touchables, chargement des modèles Tripo, test de l'auto-rig, sauvegarde.
2. **Tranche 1A, la dictée** : import de Dictée-Blocs, méthode de révision des mots, tuiles, deux lieux de piège, concours d'écriture, mur des mots.
3. **Tranche 1B, l'épicerie et les demandes** : acheter, vendre, rendre la monnaie, deux demandes simples (livrer, acheter), fin de séance et lot.
4. **Tranche 1C, la ville s'étend** : jardin, rivière (pêcher, cueillir, jardiner), fête foraine, poste, premier grand projet (la boulangerie), reprise de la sauvegarde actuelle.

Environ 20 modèles pour l'ensemble, avec les 1 000 crédits API offerts et l'abonnement Studio.

## Contraintes techniques

- On garde la pile actuelle : TypeScript strict, Three.js, Vite, PWA hors ligne, sauvegarde dans IndexedDB avec migrations testées, publication sur GitHub Pages.
- Toute l'interface (textes, dialogues, tuiles) est en HTML par-dessus la scène 3D.
- **Les textes sont dans des fichiers à part** (demandes, fiches du musée, dialogues, épisodes), jamais dans le code, pour que le rêve puisse en proposer et que le parent les valide dans l'espace parent.
- Les modèles sont générés par un script du projet (comme les voix et les sons), avec la clé Tripo dans `.env`, jamais dans le dépôt.
- L'import de Dictée-Blocs passe par un fichier exporté depuis Dictée-Blocs (format fixé à la tranche 1A).
