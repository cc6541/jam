// Contrats du moteur Screw Jam. Voir docs/GAME-SPEC.md.
// Règles : TS pur, aucune dépendance runtime, état normalisé, données dérivées via sélecteurs.

export type Id = string;

export type ColorId = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange';
/** Motif associé à chaque couleur pour l'accessibilité (le thème fournit le rendu). */
export type PatternId = 'dots' | 'stripes' | 'cross' | 'wave' | 'grid' | 'plain';

export interface Point {
  x: number;
  y: number;
}

// ---------- Définition statique d'un niveau (JSON, validé par level-tools) ----------

export type ScrewKind =
  | { type: 'standard' }
  | { type: 'multiTap'; taps: number }
  | { type: 'joker' }; // compatible avec toutes les couleurs [À VALIDER]

export interface PlateDef {
  id: Id;
  z: number;
  polygon: Point[];
}

export interface ScrewDef {
  id: Id;
  color: ColorId;
  kind: ScrewKind;
  at: Point;
  /** Plaques retenues par cette vis : unique source de vérité de la relation vis↔plaque. */
  pins: Id[];
}

export interface LevelDef {
  schemaVersion: 1;
  id: Id;
  seed: number;
  board: { width: number; height: number };
  plates: PlateDef[];
  screws: ScrewDef[];
  /** File de boîtes, dans l'ordre d'apparition. */
  boxQueue: ColorId[];
  rules: LevelRules;
}

export interface LevelRules {
  boxCapacity: number; // 3
  activeBoxes: number; // 2
  toolboxSlots: number; // 5
  toolboxMaxSlots: number; // 7
  nearMiss: { maxRemaining: number; offerSeconds: number };
}

// ---------- État de partie (normalisé) ----------

export type GameStatus = 'playing' | 'won' | 'lost';

export interface ScrewState {
  def: ScrewDef;
  tapsLeft: number;
}

export interface BoxState {
  color: ColorId;
  filled: Id[]; // ids des vis rangées
}

export interface GameState {
  level: LevelDef;
  screws: Record<Id, ScrewState>; // vis encore sur le plateau
  plates: Record<Id, PlateDef>; // plaques encore présentes
  openBoxes: BoxState[];
  nextBoxIndex: number;
  toolbox: Id[]; // FIFO
  toolboxSlots: number;
  status: GameStatus;
  rngState: number;
  moves: number;
}

// ---------- Actions & API ----------

export type Action =
  | { type: 'tap'; screwId: Id }
  | { type: 'addToolboxSlot' }
  | { type: 'clearToolbox' };

/** Événements émis pour le rendu, les sons, l'haptique et l'analytics (le moteur ne fait aucun effet de bord). */
export type GameEvent =
  | { type: 'screwTapped'; screwId: Id; tapsLeft: number }
  | { type: 'screwToBox'; screwId: Id; boxColor: ColorId }
  | { type: 'screwToToolbox'; screwId: Id }
  | { type: 'plateFell'; plateId: Id }
  | { type: 'boxCompleted'; color: ColorId }
  | { type: 'rejected'; reason: 'blocked' | 'unknown' | 'notPlaying' | 'limit' }
  | { type: 'won' }
  | { type: 'lost'; nearMiss: boolean };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export interface Engine {
  init(level: LevelDef): GameState;
  step(state: GameState, action: Action): StepResult;
  /** Undo = rejouer l'historique moins le dernier coup (déterministe). */
  replay(level: LevelDef, actions: Action[]): GameState;
}

export interface Selectors {
  isScrewBlocked(state: GameState, screwId: Id): boolean;
  tappableScrews(state: GameState): Id[];
  isNearMiss(state: GameState): boolean;
}
