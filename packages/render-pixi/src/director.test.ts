import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, engine, type LevelDef, type ScrewDef } from '@jam/engine-screw';
import { direct, rejectedTapCues, TIMING, type Cue } from './director';

const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const screw = (id: string, color: ScrewDef['color'], pins = ['base']): ScrewDef => ({
  id,
  color,
  kind: { type: 'standard' },
  at: { x: 50, y: 50 },
  pins,
});
const level: LevelDef = {
  schemaVersion: 1,
  id: 'r',
  seed: 1,
  board: { width: 100, height: 100 },
  plates: [
    { id: 'base', z: 0, polygon: square },
    { id: 'lid', z: 1, polygon: square },
  ],
  screws: [
    screw('r1', 'red', ['lid']),
    screw('r2', 'red'),
    screw('r3', 'red'),
    screw('g1', 'green', ['lid']),
    screw('g2', 'green'),
    screw('g3', 'green'),
  ],
  boxQueue: ['red', 'green'],
  rules: { ...DEFAULT_RULES, activeBoxes: 1 },
};

function cuesFor(actions: string[]): { cues: Cue[]; all: Cue[][] } {
  let state = engine.init(level);
  const all: Cue[][] = [];
  for (const id of actions) {
    const r = engine.step(state, { type: 'tap', screwId: id });
    state = r.state;
    all.push(direct(r.events, state));
  }
  return { cues: all.at(-1) ?? [], all };
}
const kinds = (cues: Cue[]) => cues.map((c) => c.kind);

describe('director', () => {
  it('tap → pulse + haptique légère, puis déplacement vers la boîte indiquée par l’événement', () => {
    const { cues } = cuesFor(['r1']);
    expect(kinds(cues)).toEqual(['pulse', 'haptic', 'move']);
    expect(cues[2]).toMatchObject({ kind: 'move', screwId: 'r1', to: { area: 'box', boxIndex: 0, slot: 0 } });
  });

  it('vis sans boîte → emplacement de toolbox lu dans l’état d’après', () => {
    const { cues } = cuesFor(['g1']);
    expect(cues.find((c) => c.kind === 'move')).toMatchObject({ to: { area: 'toolbox', slot: 0 } });
  });

  it('la plaque tombe un peu après la sortie de sa dernière vis, avec un impact moyen', () => {
    const { cues } = cuesFor(['r1', 'g1']);
    const fall = cues.find((c) => c.kind === 'plateFall');
    expect(fall).toMatchObject({ plateId: 'lid', at: TIMING.plateDelay });
    expect(cues).toContainEqual({ at: TIMING.plateDelay, kind: 'haptic', cue: { type: 'impact', strength: 'medium' } });
  });

  it('la boîte part après l’arrivée des vis, puis la toolbox se vide en cascade décalée', () => {
    const { cues } = cuesFor(['g1', 'r1', 'g2', 'r2', 'r3']);
    const swap = cues.find((c) => c.kind === 'boxSwap');
    expect(swap).toMatchObject({ boxIndex: 0, next: 'green', at: TIMING.move });
    const dispatched = cues.filter((c) => c.kind === 'move' && c.to.area === 'box' && c.at > 0);
    expect(dispatched.map((c) => c.at)).toEqual([TIMING.move + TIMING.boxSwap, TIMING.move + TIMING.boxSwap + TIMING.stagger]);
  });

  it('la victoire arrive après la dernière animation, avec une notification de succès', () => {
    const { cues } = cuesFor(['r1', 'g1', 'r2', 'r3', 'g2', 'g3']);
    const end = cues.find((c) => c.kind === 'end');
    const lastAnim = Math.max(...cues.filter((c) => c.kind === 'move' || c.kind === 'boxSwap').map((c) => c.at + ('duration' in c ? c.duration : 0)));
    expect(end).toMatchObject({ result: 'won', nearMiss: false });
    expect(end!.at).toBe(lastAnim + TIMING.end);
    expect(cues).toContainEqual({ at: end!.at, kind: 'haptic', cue: { type: 'notify', outcome: 'success' } });
  });

  it('les cues sont triées par date', () => {
    const { all } = cuesFor(['g1', 'r1', 'g2', 'r2', 'r3']);
    for (const cues of all) expect(cues.map((c) => c.at)).toEqual([...cues.map((c) => c.at)].sort((a, b) => a - b));
  });

  it('booster et défaite', () => {
    const lossLevel: LevelDef = { ...level, rules: { ...level.rules, toolboxSlots: 1 } };
    let state = engine.init(lossLevel);
    state = engine.step(state, { type: 'tap', screwId: 'r1' }).state;
    state = engine.step(state, { type: 'tap', screwId: 'g1' }).state;
    const lost = engine.step(state, { type: 'tap', screwId: 'g2' });
    expect(direct(lost.events, lost.state).find((c) => c.kind === 'end')).toMatchObject({ result: 'lost', nearMiss: false });
    const slot = engine.step(lost.state, { type: 'addToolboxSlot' });
    expect(direct(slot.events, slot.state)).toEqual([{ at: 0, kind: 'toolboxResize', slots: 2 }]);
    const s2 = engine.step(slot.state, { type: 'clearToolbox' });
    expect(direct(s2.events, s2.state)).toContainEqual({ at: 0, kind: 'move', screwId: 'g1', to: { area: 'holding', slot: 0 }, duration: TIMING.move });
  });

  it('tap refusé sur vis bloquée → secousse + avertissement ; autre refus → rien', () => {
    const s = engine.init(level);
    const blocked = engine.step(s, { type: 'tap', screwId: 'r2' });
    expect(kinds(rejectedTapCues('r2', blocked.events))).toEqual(['shake', 'haptic']);
    expect(rejectedTapCues('x', engine.step(s, { type: 'tap', screwId: 'x' }).events)).toEqual([]);
  });
});
