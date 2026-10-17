// Tests écrits depuis docs/GAME-SPEC.md, avant l'implémentation (phase 2).
// Chaque `describe` cite la règle [Rn] qu'il couvre.
import { describe, expect, it } from 'vitest';
import { engine, selectors } from './engine';
import { DEFAULT_RULES } from './rules';
import type { Action, ColorId, GameEvent, GameState, LevelDef, LevelRules, PlateDef, Point, ScrewDef } from './types';

// ---------- Fixtures ----------

const square = (x: number, y: number, size: number): Point[] => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];

const BASE: PlateDef = { id: 'base', z: 0, polygon: square(0, 0, 100) };

const screw = (id: string, color: ColorId, extra: Partial<ScrewDef> = {}): ScrewDef => ({
  id,
  color,
  kind: { type: 'standard' },
  at: { x: 50, y: 50 },
  pins: ['base'],
  ...extra,
});

const level = (opts: {
  screws: ScrewDef[];
  boxQueue: ColorId[];
  plates?: PlateDef[];
  rules?: Partial<LevelRules>;
}): LevelDef => ({
  schemaVersion: 1,
  id: 'test',
  seed: 7,
  board: { width: 100, height: 100 },
  plates: opts.plates ?? [BASE],
  screws: opts.screws,
  boxQueue: opts.boxQueue,
  rules: { ...DEFAULT_RULES, ...opts.rules },
});

const reds = ['r1', 'r2', 'r3'].map((id) => screw(id, 'red'));
const blues = ['b1', 'b2', 'b3'].map((id) => screw(id, 'blue'));
const greens = ['g1', 'g2', 'g3'].map((id) => screw(id, 'green'));
const yellows = ['y1', 'y2', 'y3'].map((id) => screw(id, 'yellow'));

const tap = (screwId: string): Action => ({ type: 'tap', screwId });

