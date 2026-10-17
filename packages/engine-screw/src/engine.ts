// Réducteur pur de Screw Jam. Règles [Rn] : docs/GAME-SPEC.md.
import { polygonCovers } from './geometry';
import type {
  Action,
  BoxState,
  ColorId,
  Engine,
  GameEvent,
  GameState,
  Id,
  LevelDef,
  ScrewSource,
  Selectors,
  StepResult,
} from './types';

type RejectReason = Extract<GameEvent, { type: 'rejected' }>['reason'];

export const selectors: Selectors = {
  // [R1]
  isScrewBlocked(state, screwId) {
    const screw = state.screws[screwId];
    if (!screw) return false;
    let pinnedZ = -Infinity;
    for (const id of screw.def.pins) pinnedZ = Math.max(pinnedZ, state.plates[id]?.z ?? -Infinity);
    return Object.values(state.plates).some((p) => p.z > pinnedZ && polygonCovers(p.polygon, screw.def.at));
  },
  tappableScrews(state) {
    return Object.keys(state.screws).filter((id) => !selectors.isScrewBlocked(state, id));
  },
  // [R9]
  isNearMiss(state) {
    const { rules } = state.level;
    return (
      state.status === 'lost' &&
      Object.keys(state.screws).length <= rules.nearMiss.maxRemaining &&
      state.toolboxSlots < rules.toolboxMaxSlots
    );
  },
};

function without<T>(record: Record<Id, T>, id: Id): Record<Id, T> {
  const { [id]: _removed, ...rest } = record;
  return rest;
}

const reject = (state: GameState, reason: RejectReason): StepResult => ({
  state,
  events: [{ type: 'rejected', reason }],
});

/** Copie modifiable : les tableaux et objets mutés par `step` sont recopiés, le niveau est partagé. */
function draft(state: GameState): GameState {
  return {
    ...state,
    screws: Object.fromEntries(Object.entries(state.screws).map(([id, s]) => [id, { ...s }])),
    plates: { ...state.plates },
    openBoxes: state.openBoxes.map((b) => ({ color: b.color, filled: [...b.filled] })),
    toolbox: [...state.toolbox],
    holding: [...state.holding],
  };
}

/** Range la vis dans la première boîte ouverte de sa couleur qui a de la place ([R5], [R7]). */
function putInBox(state: GameState, screwId: Id, color: ColorId, from: ScrewSource): GameEvent | undefined {
  const boxIndex = state.openBoxes.findIndex(
    (b) => b.color === color && b.filled.length < state.level.rules.boxCapacity,
  );
  const box = state.openBoxes[boxIndex];
  if (!box) return undefined;
  box.filled.push(screwId);
  return { type: 'screwToBox', screwId, boxColor: color, boxIndex, slot: box.filled.length - 1, from };
}

function colorOf(state: GameState, screwId: Id): ColorId {
  const def = state.level.screws.find((s) => s.id === screwId);
  if (!def) throw new Error(`vis inconnue : ${screwId}`);
  return def.color;
}

// [R7] puis [R8]
function cascade(s: GameState, events: GameEvent[]): void {
  for (let changed = true; changed; ) {
    changed = false;

    const pinned = new Set(Object.values(s.screws).flatMap((screw) => screw.def.pins));
    for (const id of Object.keys(s.plates)) {
      if (pinned.has(id)) continue;
      s.plates = without(s.plates, id);
      events.push({ type: 'plateFell', plateId: id });
      changed = true;
    }

    const boxes: BoxState[] = [];
    for (const box of s.openBoxes) {
      if (box.filled.length < s.level.rules.boxCapacity) {
        boxes.push(box);
        continue;
      }
      const next = s.level.boxQueue[s.nextBoxIndex] ?? null;
      events.push({ type: 'boxCompleted', color: box.color, boxIndex: boxes.length, next });
      changed = true;
      if (next) {
        boxes.push({ color: next, filled: [] }); // [R7] même place
        s.nextBoxIndex++;
      }
    }
    s.openBoxes = boxes;

    for (const from of ['holding', 'toolbox'] as const) {
      const kept: Id[] = [];
      for (const id of s[from]) {
        const event = putInBox(s, id, colorOf(s, id), from);
        if (!event) {
          kept.push(id);
          continue;
        }
        events.push(event);
        changed = true;
      }
      s[from] = kept;
    }
  }

  if (Object.keys(s.screws).length === 0 && Object.keys(s.plates).length === 0) {
    s.status = 'won';
    events.push({ type: 'won' });
  }
}

