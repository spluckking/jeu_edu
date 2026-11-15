# Le rêve du soir

Chaque soir, Claude lit ce que la tablette a déposé dans un **dépôt privé** et y écrit la
**préparation** du lendemain (voir `docs/adr/0001-reve-du-soir-par-le-reseau.md`). Le jeu
marche sans : sans préparation nouvelle, il garde la dernière reçue, et le moteur de mémoire
suffit à faire une séance du jour correcte.

## Ce qu'il y a dans le dépôt privé

| Fichier | Écrit par | Contenu |
|---|---|---|
| `journal/AAAA-MM-JJ.json` | la tablette | les réponses du jour, la journée (séance, temps, pause), les niveaux, tickets et grande roue |
| `etats.json` | la tablette | l'état de mémoire de chaque élément (réussites, échecs, échéance) |
| `validations.json` | la tablette | les décisions du parent sur les textes proposés (`validee` ou `refusee`) |
| `preparation.json` | le rêve | la préparation du lendemain (format ci-dessous) |
| `resumes/AAAA-MM-JJ.md` | le rêve | le résumé du soir, deux lignes en langage simple |

Rien de tout cela ne va dans le dépôt public. Le journal ne contient jamais le prénom de l'enfant.

## Mise en place (une seule fois, par le parent)

1. Créer un dépôt **privé** sur GitHub, par exemple `jeu-edu-reve`.
2. Créer une clé d'accès limitée à ce dépôt : GitHub → *Settings* → *Developer settings* →
   *Personal access tokens* → *Fine-grained tokens* → *Generate new token*.
   - *Repository access* : *Only select repositories*, puis le dépôt du rêve seulement.
   - *Permissions* → *Repository permissions* → *Contents* : *Read and write*. Rien d'autre.
   - Une durée d'un an au plus.
3. Sur la tablette, ouvrir l'espace parent : **appui long de 2 secondes** sur le petit soleil
   en haut à gauche, puis le code (choisi la première fois). Dans « Dépôt privé », écrire
   `propriétaire/nom-du-dépôt` et la clé, **Enregistrer**, puis **Échanger maintenant**.
4. Programmer le rêve chaque soir (routine Claude dans le cloud, ou tâche planifiée sur le PC
   si l'offre ne le permet pas), avec pour consigne le fichier `docs/reve/consigne-du-soir.md`.

La clé reste sur la tablette, à part de la sauvegarde. « Oublier la clé » l'efface.

## Quand la tablette échange

À l'entrée dans le jeu, à la fin de la séance du jour, quand on quitte le jeu, et à la demande
dans l'espace parent. Sans réseau ou sans clé, rien ne se passe et le jeu continue.

## Format de `preparation.json`

```json
{
  "jour": "2026-11-17",
  "resume": "Bonne séance, 6 × 7 résiste encore. Demain, on le revoit en premier.",
  "niveaux": { "defis": 2, "horloge": 3, "peche": 1 },
  "focus": ["x-6-7", "m-école"],
  "feuilleton": []
}
```

- `niveaux` : niveau de départ (1 à 5) des défis, de l'horloge et de la pêche. Facultatif.
- `focus` : jusqu'à 6 éléments **déjà présents** à faire passer en premier dans les manches.
- `feuilleton` : semaines **nouvelles** proposées (format de `content/feuilleton/*.json`, avec
  `"valide": false`). Elles n'arrivent devant l'enfant qu'après « Valider la semaine » dans
  l'espace parent.

La tablette vérifie tout ce qu'elle reçoit : une préparation illisible est ignorée.