/** Applique les actions dans l'ordre et cumule les événements. */
function play(def: LevelDef, actions: (Action | string)[]): { state: GameState; events: GameEvent[] } {
  let state = engine.init(def);
  const events: GameEvent[] = [];
  for (const a of actions) {
    const result = engine.step(state, typeof a === 'string' ? tap(a) : a);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

const byType = <K extends GameEvent['type']>(events: GameEvent[], ...types: K[]) =>
  events.filter((e): e is Extract<GameEvent, { type: K }> => (types as string[]).includes(e.type));

// ---------- Règles ----------

describe('[R1] vis bloquée (sélecteur dérivé)', () => {
  const plates: PlateDef[] = [
    { id: 'low', z: 0, polygon: square(0, 0, 10) },
    { id: 'high', z: 2, polygon: square(5, 5, 10) },
    { id: 'same', z: 0, polygon: square(0, 0, 4) },
  ];
  const def = level({
    plates,
    boxQueue: ['red', 'blue'],
    screws: [
      screw('under', 'red', { at: { x: 7, y: 7 }, pins: ['low'] }),
      screw('edge', 'red', { at: { x: 5, y: 2 }, pins: ['low'] }), // hors de `high`
      screw('onEdge', 'red', { at: { x: 5, y: 8 }, pins: ['low'] }), // sur le bord gauche de `high`
      screw('own', 'blue', { at: { x: 8, y: 8 }, pins: ['low', 'high'] }),
      screw('top', 'blue', { at: { x: 14, y: 14 }, pins: ['high'] }),
      screw('sameZ', 'blue', { at: { x: 2, y: 2 }, pins: ['same'] }), // aussi sous `low`, de même z
    ],
  });

  it('est bloquée sous une plaque plus haute qui recouvre son point', () => {
    const s = engine.init(def);
    expect(selectors.isScrewBlocked(s, 'under')).toBe(true);
    expect(selectors.isScrewBlocked(s, 'edge')).toBe(false);
  });

  it('est bloquée si le point est sur le bord de la plaque plus haute', () => {
    expect(selectors.isScrewBlocked(engine.init(def), 'onEdge')).toBe(true);
  });

  it('n’est pas bloquée par une plaque qu’elle retient elle-même, ni par une plaque de même z', () => {
    const s = engine.init(def);
    expect(selectors.isScrewBlocked(s, 'own')).toBe(false);
    expect(selectors.isScrewBlocked(s, 'top')).toBe(false);
    expect(selectors.isScrewBlocked(s, 'sameZ')).toBe(false);
  });

  it('se débloque quand la plaque du dessus tombe', () => {
    const { state } = play(def, ['own', 'top']);
    expect(state.plates['high']).toBeUndefined();
    expect(selectors.isScrewBlocked(state, 'under')).toBe(false);
  });

  it('tappableScrews liste les vis présentes non bloquées', () => {
    expect([...selectors.tappableScrews(engine.init(def))].sort()).toEqual(['edge', 'own', 'sameZ', 'top']);
  });

  it('n’est jamais stocké dans l’état', () => {
    expect(JSON.stringify(engine.init(def))).not.toMatch(/blocked/i);
  });
});

describe('[R2] initialisation', () => {
  it('pose toutes les vis et plaques, ouvre les premières boîtes, vide toolbox et réserve', () => {
    const multi = screw('m1', 'red', { kind: { type: 'multiTap', taps: 3 } });
    const def = level({ screws: [multi, ...reds.slice(1), ...blues], boxQueue: ['red', 'blue', 'green'] });
    const s = engine.init(def);
    expect(Object.keys(s.screws).sort()).toEqual(['b1', 'b2', 'b3', 'm1', 'r2', 'r3']);
    expect(s.screws['m1']!.tapsLeft).toBe(3);
    expect(s.screws['r2']!.tapsLeft).toBe(1);
    expect(Object.keys(s.plates)).toEqual(['base']);
    expect(s.openBoxes).toEqual([
      { color: 'red', filled: [] },
      { color: 'blue', filled: [] },
    ]);
    expect(s.nextBoxIndex).toBe(2);
    expect(s.toolbox).toEqual([]);
    expect(s.holding).toEqual([]);
    expect(s.toolboxSlots).toBe(5);
    expect(s.moves).toBe(0);
    expect(s.status).toBe('playing');
  });

  it('respecte rules.activeBoxes et une file plus courte', () => {
    const def = level({ screws: reds, boxQueue: ['red'], rules: { activeBoxes: 3, toolboxSlots: 6 } });
    const s = engine.init(def);
    expect(s.openBoxes).toEqual([{ color: 'red', filled: [] }]);
    expect(s.nextBoxIndex).toBe(1);
    expect(s.toolboxSlots).toBe(6);
  });
});

describe('[R3] action refusée', () => {
  const def = level({
    plates: [BASE, { id: 'lid', z: 1, polygon: square(40, 40, 20) }],
    screws: [...reds, screw('b1', 'blue', { pins: ['lid'] }), ...blues.slice(1)],
    boxQueue: ['red', 'blue'],
  });

  it('vis inconnue : refus `unknown`, même objet état', () => {
    const s = engine.init(def);
    const r = engine.step(s, tap('nope'));
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: 'rejected', reason: 'unknown' }]);
  });

  it('vis bloquée : refus `blocked`, même objet état', () => {
    const s = engine.init(def);
    const r = engine.step(s, tap('r1'));
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: 'rejected', reason: 'blocked' }]);
  });

  it('vis déjà sortie : refus `unknown`', () => {
    const { state } = play(def, ['b1']);
    expect(engine.step(state, tap('b1')).events).toEqual([{ type: 'rejected', reason: 'unknown' }]);
  });

  it('partie gagnée ou perdue : refus `notPlaying`', () => {
    const won = play(level({ screws: reds, boxQueue: ['red'] }), ['r1', 'r2', 'r3']).state;
    expect(won.status).toBe('won');
    const lost = play(level({ screws: [...reds, ...yellows], boxQueue: ['red'], rules: { toolboxSlots: 1 } }), [
      'y1',
      'y2',
    ]).state;
    expect(lost.status).toBe('lost');
    for (const s of [won, lost]) {
      const r = engine.step(s, tap('y3'));
      expect(r.state).toBe(s);
      expect(r.events).toEqual([{ type: 'rejected', reason: 'notPlaying' }]);
    }
  });
});

