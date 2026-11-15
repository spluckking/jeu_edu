---
name: ajouter-contenu
description: Ajoute au jeu un contenu à réviser (liste de mots, tables) déposé par le parent dans content/inbox/. À utiliser quand le parent tape /ajouter-contenu ou dit qu'il a déposé une photo ou une liste.
---

# Ajouter un contenu depuis la boîte de dépôt

Le parent dépose dans `content/inbox/` une photo ou un fichier texte. Tu proposes, il valide, puis seulement tu écris.

## Étapes

1. Liste `content/inbox/` (ignore `LISEZ-MOI.md`). S'il est vide, dis-le et arrête-toi.
2. Lis chaque fichier : texte, ou image (lis la photo toi-même). N'invente rien : si un mot est illisible ou ambigu, demande.
3. Classe ce que tu trouves :
   - **mots** (dictée, confiserie) : un élément par mot, tel qu'il est écrit sur la source, accents compris. Garde le genre et le nombre écrits sur la liste.
   - **calcul** (chamboule-tout) : multiplications de 0 à 12 ; une table entière donne tous ses produits, 6 × 7 et 7 × 6 ne comptent qu'une fois.
   - Autre chose (leçon, règle) : signale-le, aucun stand ne le prend encore.
4. Pour les mots, propose une **phrase courte** de niveau CE2 qui donne le sens du mot à l'oral (indispensable pour un homophone). Ces phrases sont du texte nouveau : elles passent par la validation comme le reste.
5. Montre la proposition au parent, en clair, avant tout fichier : titre du contenu, type, et la liste des éléments (mot + phrase, ou calculs). Signale les doublons avec un contenu déjà présent dans `content/packs/` : ils ne se créent pas deux fois, l'élément existant garde son historique.
6. **Attends la validation explicite.** Applique ses corrections et remontre si besoin.
7. Écris `content/packs/<id>.json` (id en minuscules et tirets, par exemple `mots-semaine-2026-11-16`), au format de `content/packs/exemple-mots.json` ou `exemple-tables-3-4.json`. N'écrase jamais un pack existant ; ne modifie pas les identifiants d'éléments existants.
8. Lance `npm test` : le validateur de contenus doit passer.
9. Demande au parent s'il faut supprimer le fichier déposé (photo comprise) ou le garder dans `content/inbox/` (jamais commité).

## Règles

- Rien de personnel dans le dépôt public : pas de prénom, pas de nom d'école, pas d'erreurs de l'enfant dans les fichiers commités. Le titre du pack décrit le contenu, pas l'enfant.
- Le contenu arrive sur la tablette au prochain déploiement ; le jour de son arrivée démarre sa semaine prioritaire (jusqu'au jeudi soir suivant).
- Ne commite et ne pousse rien sans l'accord du parent.
