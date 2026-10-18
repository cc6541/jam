import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type LevelDef } from '@jam/engine-screw';
import { boxScrewCenter, computeLayout, contentBounds, crateSize, slotCenter, toScreen } from './layout';
import { DEFAULT_THEME } from './theme';

const rect = (x: number, y: number, w: number, h: number) => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];
const level = (plates: { x: number; y: number; w: number; h: number }[]) =>
  ({
    board: { width: 100, height: 140 },
    rules: DEFAULT_RULES,
    plates: plates.map((p, i) => ({ id: `p${i}`, z: i, polygon: rect(p.x, p.y, p.w, p.h) })),
  }) as unknown as LevelDef;

const big = level([
  { x: 0, y: 0, w: 60, h: 70 },
  { x: 40, y: 60, w: 60, h: 80 },
]);
const small = level([{ x: 30, y: 90, w: 40, h: 30 }]);
const phone = { width: 390, height: 700 };

describe('layout', () => {
  it('ordre du genre : boîtes, puis toolbox, puis plateau', () => {
    const l = computeLayout(big, phone);
    expect(l.tray.y).toBeGreaterThanOrEqual(l.boxes.y + l.boxes.height);
    expect(l.toolbox.y).toBeGreaterThanOrEqual(l.tray.y);
    expect(l.toolbox.y + l.toolbox.height).toBeLessThanOrEqual(l.tray.y + l.tray.height);
    expect(l.board.y).toBeGreaterThan(l.tray.y + l.tray.height);
    expect(l.board.y + l.board.height).toBeLessThanOrEqual(phone.height);
  });

  it('le plateau est cadré sur le contenu, centré, proportions conservées', () => {
    const l = computeLayout(big, phone);
    expect(contentBounds(big)).toEqual({ x: 0, y: 0, width: 100, height: 140 });
    expect(l.board.width / l.board.height).toBeCloseTo(110 / 150);
    expect(l.board.x + l.board.width / 2).toBeCloseTo(195);
    expect(toScreen(l, l.origin)).toEqual({ x: l.board.x, y: l.board.y });
  });

  it('un petit niveau est zoomé (et pas seulement réduit dans un grand cadre vide)', () => {
    const lSmall = computeLayout(small, phone);
    const lBig = computeLayout(big, phone);
    expect(lSmall.scale).toBeGreaterThan(lBig.scale * 1.5);
    expect(lSmall.scale).toBeLessThanOrEqual(7);
  });

  it('les vis tiennent dans les emplacements de toolbox et dans les boîtes', () => {
    const l = computeLayout(small, phone);
    const step = l.toolbox.width / DEFAULT_RULES.toolboxMaxSlots;
    expect(2 * l.screwRadius).toBeLessThan(step);
    const crate = crateSize(l, DEFAULT_RULES.activeBoxes, DEFAULT_RULES.boxCapacity);
    expect(crate.width).toBeLessThanOrEqual(l.boxes.width / DEFAULT_RULES.activeBoxes);
    const first = boxScrewCenter(l, 0, 2, 0, 3);
    const last = boxScrewCenter(l, 0, 2, 2, 3);
    expect(last.x - first.x + 2 * l.screwRadius).toBeLessThanOrEqual(crate.width);
  });

  it('emplacements répartis et vis de boîte centrées', () => {
    expect(slotCenter({ x: 0, y: 0, width: 100, height: 10 }, 0, 2)).toEqual({ x: 25, y: 5 });
    const l = computeLayout(big, phone);
    expect(boxScrewCenter(l, 0, 2, 1, 3).x).toBeCloseTo(slotCenter(l.boxes, 0, 2).x);
  });

  it('le thème donne un motif distinct à chaque couleur (accessibilité)', () => {
    const patterns = Object.values(DEFAULT_THEME.screws).map((s) => s.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
});
