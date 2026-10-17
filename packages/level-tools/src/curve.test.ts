import { describe, expect, it } from 'vitest';
import { generateLevel } from '@jam/engine-screw';
import { BLOCK, blockMeans, blockParams, generateCurve, pickBlock, type RatedLevel } from './curve';

const rated = (scores: number[]): RatedLevel[] =>
  scores.map((score, i) => ({ level: generateLevel(`l${i}`, i, blockParams(0)), score }));

describe('courbe de difficulté', () => {
  it('les paramètres grossissent avec le bloc', () => {
    expect(blockParams(9).groups).toBeGreaterThan(blockParams(0).groups);
    expect(blockParams(9).colors).toBeLessThanOrEqual(6);
  });

  it('pickBlock prend la fenêtre la plus facile qui atteint le plancher, triée', () => {
    const pool = rated([50, 0, 10, 20, 30, 40, 60, 70, 80, 90, 5, 15]);
    const easiest = pickBlock(pool, 0)!.map((r) => r.score);
    expect(easiest).toEqual([0, 5, 10, 15, 20, 30, 40, 50, 60, 70]);
    expect(pickBlock(pool, 40)!.map((r) => r.score)).toEqual([10, 15, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(pickBlock(pool, 0, 38)!.map((r) => r.score)).toEqual([5, 10, 15, 20, 30, 40, 50, 60, 70, 80]);
    expect(pickBlock(pool, 99)).toBeUndefined();
    expect(pickBlock(rated([1, 2]), 0)).toBeUndefined();
  });

  it('blockMeans regroupe par blocs de 10', () => {
    expect(blockMeans([...Array<number>(BLOCK).fill(2), ...Array<number>(BLOCK).fill(4)])).toEqual([2, 4]);
  });

  it('generateCurve produit des niveaux numérotés, triés dans le bloc', () => {
    const levels = generateCurve({ appId: 'demo', blocks: 1, seed: 1, candidates: 10 });
    expect(levels.map((r) => r.level.id).slice(0, 2)).toEqual(['demo-001', 'demo-002']);
    const scores = levels.map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });
});
