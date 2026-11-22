# Le rêve, les statistiques et les stands du lendemain

Ce que la tablette dépose pour les statistiques, et ce que le rêve renvoie pour choisir les
exercices des stands du lendemain. Le texte à ajouter à la consigne du rêve (`CONSIGNE.md` du dépôt
privé) est à la fin.

## L'ordre des priorités

1. **Les devoirs de la semaine** : le programme de la semaine (`content/ville/programme.json`),
   écrit d'après les photos des devoirs envoyées par le parent, et validé par lui. Il dit quels
   stands prennent quel atelier, et les compétences des devoirs. Le rêve ne le change pas.
2. **Les points faibles** : pour les stands que le programme laisse libres, le rêve peut choisir
   un atelier pour le lendemain ; et pour tous les ateliers, il désigne les compétences sur
   lesquelles insister.

## Ce que la tablette dépose

`stats.json`, à chaque échange :

- `jour` : le jour de l'échange ;
- `pointsFaibles` : les compétences précises réussies moins de 7 fois sur 10 ces 7 derniers jours
  (au moins 4 réponses), les plus faibles d'abord ;
- `competences` : pour chaque compétence et chaque niveau au-dessus (`mesures`,
  `mesures.convertir`, `mesures.convertir.m-cm`) :
  - `total`, `justes` (du premier coup, sans aide) ;
  - `recents` et `avant` : `{ total, justes }` pour les 7 derniers jours, et avant ;
  - `duree` : le temps habituel d'une réponse, en secondes ;
  - `dernier` : le dernier jour travaillé ; `jours` : le nombre de jours travaillés.

Les compétences :

| Domaine | Exemples | D'où |
|---|---|---|
| `tables` | `tables.7` | le chamboule-tout |
| `calcul` | `calcul.add-r`, `calcul.pb-retrait` | le chantier |
| `heure` | `heure.lire-demie` | l'horloge |
| `homophones` | `homophones.et` | la pêche aux canards |
| `mots` | `mots` | la confiserie (le détail par mot est dans `etats.json`) |
| `monnaie` | `monnaie.rendre.billet-10`, `monnaie.payer` | l'atelier, l'épicerie |
| `mesures` | `mesures.convertir.km-m`, `mesures.unite.masse`, `mesures.pas`, `mesures.masse.additionner` | l'atelier, la pêche à la canne |
| `fractions` | `fractions.nommer`, `fractions.colorier` | l'atelier |
| `nombres` | `nombres.enChiffres`, `nombres.chiffreDes.centaines` | l'atelier |
| `formes` | `formes.nom.losange`, `formes.anglesDroits.rectangle` | l'atelier |
| `phrases` | `phrases.pluriel.x`, `phrases.groupe.sujet` | l'atelier |
| `lecons` | `lecons.histoire.<id>` | la leçon du jour (Gazette) |
| `lecture` | `lecture.aventure`, `lecture.quetes` | le questionnaire de la Gazette |
| `alphabet` | `alphabet.initiale`, `alphabet.ordre` | la poste |

Chaque réponse est aussi dans `journal/<jour>.json` (champ `competence`, absent pour les anciens
stands : la tablette la déduit du stand et de l'élément).

## Ce que le rêve renvoie

Dans `preparation.json`, deux champs facultatifs, valables **seulement pour le jour** de la
préparation (`jour`) :

- `competences` : au plus 12 compétences sur lesquelles insister (un domaine, une sorte ou une
  compétence précise : `mesures.pas`, `phrases.pluriel`, `nombres.chiffreDes.centaines`). Dans un
  atelier, une question sur deux porte alors sur elles.
- `ateliers` : pour les stands que le programme laisse libres (`chamboule`, `confiserie`,
  `chantier`, `horloge`, `peche`), l'atelier du jour : `monnaie`, `mesures`, `fractions`,
  `nombres`, `formes` ou `phrases`. Un stand sans atelier garde son travail habituel.

```json
{
  "competences": ["mesures.convertir.km-m", "phrases.pluriel"],
  "ateliers": { "peche": "phrases" }
}
```

Chaque atelier pose le même nombre de questions par jour (`questionsParStand` du programme, 6
pour l'instant).

## Texte à ajouter à la consigne

```markdown
4 quater. **Les statistiques et les stands du lendemain** — voir `docs/reve-stats.md` :
   1. Lis `stats.json` (les points faibles, et chaque compétence sur 7 jours et avant).
   2. `preparation.json`, champ `competences` : au plus 12 compétences sur lesquelles insister
      demain, d'abord les points faibles qui touchent les devoirs de la semaine, puis les autres
      points faibles, puis ce qui n'a pas été travaillé depuis longtemps (`dernier`).
   3. Champ `ateliers` : seulement pour les stands que le programme de la semaine laisse libres,
      et seulement si un point faible le justifie (au plus 2 stands) ; sinon, n'en mets pas : les
      stands gardent leur travail habituel. Change d'un jour à l'autre pour varier.
   4. Dans le résumé pour le parent, une ligne au plus sur les statistiques : ce qui progresse
      (`recents` meilleur qu'`avant`), ce qui résiste. Rien de décourageant, rien pour l'enfant.
```
