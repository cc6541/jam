# Jam Factory Studio

Usine à jeux mobiles « Jam » : un shell commun (sauvegarde, économie, pubs, IAP, cross-promo),
des moteurs par famille de mécanique, et des apps qui ne sont presque que du thème, de la config et des niveaux.

- **Premier titre :** Screw Jam (vis et plaques). Le moteur est isolé dans `packages/engine-screw` :
  changer de mécanique revient à ajouter un `engine-*`, sans toucher au shell.
- **Données :** chaque app a ses propres sauvegardes. Le seul lien entre apps est la cross-promo.
- **Infra :** aucun serveur, voir [`docs/ZERO-INFRA.md`](docs/ZERO-INFRA.md).
- **Stack :** pnpm + Turborepo, TypeScript strict, Vitest, PixiJS (plateau), React (UI), Capacitor (mobile).

Documents : [`CLAUDE.md`](CLAUDE.md) (règles pour les agents), [`docs/TASKS.md`](docs/TASKS.md) (roadmap),
[`docs/GAME-SPEC.md`](docs/GAME-SPEC.md) (règles du jeu), [`docs/AGENTS.md`](docs/AGENTS.md) (organisation IA),
[`docs/TOKENS.md`](docs/TOKENS.md) (économie de tokens).
