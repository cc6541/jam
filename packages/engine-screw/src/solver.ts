// Solveur et score de difficulté. Pur et déterministe : la seule source d'aléa est le seed du niveau.
import { engine, selectors } from './engine';
import { Rng } from './rng';
import type { Action, GameState, Id, LevelDef } from './types';

export interface SolveOptions {
  /** Nombre maximal d'états explorés avant d'abandonner. */
  maxNodes?: number;
  /** Parties simulées pour le taux d'échec du joueur aléatoire. */
  randomRuns?: number;
}

export interface Difficulty {
  /** 0 (trivial) à 100 (très dur). */
  score: number;
  /** Nombre de taps de la solution trouvée. */
  depth: number;
  /** États explorés reconnus perdants (sans boosters). */
  deadStates: number;
  /** Taux d'échec d'un joueur qui tape au hasard parmi les vis libres. */
  randomFailRate: number;
  /** Taux d'échec d'un joueur au hasard qui préfère les vis rangeables directement en boîte. */
  greedyFailRate: number;
}

export type SolveResult =
  | { status: 'solved'; solution: Action[]; difficulty: Difficulty; nodes: number }
  | { status: 'unsolvable' | 'aborted'; nodes: number };

/**
 * Clé d'état canonique : les vis d'une même couleur hors du plateau sont interchangeables,
 * donc toolbox, réserve et boîtes sont résumées par couleurs.
 */
export function stateKey(state: GameState): string {
  const colorOf = (id: Id) => state.level.screws.find((s) => s.id === id)?.color ?? '?';
  const board = Object.entries(state.screws)
    .map(([id, s]) => `${id}:${s.tapsLeft}`)
    .sort()
    .join(',');
  const toolbox = state.toolbox.map(colorOf).sort().join(',');
  const holding = state.holding.map(colorOf).sort().join(',');
  const boxes = state.openBoxes.map((b) => `${b.color}${b.filled.length}`).join(',');
  return `${board}|${toolbox}|${holding}|${boxes}|${state.nextBoxIndex}|${state.toolboxSlots}`;
}

function fitsBox(state: GameState, screwId: Id): boolean {
  const color = state.screws[screwId]?.def.color;
  return state.openBoxes.some((b) => b.color === color && b.filled.length < state.level.rules.boxCapacity);
}

/** Vis libres, celles qui vont directement en boîte d'abord (ordre d'exploration du solveur). */
function orderedMoves(state: GameState): Id[] {
  const free = selectors.tappableScrews(state).sort();
  return [...free.filter((id) => fitsBox(state, id)), ...free.filter((id) => !fitsBox(state, id))];
}

export function solve(level: LevelDef, options: SolveOptions = {}): SolveResult {
  const maxNodes = options.maxNodes ?? 200_000;
  const dead = new Set<string>();
  const path: Action[] = [];
  let nodes = 0;
  let aborted = false;

  const search = (state: GameState): boolean => {
    if (state.status === 'won') return true;
    if (state.status === 'lost') return false;
    const key = stateKey(state);
    if (dead.has(key)) return false;
    if (++nodes > maxNodes) {
      aborted = true;
      return false;
    }
    for (const screwId of orderedMoves(state)) {
      const action: Action = { type: 'tap', screwId };
      path.push(action);
      if (search(engine.step(state, action).state)) return true;
      path.pop();
      if (aborted) return false;
    }
    dead.add(key);
    return false;
  };

  if (!search(engine.init(level))) return { status: aborted ? 'aborted' : 'unsolvable', nodes };
  const depth = path.length;
  const runs = options.randomRuns ?? 100;
  const randomFailRate = failRate(level, runs, false);
  const greedyFailRate = failRate(level, runs, true);
  const deadness = dead.size / (dead.size + depth);
  const score = Math.round(100 * (0.5 * greedyFailRate + 0.2 * randomFailRate + 0.3 * deadness));
  return {
    status: 'solved',
    solution: [...path],
    difficulty: { score, depth, deadStates: dead.size, randomFailRate, greedyFailRate },
    nodes,
  };
}

/** Joueur aléatoire seedé : `greedy` choisit d'abord parmi les vis rangeables en boîte. */
function failRate(level: LevelDef, runs: number, greedy: boolean): number {
  const rng = new Rng(level.seed ^ (greedy ? 0x9e3779b9 : 0x85ebca6b));
  let failures = 0;
  for (let run = 0; run < runs; run++) {
    let state = engine.init(level);
    while (state.status === 'playing') {
      const moves = orderedMoves(state);
      const fitting = moves.filter((id) => fitsBox(state, id));
      const pool = greedy && fitting.length > 0 ? fitting : moves;
      if (pool.length === 0) break;
      state = engine.step(state, { type: 'tap', screwId: rng.pick(pool) }).state;
    }
    if (state.status !== 'won') failures++;
  }
  return runs === 0 ? 0 : failures / runs;
}
