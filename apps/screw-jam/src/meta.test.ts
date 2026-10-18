import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, type LevelDef } from '@jam/engine-screw';
import { newWallet } from '@jam/shell';
import remote from '../config/remote-config.json';
import {
  chestProgress,
  chestReward,
  claimDaily,
  dailyOffer,
  introFor,
  livesAt,
  loseLife,
  markIntro,
  META,
  newMeta,
  openChest,
  refillLives,
  winMultiplier,
  winStreak,
} from './meta';

const T0 = new Date(2026, 9, 18, 10, 0, 0).getTime();
const MIN = 60_000;
const DAY = 86_400_000;
const wallet = () => newWallet(remote.economy);

describe('vies', () => {
  it('pleines au départ, une perdue à la défaite (et la série tombe à 0)', () => {
    const m = loseLife({ ...newMeta(T0), streak: 4 }, T0);
    expect(livesAt(m, T0).count).toBe(4);
    expect(m.streak).toBe(0);
  });

  it('une vie revient toutes les 30 minutes, jamais au-delà du maximum', () => {
    let m = newMeta(T0);
    for (let i = 0; i < 3; i++) m = loseLife(m, T0);
    expect(livesAt(m, T0).count).toBe(2);
    expect(livesAt(m, T0 + 29 * MIN).count).toBe(2);
    expect(livesAt(m, T0 + 29 * MIN).nextIn).toBe(MIN);
    expect(livesAt(m, T0 + 31 * MIN).count).toBe(3);
    expect(livesAt(m, T0 + 10 * 60 * MIN).count).toBe(5);
    expect(livesAt(m, T0 + 10 * 60 * MIN).nextIn).toBe(0);
  });

  it('la recharge en cours est conservée quand on reperd une vie', () => {
    let m = loseLife(newMeta(T0), T0);
    m = loseLife(m, T0 + 20 * MIN);
    expect(livesAt(m, T0 + 31 * MIN).count).toBe(4);
  });

  it('recharge complète ou partielle', () => {
    let m = newMeta(T0);
    for (let i = 0; i < 5; i++) m = loseLife(m, T0);
    expect(livesAt(m, T0).count).toBe(0);
    expect(livesAt(refillLives(m, T0, 1), T0).count).toBe(1);
    expect(livesAt(refillLives(m, T0), T0).count).toBe(META.lives.max);
  });
});

describe('série et récompenses', () => {
  it('le risque paie : ×2 difficile, ×3 très difficile ; +10 % par victoire de série, plafonné', () => {
    expect(winMultiplier('normal', 0)).toBe(1);
    expect(winMultiplier('hard', 0)).toBe(2);
    expect(winMultiplier('superHard', 2)).toBeCloseTo(3.6);
    expect(winMultiplier('normal', 50)).toBeCloseTo(1.5);
    expect(winStreak(newMeta(T0)).streak).toBe(1);
  });
});

describe('récompense quotidienne', () => {
  it('une fois par jour, croissante, et un jour manqué fait repartir au jour 1', () => {
    let m = newMeta(T0);
    let w = wallet();
    expect(dailyOffer(m, T0)).toBe(0);
    const d1 = claimDaily(m, w, T0)!;
    expect(d1.wallet.coins).toBe(w.coins + 50);
    m = d1.meta;
    w = d1.wallet;
    expect(dailyOffer(m, T0 + 2 * 60 * MIN)).toBeNull();
    expect(claimDaily(m, w, T0 + MIN)).toBeNull();
    expect(dailyOffer(m, T0 + DAY)).toBe(1);
    const d2 = claimDaily(m, w, T0 + DAY)!;
    expect(d2.wallet.boosters.undo).toBe(w.boosters.undo + 1);
    expect(dailyOffer(d2.meta, T0 + 3 * DAY)).toBe(0);
  });

  it('le 7e jour est un coffre, puis le cycle reprend', () => {
    let m = newMeta(T0);
    let w = wallet();
    for (let i = 0; i < 7; i++) ({ meta: m, wallet: w } = claimDaily(m, w, T0 + i * DAY)!);
    expect(w.boosters).toEqual({ undo: 2, addToolboxSlot: 2, clearToolbox: 2 });
    expect(dailyOffer(m, T0 + 7 * DAY)).toBe(0);
  });
});

describe('coffre de progression', () => {
  it('jauge vers le coffre suivant, coffres dus, contenu variable mais déterministe', () => {
    const m = newMeta(T0);
    expect(chestProgress(m, 7)).toEqual({ progress: 7, due: 0 });
    expect(chestProgress(m, 21)).toEqual({ progress: 1, due: 2 });
    const opened = openChest(m, wallet());
    expect(opened.meta.chestsOpened).toBe(1);
    expect(opened.wallet.coins).toBe(wallet().coins + 100);
    expect(chestReward(3)).toEqual(chestReward(3));
    expect(new Set([0, 1, 2, 3].map((k) => Object.keys(chestReward(k).boosters ?? {})[0])).size).toBeGreaterThan(1);
  });
});

describe('nouveautés', () => {
  const level = (multi: boolean): LevelDef => ({
    schemaVersion: 1,
    id: 'x',
    seed: 1,
    board: { width: 100, height: 100 },
    plates: [],
    screws: [{ id: 's', color: 'red', kind: multi ? { type: 'multiTap', taps: 2 } : { type: 'standard' }, at: { x: 0, y: 0 }, pins: [] }],
    boxQueue: ['red'],
    rules: DEFAULT_RULES,
  });

  it('présentée une seule fois, au premier niveau qui l’utilise', () => {
    const m = newMeta(T0);
    expect(introFor(m, level(false))).toBeNull();
    expect(introFor(m, level(true))).toBe('multiTap');
    expect(introFor(markIntro(m, 'multiTap'), level(true))).toBeNull();
  });
});
