import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type LevelDef } from '@jam/engine-screw';
import { boxScrewCenter, computeLayout, slotCenter, toScreen } from './layout';
import { DEFAULT_THEME } from './theme';

const level = { board: { width: 100, height: 140 }, rules: DEFAULT_RULES } as LevelDef;

describe('layout', () => {
  it('le plateau tient entre boîtes et toolbox, centré, proportions conservées', () => {
    const l = computeLayout(level, { width: 390, height: 844 });
    expect(l.board.y).toBeGreaterThan(l.boxes.y + l.boxes.height);
    expect(l.board.y + l.board.height).toBeLessThanOrEqual(l.toolbox.y);
    expect(l.board.width / l.board.height).toBeCloseTo(100 / 140);
    expect(l.board.x + l.board.width / 2).toBeCloseTo(195);
    expect(toScreen(l, { x: 100, y: 140 })).toEqual({ x: l.board.x + l.board.width, y: l.board.y + l.board.height });
  });

  it('emplacements répartis et vis de boîte centrées', () => {
    const rect = { x: 0, y: 0, width: 100, height: 10 };
    expect(slotCenter(rect, 0, 2)).toEqual({ x: 25, y: 5 });
    const l = computeLayout(level, { width: 390, height: 844 });
    const mid = boxScrewCenter(l, 0, 2, 1, 3);
    expect(mid.x).toBeCloseTo(slotCenter(l.boxes, 0, 2).x);
  });

  it('le thème donne un motif distinct à chaque couleur (accessibilité)', () => {
    const patterns = Object.values(DEFAULT_THEME.screws).map((s) => s.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
});
