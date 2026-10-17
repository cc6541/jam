---
name: new-app
description: Crée une nouvelle déclinaison de jeu dans apps/<nom> à partir d'un moteur existant (engine-*) et d'un thème, sans modifier packages/*. À utiliser quand on demande un nouveau jeu, une nouvelle app ou un reskin.
model: sonnet
effort: low
---

# Nouvelle app de la factory

Entrées à demander si absentes : nom de l'app, `bundleId` (ex. `com.studio.metaljam`), moteur (`engine-screw` par défaut), thème (palette, matériaux), langues.

1. Copier la structure de `apps/screw-jam` vers `apps/<nom>` (sans `levels/` ni `ios/` ni `android/`).
2. Remplir `app.config.json` : `bundleId`, `engine`, `theme`, `crossPromo.excludeSelf: true`.
3. Générer les niveaux avec le générateur de `level-tools` et une **nouvelle seed**, puis `pnpm levels:validate`.
4. Ajouter l'app dans le JSON statique de cross-promo (`config/cross-promo.json`).
5. Déléguer l'ASO à l'agent `publisher`.
6. DoD : `pnpm typecheck && pnpm test && pnpm levels:validate` passent, et `git diff --stat packages/` est vide.
