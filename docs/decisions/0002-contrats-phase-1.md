# 0002 — Gel des contrats (phase 1)

Date : 2026-10-17 · Statut : gelé.

Contrats gelés : `packages/engine-screw/src/types.ts`, `packages/level-tools/schema/level.schema.json`,
`packages/shell/src/ports.ts`. Toute modification ultérieure passe par une nouvelle note ici.

Changements par rapport au brouillon initial de `types.ts` :
- `ScrewKind` sans `joker` (voir 0001).
- `GameState.holding` : réserve du booster `clearToolbox`.
- `GameEvent` : `screwToBox.from`, `toolboxCleared`, `toolboxSlotAdded` (le rendu anime chaque provenance).
- `DEFAULT_RULES` exporté par `@jam/engine-screw`.

Le schéma ne couvre que la forme ; `validateLevel` (level-tools) ajoute les contrôles sémantiques
(ids uniques, plaques référencées, équilibre vis/boîtes par couleur). Cohérence type ↔ schéma :
la fixture de `validate.test.ts` est typée `LevelDef` et doit passer le schéma.

Ports du shell : `StoragePort` brut (le préfixe `bundleId` est ajouté par la couche save),
`ClockPort.now()` en ms, `AdsPort`, `IapPort`, `AnalyticsPort`, `RemoteConfigPort.fetch()` (JSON statique).
Mocks dans `@jam/shell` (`MemoryStorage`, `FakeClock`, `MockAds`, `MockIap`, `MockAnalytics`, `MockRemoteConfig`).
