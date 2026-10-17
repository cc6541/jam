# Jam Factory Studio

Monorepo pnpm + Turborepo qui produit N jeux mobiles « Jam » (premier titre : **Screw Jam**, vis & plaques).
Rendu : PixiJS (plateau) + React (UI) empaquetés avec Capacitor (iOS/Android).

## Commandes
- `pnpm install` · `pnpm typecheck` · `pnpm test` · `pnpm lint`
- `pnpm levels:validate` — chaque niveau de chaque app doit être prouvé solvable par le solveur.
- Avant tout commit : `pnpm typecheck && pnpm test && pnpm levels:validate` doivent passer.

## Invariants (ne jamais violer sans accord explicite de l'humain)
1. **Zéro serveur, zéro coût récurrent.** Aucun backend, aucune base de données, aucune fonction cloud,
   aucun service payant à l'usage. Voir `docs/ZERO-INFRA.md`. Tout besoin qui semble exiger un serveur
   → écrire une proposition dans `docs/decisions/` et s'arrêter.
2. **Sauvegardes 100 % indépendantes par app.** Toute clé de stockage est préfixée par le `bundleId`.
   Aucun état partagé entre apps (ni streak, ni monnaie, ni gacha).
3. **Le seul lien inter-apps est la cross-promo** (cartes vers la fiche Store des autres jeux).
4. **Les moteurs (`packages/engine-*`) sont du TypeScript pur** : aucune dépendance React, Pixi,
   Zustand, DOM ou horloge. Déterministes : même `LevelDef` + même suite d'actions ⇒ même état.
   Tout aléa passe par le RNG seedé fourni dans l'état.
5. **État normalisé, données dérivées calculées** (ex. « vis bloquée ») via sélecteurs, jamais stockées.
6. Les couleurs ne sont jamais la seule information : chaque couleur a un motif (accessibilité daltoniens).

## Architecture
```
packages/
  engine-screw/  réducteur pur Screw Jam + sélecteurs + solveur + générateur
  level-tools/   schéma JSON des niveaux, validation CI, scoring de difficulté
  shell/         save (namespacée), économie, IAP, pubs, analytics, remote config statique
  cross-promo/   cartes promo, liens Store traçables, capping, config statique
  render-pixi/   plateau, animations, haptique
  ui/            composants React thémables (menus, boutique, modales)
apps/<nom>/      thème + app.config.json + levels/ + ASO ; quasiment pas de code
```
Dépendances autorisées : `apps → ui, render-pixi, shell, cross-promo, engine-*` ;
`render-pixi → engine-*` ; `shell`, `cross-promo`, `engine-*`, `level-tools` ne dépendent d'aucun
autre package interne (sauf `level-tools → engine-*` pour le solveur).

## Conventions
- TypeScript strict, pas de `any`. Tests Vitest à côté du code (`*.test.ts`).
- Les contrats (`types.ts`, schéma de niveau, interfaces du shell) sont **gelés** après la phase 1 :
  les modifier exige une note dans `docs/decisions/`.
- Une tâche = une Definition of Done vérifiable dans `docs/TASKS.md`. Cocher seulement si la DoD passe.
