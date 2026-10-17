# Jam Factory Studio

Monorepo pnpm + Turborepo qui produit des jeux mobiles « Jam ». Premier titre : **Screw Jam**.
La prochaine tâche est injectée au démarrage de session ; ne relis pas `docs/TASKS.md` en entier.

## Commandes (sorties silencieuses : seules les erreurs s'affichent)
- `pnpm check` : typecheck + lint + tests. À lancer avant tout commit, avec `pnpm levels:validate`.
- `pnpm levels:stats` : résumé des niveaux. **Ne jamais lire les JSON de `apps/*/levels/`.**

## Invariants (ne jamais violer sans accord explicite de l'humain)
1. **Zéro serveur, zéro coût récurrent** (`docs/ZERO-INFRA.md`). Si un besoin semble exiger un serveur :
   proposition dans `docs/decisions/`, puis arrêt.
2. Sauvegardes 100 % indépendantes par app : toute clé de stockage est préfixée par le `bundleId`.
3. Le seul lien entre apps est la cross-promo.
4. `packages/engine-*` = TypeScript pur et déterministe : ni React, ni Pixi, ni DOM, ni horloge ; RNG seedé.
5. État normalisé ; les données dérivées (ex. vis bloquée) sont calculées par sélecteurs, jamais stockées.
6. Une couleur a toujours un motif associé (accessibilité).
7. Les contrats (`engine-*/src/types.ts`, schéma de niveau, ports du shell) sont gelés après la phase 1 :
   toute modification passe par une note dans `docs/decisions/`.

## Économie de tokens
- Lire ciblé : Grep/Glob d'abord, puis Read avec offset/limit. Ne pas relire un fichier qu'on vient d'éditer.
- Exploration large → sous-agent `Explore` : seule sa conclusion revient dans le contexte.
- Ouvrir seulement le doc utile : `docs/GAME-SPEC.md` (règles), `docs/MONETIZATION.md` (engagement, revenus),
  `docs/JUICE.md` (haptique, sons, effets), `docs/ARCHITECTURE.md` (packages), `docs/AGENTS.md` (rôles),
  `docs/ZERO-INFRA.md` (services), `docs/decisions/` (historique des décisions, le plus récent en dernier).
- Commandes : préférer `pnpm check` aux commandes verbeuses ; filtrer avec `| tail -n 40` si besoin.
- Réponses courtes : pas de résumé de ce qui vient d'être fait si le diff le montre.
- Plugin `founder-skill` : toujours lancer ses skills avec `--quick`. Ne proposer une passe complète
  (100 sous-agents) que si elle apporte un vrai gain (ex. décision de prix ou de lancement) :
  dire pourquoi, et attendre l'accord de l'humain.

## Conventions
TypeScript strict, pas de `any`. Tests Vitest à côté du code (`*.test.ts`).
Une tâche n'est cochée dans `docs/TASKS.md` que si sa DoD passe.
