# Le rêve et la dictée

Ce que la tablette dépose pour la dictée dans le dépôt privé du rêve, et ce que le rêve doit
renvoyer. Le texte à ajouter à la consigne du rêve (`CONSIGNE.md` du dépôt privé) est à la fin.

## Ce que la tablette dépose

- `dictee/etat.json` : la liste de la semaine (`mots`, `titre`, `jourDictee`), la mémoire de
  chaque mot (`fiches` : difficulté `d` de 1 à 10, stabilité `s` en jours, dernier jour revu,
  derniers essais avec leur note sur 4, le temps et qui a jugé), les concours d'écriture, les
  mots sus pour toujours et les mots prioritaires actuels.
- `dictee/ecritures/AAAA-MM-JJ.json` : les écritures du jour (une par mot écrit) : `id`, `mot`,
  `sorte` (`revision`, `concours`, `reprise`), temps (`ms`), ce qu'en ont dit l'enfant
  (`enfant`), le parent (`parent`) et le rêve (`reve`) — `true` juste, `false` faux, `null` pas
  encore jugé — et le chemin de l'image.
- `dictee/ecritures/AAAA-MM-JJ/<id>.png` : l'image de chaque écriture (encre bleue sur fond
  blanc, sans les lignes du cahier, recadrée).

## Ce que le rêve renvoie

Dans `preparation.json`, un champ `dictee` :

```json
{
  "jour": "2026-11-22",
  "dictee": {
    "lectures": [
      { "id": "2026-11-21-…", "mot": "le bateau", "juste": false, "lu": "batô" }
    ],
    "prioritaires": ["bateau", "chapeau"]
  }
}
```

- `lectures` : une entrée par écriture pas encore relue (`reve` à `null`) : `juste` si le mot
  est écrit exactement (accents compris ; le déterminant n'est pas à écrire), `lu` : ce qui est
  écrit, lettre par lettre, quand c'est faux (ou illisible : `"?"`).
- `prioritaires` : au plus 20 mots (de la liste ou anciens) à revoir en priorité le lendemain.

La tablette applique ces lectures une seule fois par préparation (le `jour`). Une lecture ne
remplace jamais l'avis du parent. Si l'enfant s'était dit juste et que le rêve lit une faute, il
revoit son écriture d'hier à côté du mot juste.

## Texte à ajouter à `CONSIGNE.md` (à valider par le parent avant de le pousser)

> ### La dictée (écritures au stylet)
>
> 1. Lis `dictee/etat.json` et, pour chaque jour récent, `dictee/ecritures/AAAA-MM-JJ.json`.
> 2. Pour chaque écriture dont `reve` vaut `null`, regarde son image
>    (`dictee/ecritures/AAAA-MM-JJ/<id>.png`) et lis ce que l'enfant a écrit, lettre par lettre.
>    Le déterminant (« le », « la », « un », « l' »…) n'est pas à écrire. Un accent manquant ou
>    faux est une faute. Si tu hésites entre deux lectures, choisis la plus favorable seulement
>    si la forme est vraiment ambiguë (écriture d'enfant de 8 ans), et note-le dans ton résumé.
> 3. Écris dans `preparation.json`, champ `dictee.lectures`, une entrée par écriture relue :
>    `{ "id", "mot", "juste", "lu" }` (`lu` seulement si c'est faux ; `"?"` si illisible).
> 4. Repère les familles d'erreurs (é/er, lettres doubles, lettres muettes, m devant m/b/p, sons
>    à plusieurs lettres) et les mots lents (temps par lettre nettement au-dessus de son rythme).
>    Choisis au plus 20 `dictee.prioritaires` : les mots ratés, puis ceux qui partagent un piège
>    raté, puis les plus lents. Ne mets jamais un mot déjà « su pour toujours ».
> 5. Dans le résumé pour le parent, deux lignes au plus sur la dictée : ce qui progresse, ce qui
>    résiste. Rien sur le temps d'écriture qui puisse être montré à l'enfant.
> 6. Ne modifie jamais les fichiers déposés par la tablette ; ne copie jamais d'image ailleurs.
>    Les images de plus de 2 mois peuvent être supprimées du dépôt.
