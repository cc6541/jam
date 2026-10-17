# Organisation des agents IA

Les sous-agents sont définis dans `.claude/agents/*.md` (frontmatter `model` et `tools`) ; les règles communes sont dans `CLAUDE.md`.

| Agent | Modèle | Rôle | Écrit dans |
|---|---|---|---|
| `architect` | opus | Monorepo, contrats, décisions, revue des PR | racine, `types.ts`, schéma, `docs/` |
| `qa` | opus | Tests écrits **depuis la spec, avant le code** | `**/*.test.ts` |
| `engine` | opus | Réducteur, solveur, générateur | `packages/engine-*`, `packages/level-tools` |
| `render` | sonnet | PixiJS, animations, haptique | `packages/render-pixi` |
| `shell` | sonnet | Save, économie, ports, SDK | `packages/shell`, `packages/cross-promo` |
| `ui` | sonnet | React, thèmes, modales | `packages/ui`, `apps/*/src` |
| `publisher` | haiku | ASO, config d'app, assets texte | `apps/*/ASO.json`, `apps/*/app.config.json` |

## Règles d'orchestration
1. **Contrats d'abord** (phase 1). Ensuite, travail en parallèle sur des packages disjoints, chacun dans son worktree.
2. **TDD** : `qa` écrit les tests depuis `GAME-SPEC.md`, puis `engine` les fait passer. `engine` ne modifie pas les tests sans l'accord de `qa`.
3. Un agent ne touche qu'aux dossiers de sa colonne « Écrit dans ». Un besoin hors périmètre se note dans `docs/decisions/`.
4. Chaque tâche se termine par la DoD de `TASKS.md`, exécutée ; le compte-rendu cite son résultat, pas la sortie complète.
5. Opus est réservé là où une erreur coûte cher (contrats, moteur, solveur, tests) ; Sonnet et Haiku font l'exécution.