describe('[R4] tap accepté et vis multiTap', () => {
  const multi = screw('m1', 'red', { kind: { type: 'multiTap', taps: 3 } });
  const def = level({ screws: [multi, ...reds.slice(1)], boxQueue: ['red'] });

  it('décrémente tapsLeft et laisse la vis en place tant que tapsLeft > 0', () => {
    const first = engine.step(engine.init(def), tap('m1'));
    expect(first.events).toEqual([{ type: 'screwTapped', screwId: 'm1', tapsLeft: 2 }]);
    expect(first.state.screws['m1']!.tapsLeft).toBe(2);
    expect(first.state.moves).toBe(1);
    const second = engine.step(first.state, tap('m1'));
    expect(second.state.screws['m1']!.tapsLeft).toBe(1);
    expect(second.state.moves).toBe(2);
  });

  it('sort au dernier tap', () => {
    const { state, events } = play(def, ['m1', 'm1', 'm1']);
    expect(state.screws['m1']).toBeUndefined();
    expect(state.moves).toBe(3);
    expect(events).toContainEqual({ type: 'screwTapped', screwId: 'm1', tapsLeft: 0 });
    expect(events).toContainEqual({ type: 'screwToBox', screwId: 'm1', boxColor: 'red', boxIndex: 0, slot: 0, from: 'board' });
  });

  it('une vis standard sort au premier tap', () => {
    const r = engine.step(engine.init(def), tap('r2'));
    expect(r.events[0]).toEqual({ type: 'screwTapped', screwId: 'r2', tapsLeft: 0 });
    expect(r.state.screws['r2']).toBeUndefined();
    expect(r.state.moves).toBe(1);
  });
});

describe('[R5] destination de la vis sortie', () => {
  it('va dans la boîte ouverte de sa couleur, même si elle n’est pas la première', () => {
    const { state, events } = play(level({ screws: [...blues, ...reds], boxQueue: ['blue', 'red'] }), ['r1']);
    expect(state.openBoxes).toEqual([
      { color: 'blue', filled: [] },
      { color: 'red', filled: ['r1'] },
    ]);
    expect(events).toEqual([
      { type: 'screwTapped', screwId: 'r1', tapsLeft: 0 },
      { type: 'screwToBox', screwId: 'r1', boxColor: 'red', boxIndex: 1, slot: 0, from: 'board' },
    ]);
  });

  it('remplit la première de deux boîtes ouvertes de la même couleur', () => {
    const six = [...reds, ...['r4', 'r5', 'r6'].map((id) => screw(id, 'red'))];
    const { state } = play(level({ screws: six, boxQueue: ['red', 'red'] }), ['r1', 'r2']);
    expect(state.openBoxes).toEqual([
      { color: 'red', filled: ['r1', 'r2'] },
      { color: 'red', filled: [] },
    ]);
  });

  it('va à la fin de la toolbox si aucune boîte ouverte ne lui correspond', () => {
    const def = level({ screws: [...reds, ...blues, ...greens], boxQueue: ['red', 'blue', 'green'] });
    const { state, events } = play(def, ['g2', 'g1']);
    expect(state.toolbox).toEqual(['g2', 'g1']);
    expect(byType(events, 'screwToToolbox')).toEqual([
      { type: 'screwToToolbox', screwId: 'g2' },
      { type: 'screwToToolbox', screwId: 'g1' },
    ]);
  });
});

describe('[R6] défaite toolbox pleine', () => {
  const def = level({ screws: [...reds, ...yellows], boxQueue: ['red', 'yellow'], rules: { activeBoxes: 1, toolboxSlots: 2 } });

  it('perd quand la vis sortie ne trouve ni boîte ni place en toolbox', () => {
    const before = play(def, ['y1', 'y2']).state;
    expect(before.status).toBe('playing');
    const r = engine.step(before, tap('y3'));
    expect(r.state.status).toBe('lost');
    expect(r.events).toEqual([
      { type: 'screwTapped', screwId: 'y3', tapsLeft: 0 },
      { type: 'lost', nearMiss: false },
    ]);
  });

  it('laisse la vis sur le plateau (tapsLeft = 0) sans rien changer d’autre', () => {
    const before = play(def, ['y1', 'y2']).state;
    const after = engine.step(before, tap('y3')).state;
    expect(after.screws['y3']).toEqual({ def: before.screws['y3']!.def, tapsLeft: 0 });
    expect(after.toolbox).toEqual(['y1', 'y2']);
    expect(after.openBoxes).toEqual(before.openBoxes);
    expect(after.plates).toEqual(before.plates);
    expect(after.moves).toBe(3);
  });
});

