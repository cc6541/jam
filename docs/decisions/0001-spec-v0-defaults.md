# 0001 — Valeurs par défaut de la spec v0

Date : 2026-10-17 · Statut : adopté pour démarrer (relecture humaine attendue, réglable par `LevelRules`).

Points **[À VALIDER]** de `GAME-SPEC.md` et décision retenue :

| Point | Décision |
|---|---|
| Boîtes actives | 2 (`rules.activeBoxes`). Une boîte partie est remplacée **à la même place** (rendu stable). |
| Toolbox | 5 emplacements, 7 au maximum avec boosters. |
| Near miss | ≤ 3 vis restantes, offre 10 s, seconde chance = `addToolboxSlot` sur une partie perdue. Pas de near miss si la toolbox est déjà au maximum (l'offre serait sans effet). |
| `clearToolbox` | La toolbox part dans une réserve sans limite (`GameState.holding`), vidée en priorité dans les boîtes. |
| Vis joker | **Retirée de la v0.** Elle casse l'invariant « vis par couleur = 3 × boîtes de la couleur » dont dépendent la validation et le solveur. À réintroduire par une note dédiée. |

Précisions ajoutées pour rendre la spec testable : vis bloquée si le point est à l'intérieur **ou sur le bord**
d'une plaque plus haute ; à la défaite la vis reste sur le plateau (`tapsLeft = 0`) pour pouvoir être rejouée
après la seconde chance ; un refus renvoie le même objet état.

Reste à fixer par l'humain : les KPI cibles (Phase 0, `docs/TASKS.md`).
