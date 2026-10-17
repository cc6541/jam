import type { Engine, Selectors } from './types';

// Implémentation en phase 3 [engine] : les tests de la phase 2 doivent échouer d'ici là.
const notImplemented = (): never => {
  throw new Error('engine-screw: non implémenté (phase 3)');
};

export const engine: Engine = {
  init: notImplemented,
  step: notImplemented,
  replay: notImplemented,
};

export const selectors: Selectors = {
  isScrewBlocked: notImplemented,
  tappableScrews: notImplemented,
  isNearMiss: notImplemented,
};