describe('[R7] résolution en cascade', () => {
  it('une plaque tombe quand plus aucune vis du plateau ne la retient', () => {
    const def = level({
      plates: [BASE, { id: 'p', z: 1, polygon: square(0, 0, 10) }],
      screws: [screw('r1', 'red', { pins: ['p'] }), screw('r2', 'red', { pins: ['p'] }), screw('r3', 'red')],
      boxQueue: ['red'],
    });
    const one = play(def, ['r1']);
    expect(one.state.plates['p']).toBeDefined();
    expect(byType(one.events, 'plateFell')).toEqual([]);
    const two = play(def, ['r1', 'r2']);
    expect(two.state.plates['p']).toBeUndefined();
    expect(byType(two.events, 'plateFell')).toEqual([{ type: 'plateFell', plateId: 'p' }]);
  });

  it('une vis rangée en toolbox ne retient plus sa plaque', () => {
    const def = level({
      plates: [BASE, { id: 'p', z: 1, polygon: square(0, 0, 10) }],
      screws: [...reds, screw('g1', 'green', { pins: ['p'] }), ...greens.slice(1)],
      boxQueue: ['red', 'green'],
      rules: { activeBoxes: 1 },
    });
    const { state, events } = play(def, ['g1']);
    expect(state.toolbox).toEqual(['g1']);
    expect(byType(events, 'plateFell')).toEqual([{ type: 'plateFell', plateId: 'p' }]);
  });

  it('une boîte pleine part et la suivante prend sa place', () => {
    const def = level({ screws: [...reds, ...blues, ...greens], boxQueue: ['red', 'blue', 'green'] });
    const { state, events } = play(def, ['r1', 'r2', 'r3']);
    expect(byType(events, 'boxCompleted')).toEqual([{ type: 'boxCompleted', color: 'red', boxIndex: 0, next: 'green' }]);
    expect(state.openBoxes).toEqual([
      { color: 'green', filled: [] },
      { color: 'blue', filled: [] },
    ]);
    expect(state.nextBoxIndex).toBe(3);
  });

  it('l’emplacement disparaît quand la file est épuisée', () => {
    const { state } = play(level({ screws: [...reds, ...blues], boxQueue: ['red', 'blue'] }), ['r1', 'r2', 'r3']);
    expect(state.openBoxes).toEqual([{ color: 'blue', filled: [] }]);
  });

  it('les vis de la toolbox rejoignent une boîte qui s’ouvre, dans l’ordre FIFO', () => {
    const def = level({
      screws: [...reds, ...blues, ...greens, ...yellows],
      boxQueue: ['red', 'blue', 'green', 'yellow'],
    });
    const { state, events } = play(def, ['g2', 'y1', 'g1', 'r1', 'r2', 'r3']);
    expect(state.toolbox).toEqual(['y1']);
    expect(state.openBoxes[0]).toEqual({ color: 'green', filled: ['g2', 'g1'] });
    expect(byType(events, 'screwToBox').filter((e) => e.from === 'toolbox')).toEqual([
      { type: 'screwToBox', screwId: 'g2', boxColor: 'green', boxIndex: 0, slot: 0, from: 'toolbox' },
      { type: 'screwToBox', screwId: 'g1', boxColor: 'green', boxIndex: 0, slot: 1, from: 'toolbox' },
    ]);
  });

  it('enchaîne jusqu’à stabilité (boîte complétée par la toolbox, qui en ouvre une autre)', () => {
    const def = level({
      screws: [...reds, ...greens, ...yellows],
      boxQueue: ['red', 'green', 'yellow'],
      rules: { activeBoxes: 1 },
    });
    const { state, events } = play(def, ['g1', 'g2', 'g3', 'y1', 'r1', 'r2', 'r3']);
    expect(state.toolbox).toEqual([]);
    expect(state.openBoxes).toEqual([{ color: 'yellow', filled: ['y1'] }]);
    expect(byType(events, 'boxCompleted', 'screwToBox').filter((e) => e.type === 'boxCompleted' || e.from === 'toolbox'))
      .toEqual([
        { type: 'boxCompleted', color: 'red', boxIndex: 0, next: 'green' },
        { type: 'screwToBox', screwId: 'g1', boxColor: 'green', boxIndex: 0, slot: 0, from: 'toolbox' },
        { type: 'screwToBox', screwId: 'g2', boxColor: 'green', boxIndex: 0, slot: 1, from: 'toolbox' },
        { type: 'screwToBox', screwId: 'g3', boxColor: 'green', boxIndex: 0, slot: 2, from: 'toolbox' },
        { type: 'boxCompleted', color: 'green', boxIndex: 0, next: 'yellow' },
        { type: 'screwToBox', screwId: 'y1', boxColor: 'yellow', boxIndex: 0, slot: 0, from: 'toolbox' },
      ]);
  });
});

