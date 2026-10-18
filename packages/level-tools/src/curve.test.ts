import { describe, expect, it } from 'vitest';
import { designLevel, miss, targetFor, tierOf } from './curve';

describe('courbe v2', () => {
  it('cycle de 10 : respiration, normal, difficile au 5, très difficile au 10', () => {
    expect([1, 2, 3].map(tierOf)).toEqual(['tutorial', 'tutorial', 'tutorial']);
    expect([11, 12, 15, 16, 20].map(tierOf)).toEqual(['breather', 'normal', 'hard', 'breather', 'superHard']);
  });

  it('les cibles se resserrent avec la progression et selon le rôle', () => {
    expect(targetFor(40).minSlots[0]).toBeGreaterThanOrEqual(targetFor(4).minSlots[0]);
    expect(targetFor(30).minSlots).toEqual([5, 5]);
    expect(targetFor(25).minSlots[0]).toBeGreaterThanOrEqual(4);
    expect(targetFor(26).minSlots[1]).toBeLessThanOrEqual(2);
    expect(targetFor(30).params.trap).toBe(1);
    expect(targetFor(12).params.multiTapRate).toBeGreaterThan(0);
    expect(targetFor(9).params.multiTapRate).toBe(0);
  });

  it('écart à la cible', () => {
    const t = targetFor(30);
    expect(miss(t, { minSlots: 5, trapRate: 0.9 })).toBe(0);
    expect(miss(t, { minSlots: 4, trapRate: 0.9 })).toBe(1);
  });

  it('designLevel produit un niveau mesuré et étiqueté, déterministe', () => {
    const a = designLevel('demo', 2, 1, 5);
    expect(a.level.id).toBe('demo-002');
    expect(a.level.meta?.tier).toBe('tutorial');
    expect(a.level.meta?.minSlots).toBeLessThanOrEqual(5);
    expect(designLevel('demo', 2, 1, 5).level).toEqual(a.level);
  });
});
