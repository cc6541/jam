import { describe, expect, it } from 'vitest';
import { engine } from './engine';
import { generateLevel } from './generator';
import { DEFAULT_RULES } from './rules';
import { Rng } from './rng';
import { solve, stateKey } from './solver';
import type { ColorId, LevelDef, ScrewDef } from './types';

const screw = (id: string, color: ColorId, pins = ['base']): ScrewDef => ({
  id,
  color,
  kind: { type: 'standard' },
  at: { x: 50, y: 50 },
  pins,
});
const square = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const level = (screws: ScrewDef[], boxQueue: ColorId[], toolboxSlots = 5): LevelDef => ({
  schemaVersion: 1,
  id: 't',
  seed: 3,
  board: { width: 100, height: 100 },
  plates: [{ id: 'base', z: 0, polygon: square }],
  screws,
  boxQueue,
  rules: { ...DEFAULT_RULES, activeBoxes: 1, toolboxSlots },
});
const trio = (c: ColorId, p: string) => [1, 2, 3].map((i) => screw(`${p}${i}`, c));

describe('Rng', () => {
  it('est déterministe et borné', () => {
    const a = new Rng(1);
    const b = new Rng(1);
    const xs = Array.from({ length: 50 }, () => a.next());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b.next()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    const r = new Rng(9);
    for (let i = 0; i < 50; i++) expect(r.int(2, 4)).toBeGreaterThanOrEqual(2);
    expect(new Rng(5).shuffle([1, 2, 3, 4]).sort()).toEqual([1, 2, 3, 4]);
    expect(() => new Rng(1).pick([])).toThrow();
  });
});

describe('solve', () => {
  it('trouve une solution rejouable jusqu’à la victoire', () => {
    const def = level([...trio('red', 'r'), ...trio('blue', 'b')], ['red', 'blue']);
    const r = solve(def);
    expect(r.status).toBe('solved');
    if (r.status !== 'solved') return;
    expect(engine.replay(def, r.solution).status).toBe('won');
    expect(r.difficulty.depth).toBe(6);
    expect(r.difficulty.score).toBeGreaterThanOrEqual(0);
    expect(r.difficulty.score).toBeLessThanOrEqual(100);
  });

  it('déclare insoluble un niveau impossible', () => {
    // Le bleu attend sous une plaque que seules des vis bleues retiennent... sans toolbox suffisante.
    const lid = { id: 'lid', z: 1, polygon: square };
    const def: LevelDef = {
      ...level([...trio('red', 'r'), ...[1, 2, 3].map((i) => screw(`b${i}`, 'blue', ['lid']))], ['red', 'blue'], 2),
      plates: [{ id: 'base', z: 0, polygon: square }, lid],
    };
    expect(solve(def).status).toBe('unsolvable');
  });

  it('abandonne au-delà du budget de nœuds', () => {
    const def = level([...trio('red', 'r'), ...trio('blue', 'b')], ['red', 'blue']);
    expect(solve(def, { maxNodes: 1 }).status).toBe('aborted');
  });

  it('stateKey ne distingue pas deux vis de même couleur hors du plateau', () => {
    const def = level([...trio('red', 'r'), ...trio('blue', 'b')], ['red', 'blue']);
    const s = engine.init(def);
    const a = engine.step(s, { type: 'tap', screwId: 'b1' }).state;
    const b = engine.step(s, { type: 'tap', screwId: 'b2' }).state;
    expect(stateKey(a)).not.toBe(stateKey(b)); // plateau différent
    const a2 = engine.step(a, { type: 'tap', screwId: 'b2' }).state;
    const b2 = engine.step(b, { type: 'tap', screwId: 'b1' }).state;
    expect(stateKey(a2)).toBe(stateKey(b2));
  });
});

describe('generateLevel', () => {
  const params = { groups: 6, colors: 3, plates: 5, multiTapRate: 0.3 };

  it('est déterministe pour un seed donné', () => {
    expect(generateLevel('a', 11, params)).toEqual(generateLevel('a', 11, params));
    expect(generateLevel('a', 11, params)).not.toEqual(generateLevel('a', 12, params));
  });

  it('trap = 1 : la file réclame d’abord les couleurs les plus enfouies ; overlap resserre les planches', () => {
    const spread = generateLevel('a', 5, { groups: 8, colors: 4, plates: 8, multiTapRate: 0, overlap: 0 });
    const tight = generateLevel('a', 5, { groups: 8, colors: 4, plates: 8, multiTapRate: 0, overlap: 1 });
    const extent = (l: typeof spread) => {
      const xs = l.plates.flatMap((p) => p.polygon.map((q) => q.x));
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(extent(tight)).toBeLessThan(extent(spread));
    const trapped = generateLevel('a', 9, { groups: 8, colors: 4, plates: 8, multiTapRate: 0, overlap: 1, trap: 1 });
    expect(trapped.boxQueue.slice().sort()).toEqual(generateLevel('a', 9, { groups: 8, colors: 4, plates: 8, multiTapRate: 0, overlap: 1, trap: 0 }).boxQueue.slice().sort());
  });

  it('respecte les invariants du niveau', () => {
    const def = generateLevel('a', 11, params);
    expect(def.screws).toHaveLength(18);
    expect(def.plates).toHaveLength(5);
    expect(def.boxQueue).toHaveLength(6);
    const pinned = new Set(def.screws.flatMap((s) => s.pins));
    expect(def.plates.every((p) => pinned.has(p.id))).toBe(true);
    for (const color of new Set(def.boxQueue)) {
      const n = def.screws.filter((s) => s.color === color).length;
      expect(n).toBe(3 * def.boxQueue.filter((c) => c === color).length);
    }
    expect(new Set(def.boxQueue).size).toBe(3);
  });
});