describe('[R8] victoire', () => {
  const def = level({ screws: [...reds, ...blues], boxQueue: ['red', 'blue'] });

  it('gagne quand plus aucune vis ni plaque ne reste', () => {
    const before = play(def, ['r1', 'b1', 'r2', 'b2', 'r3']);
    expect(before.state.status).toBe('playing');
    const { state, events } = play(def, ['r1', 'b1', 'r2', 'b2', 'r3', 'b3']);
    expect(state.status).toBe('won');
    expect(state.screws).toEqual({});
    expect(state.plates).toEqual({});
    expect(events.at(-1)).toEqual({ type: 'won' });
    expect(byType(events, 'won')).toHaveLength(1);
  });
});

describe('[R9] near miss', () => {
  const def = (toolboxMaxSlots = 7) =>
    level({
      screws: [...reds, ...yellows],
      boxQueue: ['red', 'yellow'],
      rules: { activeBoxes: 1, toolboxSlots: 2, toolboxMaxSlots },
    });

  it('vrai à la défaite avec au plus maxRemaining (3) vis restantes', () => {
    const { state, events } = play(def(), ['r1', 'y1', 'y2', 'y3']);
    expect(state.status).toBe('lost');
    expect(Object.keys(state.screws)).toHaveLength(3);
    expect(selectors.isNearMiss(state)).toBe(true);
    expect(byType(events, 'lost')).toEqual([{ type: 'lost', nearMiss: true }]);
  });

  it('faux avec plus de maxRemaining vis restantes', () => {
    const { state, events } = play(def(), ['y1', 'y2', 'y3']);
    expect(state.status).toBe('lost');
    expect(Object.keys(state.screws)).toHaveLength(4);
    expect(selectors.isNearMiss(state)).toBe(false);
    expect(byType(events, 'lost')).toEqual([{ type: 'lost', nearMiss: false }]);
  });

  it('faux en cours de partie', () => {
    expect(selectors.isNearMiss(play(def(), ['r1', 'r2', 'y1']).state)).toBe(false);
  });

  it('faux si la toolbox est déjà au maximum', () => {
    const { state, events } = play(def(2), ['r1', 'y1', 'y2', 'y3']);
    expect(state.status).toBe('lost');
    expect(selectors.isNearMiss(state)).toBe(false);
    expect(byType(events, 'lost')).toEqual([{ type: 'lost', nearMiss: false }]);
  });
});

describe('[R10] booster addToolboxSlot', () => {
  const def = level({
    screws: [...reds, ...yellows],
    boxQueue: ['red', 'yellow'],
    rules: { activeBoxes: 1, toolboxSlots: 2, toolboxMaxSlots: 3 },
  });

  it('ajoute un emplacement sans compter de coup', () => {
    const r = engine.step(engine.init(def), { type: 'addToolboxSlot' });
    expect(r.state.toolboxSlots).toBe(3);
    expect(r.state.moves).toBe(0);
    expect(r.events).toEqual([{ type: 'toolboxSlotAdded', slots: 3 }]);
  });

  it('refuse au maximum (`limit`)', () => {
    const s = play(def, [{ type: 'addToolboxSlot' }]).state;
    const r = engine.step(s, { type: 'addToolboxSlot' });
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: 'rejected', reason: 'limit' }]);
  });

  it('sur une partie perdue, c’est la seconde chance : la partie reprend', () => {
    const lost = play(def, ['r1', 'y1', 'y2', 'y3']).state;
    expect(lost.status).toBe('lost');
    const revived = engine.step(lost, { type: 'addToolboxSlot' }).state;
    expect(revived.status).toBe('playing');
    expect(revived.toolboxSlots).toBe(3);
    const after = engine.step(revived, tap('y3'));
    expect(after.events).toEqual([
      { type: 'screwTapped', screwId: 'y3', tapsLeft: 0 },
      { type: 'screwToToolbox', screwId: 'y3' },
    ]);
    expect(after.state.toolbox).toEqual(['y1', 'y2', 'y3']);
  });

  it('refuse sur une partie gagnée (`notPlaying`)', () => {
    const won = play(level({ screws: reds, boxQueue: ['red'] }), ['r1', 'r2', 'r3']).state;
    expect(engine.step(won, { type: 'addToolboxSlot' }).events).toEqual([{ type: 'rejected', reason: 'notPlaying' }]);
  });
});

