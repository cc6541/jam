// Contrats du moteur Screw Jam. Voir docs/GAME-SPEC.md.
// Règles : TS pur, aucune dépendance runtime, état normalisé, données dérivées via sélecteurs.

export type Id = string;

export const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'] as const;
export type ColorId = (typeof COLORS)[number];
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
  | { type: 'joker' }; // va dans n'importe quelle boîte

export interface PlateDef {
  id: Id;
  z: number;
  polygon: Point[];
}

export interface ScrewDef {
  id: Id;
  /** Couleur affichée ; ignorée pour le rangement si `kind` est `joker`. */
  color: ColorId;
  kind: ScrewKind;
  at: Point;
  /** Plaques retenues par cette vis : unique source de vérité de la relation vis↔plaque. */
  pins: Id[];
}

export type Difficulty = 'normal' | 'hard' | 'superHard';

export interface LevelDef {
  schemaVersion: 1;
  id: Id;
  seed: number;
  difficulty: Difficulty;
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
  nearMiss: { maxRemaining: number }; // 3
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
  /** Vis sortie sans place au moment de la défaite ; replacée par `revive`. */
  overflow: Id | null;
  status: GameStatus;
  rngState: number;
  moves: number;
  revives: number;
  /** Actions jouées depuis `init` (hors `undo`), pour l'annulation par replay. */
  history: Action[];
}

// ---------- Actions & API ----------

export type Action =
  | { type: 'tap'; screwId: Id }
  | { type: 'drill'; screwId: Id }
  | { type: 'extraSlot' }
  | { type: 'undo' }
  | { type: 'revive' };

export type RejectReason = 'blocked' | 'unknown' | 'notPlaying' | 'limit' | 'nothingToUndo';

/** Événements pour le rendu, le son, l'haptique et l'analytics (le moteur ne fait aucun effet de bord). */
export type GameEvent =
  | { type: 'screwTapped'; screwId: Id; tapsLeft: number }
  | { type: 'screwToBox'; screwId: Id; boxColor: ColorId; filled: number }
  | { type: 'screwToToolbox'; screwId: Id; slot: number }
  | { type: 'toolboxToBox'; screwId: Id; boxColor: ColorId; filled: number }
  | { type: 'plateFell'; plateId: Id }
  | { type: 'boxCompleted'; color: ColorId }
  | { type: 'boxOpened'; color: ColorId }
  | { type: 'cascade'; depth: number }
  | { type: 'toolboxDanger'; free: number }
  | { type: 'slotAdded'; slots: number }
  | { type: 'undone' }
  | { type: 'revived' }
  | { type: 'rejected'; reason: RejectReason }
  | { type: 'won' }
  | { type: 'lost'; nearMiss: boolean };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export interface Engine {
  init(level: LevelDef): GameState;
  step(state: GameState, action: Action): StepResult;
  /** Rejoue une suite d'actions depuis `init` (déterministe). */
  replay(level: LevelDef, actions: Action[]): GameState;
}

export interface Selectors {
  isScrewBlocked(state: GameState, screwId: Id): boolean;
  tappableScrews(state: GameState): Id[];
  isNearMiss(state: GameState): boolean;
  /** Avancement du niveau entre 0 et 1 (jauge « Si près ! »). */
  progress(state: GameState): number;
}
