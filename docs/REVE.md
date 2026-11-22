# Le rêve du soir

Chaque nuit, après minuit, Claude lit ce que la tablette a déposé la veille dans un **dépôt privé** et y écrit la
**préparation** du lendemain (voir `docs/adr/0001-reve-du-soir-par-le-reseau.md`). Le jeu
marche sans : sans préparation nouvelle, il garde la dernière reçue, et le moteur de mémoire
suffit à faire une séance du jour correcte.

## Ce qu'il y a dans le dépôt privé

| Fichier | Écrit par | Contenu |
|---|---|---|
| `journal/AAAA-MM-JJ.json` | la tablette | les réponses du jour, la journée (séance, temps, pause), les niveaux, tickets, grande roue, jetons, manèges et garde-robe |
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
3. Sur la tablette, ouvrir l'espace parent : **appui long d'une seconde et demie** sur le petit
   cadenas en haut à gauche, puis le code (choisi la première fois). Dans « Dépôt privé », écrire
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
  "feuilleton": [],
  "recompenses": { "autos": "nounours-bleu", "trampoline": "chapeau-etoile" }
}
```

- `niveaux` : niveau de départ (1 à 5) des défis, de l'horloge et de la pêche. Facultatif.
- `focus` : jusqu'à 6 éléments **déjà présents** à faire passer en premier dans les manches.
- `feuilleton` : semaines **nouvelles** proposées (format de `content/feuilleton/*.json`, avec
  `"valide": false`). Elles n'arrivent devant l'enfant qu'après « Valider la semaine » dans
  l'espace parent.

- `recompenses` : le **prochain cadeau** de chaque manège (`autos`, `trampoline`, `glaces`, `chaises`),
  choisi dans le catalogue ci-dessous. Facultatif. Un cadeau déjà gagné ou impossible est
  remplacé par l'ordre prévu dans le jeu.

La tablette vérifie tout ce qu'elle reçoit : une préparation illisible est ignorée.

## Les manèges : objectifs et cadeaux

Les autos tamponneuses, le trampoline, le palais des glaces et les chaises volantes comptent ce
que l'enfant y fait, d'un jour à l'autre, sans jamais rien retirer : étoiles attrapées, sauts
réussis, palais traversés, ballons éclatés. À chaque palier, un cadeau.

| Manège | On compte | Paliers |
|---|---|---|
| autos | les étoiles | 10, 25, 45, 70, 100, puis tous les 35 |
| trampoline | les sauts réussis | 10, 25, 45, 70, 100, puis tous les 35 |
| glaces | les palais traversés | 1, 3, 6, 10, 15, puis tous les 5 |
| chaises | les ballons éclatés | 10, 25, 45, 70, 100, puis tous les 35 |

Un tour coûte un **jeton** tant que la séance du jour n'est pas finie (une manche de révision
finie = un jeton) ; ensuite les manèges sont gratuits. Les tickets restent pour la grande roue
et ne servent jamais aux manèges.

**Catalogue des cadeaux** (le code est dans `src/detente/objectifs.ts`) :

- **Décorations**, installées autour du manège où elles sont gagnées (six places par manège,
  pas deux fois le même objet au même manège). Code : `modele` ou `modele-teinte`.
  - modèles : `ballons`, `lampions`, `fanions`, `coupe`, `fleurs`, `etoile`, `nounours`
  - teintes : `rouge`, `bleu`, `jaune`, `vert`, `violet`, `rose`
- **Accessoires** qu'on ne gagne qu'aux manèges (un seul exemplaire chacun) :
  `chapeau-pilote`, `objet-volant`, `chapeau-etoile`, `chaussures-ressorts`,
  `lunettes-miroir`, `haut-paillettes`. Les chaises volantes n'ont pas encore d'accessoire :
  seulement des décorations.

Le journal contient `maneges` (`compte`, `paliers`, `decorations` par manège), `jetons` et
`garderobe` (`possedes`, `porte`).
