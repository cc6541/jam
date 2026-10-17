import type { LevelDef } from './types';

/** Petit niveau valide : deux plaques empilées, 6 vis (dont un joker), deux boîtes. */
export function exampleLevel(): LevelDef {
  const square = (x: number, y: number, size: number) => [
    { x, y },
    { x: x + size, y },
    { x: x + size, y: y + size },
    { x, y: y + size },
  ];
  return {
    schemaVersion: 1,
    id: 'example-001',
    seed: 42,
    difficulty: 'normal',
    board: { width: 100, height: 100 },
    plates: [
      { id: 'p-bottom', z: 0, polygon: square(10, 10, 80) },
      { id: 'p-top', z: 1, polygon: square(30, 30, 40) },
    ],
    screws: [
      { id: 's1', color: 'red', kind: { type: 'standard' }, at: { x: 15, y: 15 }, pins: ['p-bottom'] },
      { id: 's2', color: 'red', kind: { type: 'multiTap', taps: 2 }, at: { x: 85, y: 15 }, pins: ['p-bottom'] },
      { id: 's3', color: 'red', kind: { type: 'standard' }, at: { x: 50, y: 50 }, pins: ['p-bottom'] },
      { id: 's4', color: 'blue', kind: { type: 'standard' }, at: { x: 35, y: 35 }, pins: ['p-top'] },
      { id: 's5', color: 'blue', kind: { type: 'standard' }, at: { x: 65, y: 65 }, pins: ['p-top'] },
      { id: 's6', color: 'blue', kind: { type: 'joker' }, at: { x: 15, y: 85 }, pins: ['p-bottom'] },
    ],
    boxQueue: ['red', 'blue'],
    rules: { boxCapacity: 3, activeBoxes: 2, toolboxSlots: 5, toolboxMaxSlots: 7, nearMiss: { maxRemaining: 3 } },
  };
}
