import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type LevelDef } from '@jam/engine-screw';
import { validateLevel } from './validate';

const square = (x: number, y: number, size: number) => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];

// Typé LevelDef : le compilateur garantit la cohérence type ↔ schéma testée ici.
const example: LevelDef = {
  schemaVersion: 1,
  id: 'example-1',
  seed: 42,
  board: { width: 10, height: 10 },
  plates: [
    { id: 'p1', z: 0, polygon: square(0, 0, 6) },
    { id: 'p2', z: 1, polygon: square(4, 4, 6) },
  ],
  screws: [
    { id: 's1', color: 'red', kind: { type: 'standard' }, at: { x: 1, y: 1 }, pins: ['p1'] },
    { id: 's2', color: 'red', kind: { type: 'multiTap', taps: 2 }, at: { x: 5, y: 1 }, pins: ['p1'] },
    { id: 's3', color: 'red', kind: { type: 'standard' }, at: { x: 5, y: 5 }, pins: ['p1', 'p2'] },
    { id: 's4', color: 'blue', kind: { type: 'standard' }, at: { x: 9, y: 9 }, pins: ['p2'] },
    { id: 's5', color: 'blue', kind: { type: 'standard' }, at: { x: 9, y: 5 }, pins: ['p2'] },
    { id: 's6', color: 'blue', kind: { type: 'standard' }, at: { x: 5, y: 9 }, pins: ['p2'] },
  ],
  boxQueue: ['red', 'blue'],
  rules: DEFAULT_RULES,
};

const clone = (): LevelDef => structuredClone(example);
const errorsOf = (input: unknown) => {
  const r = validateLevel(input);
  return r.ok ? [] : r.errors;
};

describe('validateLevel', () => {
  it('accepte un LevelDef d’exemple', () => {
    expect(validateLevel(example)).toEqual({ ok: true, level: example });
  });

  it('rejette une vis sans plaque (pins vide)', () => {
    const level = clone();
    level.screws[0]!.pins = [];
    expect(errorsOf(level).length).toBeGreaterThan(0);
  });

  it('rejette une vis qui retient une plaque inconnue', () => {
    const level = clone();
    level.screws[0]!.pins = ['nope'];
    expect(errorsOf(level)).toContain('vis s1 : plaque inconnue nope');
  });

  it('rejette une couleur dont le nombre de vis n’est pas un multiple de 3', () => {
    const level = clone();
    level.screws[5]!.color = 'red';
    expect(errorsOf(level)).toContain('couleur red : 4 vis, pas un multiple de 3');
  });

  it('rejette un polygone vide', () => {
    const level = clone();
    level.plates[0]!.polygon = [];
    expect(errorsOf(level).length).toBeGreaterThan(0);
  });

  it('rejette une file de boîtes incohérente avec les vis', () => {
    const level = clone();
    level.boxQueue = ['red', 'red', 'blue'];
    expect(errorsOf(level)).toContain('couleur red : 3 vis pour 2 boîte(s)');
  });

  it('rejette une vis joker (retirée de la v0)', () => {
    const level: unknown = { ...clone(), screws: [{ ...example.screws[0], kind: { type: 'joker' } }] };
    expect(errorsOf(level).length).toBeGreaterThan(0);
  });
});