describe('[R11] booster clearToolbox', () => {
  const def = level({
    screws: [...reds, ...greens, ...yellows],
    boxQueue: ['red', 'green', 'yellow'],
    rules: { activeBoxes: 1 },
  });

  it('vide la toolbox dans la réserve, ordre conservé', () => {
    const before = play(def, ['g1', 'y1']).state;
    const r = engine.step(before, { type: 'clearToolbox' });
    expect(r.state.toolbox).toEqual([]);
    expect(r.state.holding).toEqual(['g1', 'y1']);
    expect(r.state.moves).toBe(before.moves);
    expect(r.events).toEqual([{ type: 'toolboxCleared', screwIds: ['g1', 'y1'] }]);
  });

  it('la réserve est servie avant la toolbox', () => {
    const { state, events } = play(def, ['g1', { type: 'clearToolbox' }, 'g2', 'r1', 'r2', 'r3']);
    expect(state.holding).toEqual([]);
    expect(state.toolbox).toEqual([]);
    expect(state.openBoxes).toEqual([{ color: 'green', filled: ['g1', 'g2'] }]);
    expect(byType(events, 'screwToBox').filter((e) => e.from !== 'board')).toEqual([
      { type: 'screwToBox', screwId: 'g1', boxColor: 'green', boxIndex: 0, slot: 0, from: 'holding' },
      { type: 'screwToBox', screwId: 'g2', boxColor: 'green', boxIndex: 0, slot: 1, from: 'toolbox' },
    ]);
  });

  it('refuse si la toolbox est vide (`limit`) ou hors partie (`notPlaying`)', () => {
    const s = engine.init(def);
    const r = engine.step(s, { type: 'clearToolbox' });
    expect(r.state).toBe(s);
    expect(r.events).toEqual([{ type: 'rejected', reason: 'limit' }]);
    const lostLevel = level({
      screws: [...reds, ...yellows],
      boxQueue: ['red', 'yellow'],
      rules: { activeBoxes: 1, toolboxSlots: 1 },
    });
    const lost = play(lostLevel, ['y1', 'y2']).state;
    expect(lost.status).toBe('lost');
    expect(engine.step(lost, { type: 'clearToolbox' }).events).toEqual([{ type: 'rejected', reason: 'notPlaying' }]);
  });
});

describe('[R12] undo par replay', () => {
  const def = level({ screws: [...reds, ...greens, ...yellows], boxQueue: ['red', 'green', 'yellow'], rules: { activeBoxes: 1 } });
  const actions: Action[] = [tap('g1'), tap('r1'), { type: 'clearToolbox' }, tap('y1'), { type: 'addToolboxSlot' }, tap('r2')];

  it('replay donne le même état que la suite de step', () => {
    expect(engine.replay(def, actions)).toEqual(play(def, actions).state);
  });

  it('replay sans action donne l’état initial', () => {
    expect(engine.replay(def, [])).toEqual(engine.init(def));
  });

  it('undo = rejouer l’historique moins le dernier coup', () => {
    const beforeLast = play(def, actions.slice(0, -1)).state;
    expect(engine.replay(def, actions.slice(0, -1))).toEqual(beforeLast);
  });

  it('les actions refusées de l’historique sont sans effet', () => {
    const withRejected = [tap('nope'), ...actions, tap('r2')];
    expect(engine.replay(def, withRejected)).toEqual(engine.replay(def, actions));
  });
});

describe('[R13] déterminisme et pureté', () => {
  const def = level({ screws: [...reds, ...greens, ...yellows], boxQueue: ['red', 'green', 'yellow'], rules: { activeBoxes: 1 } });
  const actions: (Action | string)[] = ['g1', 'r1', 'y1', { type: 'clearToolbox' }, 'r2', 'r3', 'g2'];

  it('mêmes entrées → mêmes états et événements', () => {
    expect(play(def, actions)).toEqual(play(def, actions));
    expect(engine.init(def)).toEqual(engine.init(def));
  });

  it('ne modifie ni le niveau ni l’état reçu', () => {
    const frozenLevel = deepFreeze(structuredClone(def));
    let state = deepFreeze(engine.init(frozenLevel));
    for (const a of actions) {
      const snapshot = structuredClone(state);
      const next = engine.step(state, typeof a === 'string' ? tap(a) : a).state;
      expect(state).toEqual(snapshot);
      state = deepFreeze(next);
    }
    expect(frozenLevel).toEqual(def);
  });

  it('l’état est sérialisable en JSON sans perte', () => {
    const { state } = play(def, actions);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
