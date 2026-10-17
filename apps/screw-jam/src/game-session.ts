// Pilote une partie : moteur + vue. Toute règle de jeu reste dans le moteur ; ici, seulement l'historique
// (pour l'undo par replay) et l'enchaînement état → animation.
import { engine, type Action, type GameState, type Id, type LevelDef, type StepResult } from '@jam/engine-screw';

export interface BoardPort {
  load(state: GameState, viewport: { width: number; height: number }): void;
  apply(result: StepResult, tapped?: Id): void;
}

export class GameSession {
  state: GameState;
  private history: Action[] = [];

  constructor(
    readonly level: LevelDef,
    private readonly board: BoardPort,
    private readonly viewport: () => { width: number; height: number },
  ) {
    this.state = engine.init(level);
    board.load(this.state, viewport());
  }

  get canUndo(): boolean {
    return this.state.status === 'playing' && this.history.length > 0;
  }

  tap(screwId: Id): StepResult {
    return this.run({ type: 'tap', screwId }, screwId);
  }

  addToolboxSlot(): StepResult {
    return this.run({ type: 'addToolboxSlot' });
  }

  clearToolbox(): StepResult {
    return this.run({ type: 'clearToolbox' });
  }

  /** Undo = rejouer l'historique moins le dernier coup ([R12]). */
  undo(): boolean {
    if (!this.canUndo) return false;
    this.history.pop();
    this.state = engine.replay(this.level, this.history);
    this.board.load(this.state, this.viewport());
    return true;
  }

  private run(action: Action, tapped?: Id): StepResult {
    const result = engine.step(this.state, action);
    if (result.state !== this.state) {
      this.history.push(action);
      this.state = result.state;
    }
    this.board.apply(result, tapped);
    return result;
  }
}
