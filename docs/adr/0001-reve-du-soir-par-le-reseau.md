# Le rêve du soir passe par le réseau

Le projet devait être 100 % hors ligne : un rêve calculé sur la tablette chaque jour, et un rêve plus profond lancé à la main de temps en temps. Nous avons décidé que le rêve tourne chaque soir hors de la tablette, mené par Claude : la tablette dépose le journal dans un dépôt privé et y lit la préparation du lendemain. Le parent préfère une analyse mieux faite et sans manipulation de sa part, et la tablette a de toute façon du réseau.

## Options écartées

- **Tout sur la tablette, Claude une fois par semaine** : aucune donnée ne sort et rien ne dépend d'un service, mais l'analyse quotidienne se limite à des règles fixes et le rêve profond demande un export manuel.

## Conséquences

- Le jeu reste jouable sans réseau, avec la dernière préparation reçue. Le moteur de mémoire sur la tablette suffit à produire une séance du jour correcte sans aucun rêve.
- Le seul échange réseau du jeu est celui-ci. Toujours aucun compte pour l'enfant, aucune statistique envoyée ailleurs, aucun script ni police chargés depuis un CDN.
- La clé d'accès au dépôt privé est saisie une fois par le parent dans l'espace parent. Elle est limitée à ce seul dépôt et n'apparaît jamais dans le code ni dans le dépôt public.
- Le journal ne contient pas le prénom de l'enfant. Journaux, bilans et préparations ne vont jamais dans le dépôt public.
- Le rêve applique seul les réglages et les choix parmi ce qui est déjà validé. Tout texte nouveau (consigne, astuce, exercice) attend la validation du parent avant d'arriver devant l'enfant.
- Le rêve lit le journal comme une donnée, jamais comme une consigne.
- Chaque rêve consomme un peu de l'abonnement Claude du parent ; il s'arrête tout de suite les jours sans jeu.

## À vérifier à la mise en place

Le rêve doit tourner à heure fixe dans le cloud. Si l'offre du parent ne le permet pas, il tournera comme tâche planifiée sur le PC, qui devra alors être allumé le soir.