function tap(state: GameState, screwId: Id): StepResult {
  // [R3]
  const s = draft(state);
  const screw = s.screws[screwId];
  if (!screw) return reject(state, 'unknown');
  if (selectors.isScrewBlocked(state, screwId)) return reject(state, 'blocked');

  const events: GameEvent[] = [];

  // [R4]
  screw.tapsLeft = Math.max(0, screw.tapsLeft - 1);
  s.moves++;
  events.push({ type: 'screwTapped', screwId, tapsLeft: screw.tapsLeft });
  if (screw.tapsLeft > 0) return { state: s, events };

  // [R5] / [R6]
  const { color } = screw.def;
  const boxed = putInBox(s, screwId, color, 'board');
  if (boxed) {
    events.push(boxed);
  } else if (s.toolbox.length < s.toolboxSlots) {
    s.toolbox.push(screwId);
    events.push({ type: 'screwToToolbox', screwId });
  } else {
    s.status = 'lost';
    events.push({ type: 'lost', nearMiss: selectors.isNearMiss(s) });
    return { state: s, events };
  }
  s.screws = without(s.screws, screwId);
  cascade(s, events);
  return { state: s, events };
}

// [R10]
function addToolboxSlot(state: GameState): StepResult {
  if (state.status === 'won') return reject(state, 'notPlaying');
  if (state.toolboxSlots >= state.level.rules.toolboxMaxSlots) return reject(state, 'limit');
  const slots = state.toolboxSlots + 1;
  return { state: { ...state, toolboxSlots: slots, status: 'playing' }, events: [{ type: 'toolboxSlotAdded', slots }] };
}

// [R11]
function clearToolbox(state: GameState): StepResult {
  if (state.toolbox.length === 0) return reject(state, 'limit');
  const s = draft(state);
  const events: GameEvent[] = [{ type: 'toolboxCleared', screwIds: [...s.toolbox] }];
  s.holding.push(...s.toolbox);
  s.toolbox = [];
  cascade(s, events);
  return { state: s, events };
}

export const engine: Engine = {
  // [R2]
  init(level: LevelDef): GameState {
    const open = Math.min(level.rules.activeBoxes, level.boxQueue.length);
    return {
      level,
      screws: Object.fromEntries(
        level.screws.map((def) => [def.id, { def, tapsLeft: def.kind.type === 'multiTap' ? def.kind.taps : 1 }]),
      ),
      plates: Object.fromEntries(level.plates.map((p) => [p.id, p])),
      openBoxes: level.boxQueue.slice(0, open).map((color) => ({ color, filled: [] })),
      nextBoxIndex: open,
      toolbox: [],
      holding: [],
      toolboxSlots: level.rules.toolboxSlots,
      status: 'playing',
      rngState: level.seed,
      moves: 0,
    };
  },

  step(state: GameState, action: Action): StepResult {
    if (action.type === 'addToolboxSlot') return addToolboxSlot(state);
    if (state.status !== 'playing') return reject(state, 'notPlaying');
    return action.type === 'tap' ? tap(state, action.screwId) : clearToolbox(state);
  },

  // [R12]
  replay(level: LevelDef, actions: Action[]): GameState {
    return actions.reduce((state, action) => engine.step(state, action).state, engine.init(level));
  },
};
