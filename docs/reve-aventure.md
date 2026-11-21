# Le rêve et l'aventure de la ville

Ce que la tablette dépose pour les grandes quêtes et les demandes des habitants, et ce que le rêve
renvoie. Le texte à ajouter à la consigne du rêve (`CONSIGNE.md` du dépôt privé) est à la fin.

## Ce que la tablette dépose

`ville/aventure.json`, à chaque échange :

- `enCours` : l'identifiant de la grande quête en cours (vide s'il n'y en a pas) ;
- `chapitre` : le chapitre en cours, de 0 à 4, ou 5 pour la fin ;
- `finies` : les grandes quêtes terminées ;
- `quetesValidees`, `demandesValidees` : les propositions du rêve que le parent a validées ;
- `demandesFaites` : pour chaque demande faite, le dernier jour où elle l'a été ;
- `sujet` : `{ "texte", "date" }`, le sujet que le parent propose pour la prochaine grande quête
  (texte vide : pas de sujet).

Les décisions du parent sont aussi dans `validations.json` : `"quete:<id>"` et `"demande:<id>"`,
avec `"validee"` ou `"refusee"`.

## Ce que le rêve renvoie

Dans `preparation.json`, deux champs facultatifs :

- `demandes` : au plus 8 demandes d'habitants, proposées pour la journée ;
- `quetes` : au plus 2 grandes quêtes (en pratique, une à la fois).

Rien n'est joué tant que le parent ne l'a pas validé dans l'espace parent (« Les propositions du
rêve »). Une proposition mal formée est ignorée par la tablette.

### Une demande

```json
{
  "id": "tarte-aux-poires-2026-11-24",
  "donneur": "epiciere",
  "destinataire": "epiciere",
  "fournit": [],
  "besoin": [{ "produit": "poire", "nombre": 3 }],
  "recompense": [200, 200],
  "texte": "Je voudrais faire une tarte aux poires…",
  "rappel": "Pour ma tarte, il me faut 3 poires.",
  "merci": "Merci ! Voilà 4 €."
}
```

- `id` : minuscules, chiffres et tirets (3 à 60), **jamais réutilisé**.
- Habitants (`donneur`, `destinataire`) : `epiciere`, `forain-chamboule`, `postiere`.
- Produits (`fournit`, `besoin`) : `pomme`, `poire`, `carotte`, `tomate`, `pain`, `lait`,
  `graines-carotte`, `graines-tomate`, `poisson`, `mure` (achetés à l'épicerie, cueillis au
  pommier ou au bois, pêchés), et les objets confiés `colis`, `lettre`, `crepes`. Au plus 4
  lignes, de 1 à 10 chacune.
- Ce que le donneur confie (`fournit`) est mis dans le sac de l'enfant quand il accepte ; ce qu'il
  faut donner (`besoin`) est ce que le destinataire attend.
- `recompense` : des pièces de 100, 200 ou 500 centimes, au plus 4.
- `texte` (la demande), `rappel` (si l'enfant revient sans tout), `merci` (avec la somme donnée) :
  phrases courtes de niveau CE2, au plus 400 caractères chacune.

### Une grande quête

```json
{
  "id": "le-cerf-volant-perdu",
  "titre": "Le cerf-volant perdu",
  "chapitres": [
    {
      "titre": "…",
      "phrases": ["…", "…", "…"],
      "questions": [
        { "question": "…", "choix": ["bonne réponse", "autre", "autre"], "indice": 2 }
      ],
      "tache": { "donneur": "…", "destinataire": "…", "fournit": [], "besoin": [], "recompense": [200], "texte": "…", "rappel": "…", "merci": "…" }
    }
  ],
  "fin": {
    "titre": "…",
    "phrases": ["…", "…"],
    "reflexion": { "question": "…", "choix": ["la meilleure réponse", "autre", "autre"] },
    "morale": "…"
  }
}
```

- Exactement **5 chapitres**, un par jour : chacun 2 à 7 phrases courtes (CE2), un
  **rebondissement**, au moins 2 questions à 3 choix (la bonne réponse en premier, `indice` = rang
  de la phrase qui contient la réponse), et une **tâche** (même forme qu'une demande, sans `id`).
- La **fin** : 2 à 7 phrases, une question pour **réfléchir** (la meilleure réponse en premier),
  puis la **morale** en une phrase.
- Le chapitre suivant n'arrive que le lendemain du jour où la tâche est faite : l'histoire attend
  l'enfant.

## Texte à ajouter à la consigne

```markdown
4 ter. **La ville : les demandes du jour et la grande aventure** — voir `docs/reve-aventure.md` :
   1. Lis `ville/aventure.json` et les clés `quete:` et `demande:` de `validations.json`.
   2. **Les demandes** : propose dans `preparation.json`, champ `demandes`, 3 demandes pour
      aujourd'hui, variées (habitants, produits, lieux : épicerie, pommier, bois, rivière, poste),
      jamais deux fois le même identifiant (ajoute la date à la fin de l'`id`). L'une d'elles
      peut prolonger le chapitre en cours de la grande aventure, sans en dévoiler la suite ; les
      autres sont indépendantes. Garde les demandes déjà proposées que le parent n'a pas encore
      décidées.
   3. **La grande aventure** : compte les grandes quêtes encore à jouer (celles du jeu :
      `colis-sans-adresse`, `riviere-qui-chante`, `golem-du-pont`, plus `quetesValidees`, moins
      `finies`). S'il en reste moins de 2, et qu'aucune quête proposée n'attend la décision du
      parent, écris-en **une** nouvelle dans le champ `quetes`. Si `sujet.texte` n'est pas vide,
      construis l'histoire autour de ce sujet. Une quête refusée ne revient pas.
   4. Les textes : niveau CE2, phrases courtes, rien d'effrayant ni de violent, une morale
      positive et concrète (partager, s'excuser, chercher ensemble, être patient…). Les
      habitants s'appellent « l'épicière », « le forain » et « la postière » ; d'autres
      personnages peuvent être cités sans être des habitants (un voisin, un animal, un golem…).
      N'écris jamais le prénom de l'enfant.
   5. Dans le résumé pour le parent : une ligne si une grande quête ou des demandes attendent sa
      validation (« 3 demandes et une grande quête t'attendent dans l'espace parent »).
```
