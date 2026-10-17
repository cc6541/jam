import type { LevelRules } from './types';

/** Valeurs par défaut validées (docs/decisions/0001-spec-v0-defaults.md). */
export const DEFAULT_RULES: LevelRules = {
  boxCapacity: 3,
  activeBoxes: 2,
  toolboxSlots: 5,
  toolboxMaxSlots: 7,
  nearMiss: { maxRemaining: 3, offerSeconds: 10 },
};
