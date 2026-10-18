import { describe, expect, it } from 'vitest';
import { easings, TweenRunner } from './tween';

describe('TweenRunner', () => {
  it('respecte retard, durée et easing, puis appelle onComplete', () => {
    const r = new TweenRunner();
    const seen: number[] = [];
    let done = 0;
    r.add({ delay: 100, duration: 200, easing: easings.linear, update: (t) => seen.push(t), onComplete: () => done++ });
    r.tick(50);
    expect(seen).toEqual([]);
    r.tick(150);
    r.tick(100);
    expect(seen).toEqual([0.5, 1]);
    expect(done).toBe(1);
    expect(r.busy).toBe(false);
  });

  it('finishAll termine tout, y compris les tweens ajoutés en fin de tween', () => {
    const r = new TweenRunner();
    const log: string[] = [];
    r.add({
      delay: 0,
      duration: 1000,
      easing: easings.outCubic,
      update: () => undefined,
      onComplete: () => r.add({ delay: 10, duration: 0, easing: easings.inQuad, update: (t) => log.push(`b${t}`) }),
    });
    r.finishAll();
    expect(log).toEqual(['b1']);
    expect(r.busy).toBe(false);
  });

  it('un tween qui lève une exception est retiré sans bloquer les autres', () => {
    const r = new TweenRunner();
    const log: string[] = [];
    const quiet = console.error;
    console.error = () => undefined;
    r.add({ delay: 0, duration: 100, easing: easings.linear, update: () => { throw new Error('objet détruit'); } });
    r.add({ delay: 0, duration: 100, easing: easings.linear, update: () => undefined, onComplete: () => { throw new Error('fin'); } });
    r.add({ delay: 0, duration: 100, easing: easings.linear, update: (t) => log.push(`ok${t}`), onComplete: () => log.push('done') });
    r.tick(50);
    r.finishAll();
    console.error = quiet;
    expect(log).toEqual(['ok0.5', 'ok1', 'done']);
    expect(r.busy).toBe(false);
  });

  it('les easings vont de 0 à 1', () => {
    for (const e of Object.values(easings)) {
      expect(e(0)).toBeCloseTo(0);
      expect(e(1)).toBeCloseTo(1);
    }
  });
});
