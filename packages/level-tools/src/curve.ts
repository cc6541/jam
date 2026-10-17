// Courbe de difficulté en dents de scie : 10 blocs de 10 niveaux, croissante dans chaque bloc,
// moyenne des blocs non décroissante. La difficulté vient du solveur, pas des paramètres.
import { generateLevel, solve, type GeneratorParams, type LevelDef } from '@jam/engine-screw';

export const BLOCK = 10;

export interface RatedLevel {
  level: LevelDef;
  score: number;
}

/** Paramètres du générateur pour le bloc `b` (0 = niveaux 1 à 10). */
export function blockParams(b: number): GeneratorParams {
  return {
    groups: 3 + b,
    colors: Math.min(6, 2 + Math.floor(b / 2)),
    plates: 2 + b,
    multiTapRate: Math.min(0.3, Math.max(0, 0.05 * (b - 2))),
  };
}

export function rate(level: LevelDef, maxNodes = 20_000): number | undefined {
  const result = solve(level, { maxNodes });
  return result.status === 'solved' ? result.difficulty.score : undefined;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Moyenne de difficulté de chaque bloc de BLOCK niveaux consécutifs. */
export function blockMeans(scores: number[]): number[] {
  const means: number[] = [];
  for (let i = 0; i < scores.length; i += BLOCK) means.push(mean(scores.slice(i, i + BLOCK)));
  return means;
}

/** Moyenne visée pour le bloc `b` : de 3 (prise en main) à ~75. */
export const blockTarget = (b: number): number => 3 + 8 * b;

/**
 * Parmi des candidats triés par score, la fenêtre de BLOCK niveaux consécutifs dont la moyenne
 * atteint `floor` et s'approche le plus de `target`, ou undefined.
 */
export function pickBlock(candidates: RatedLevel[], floor: number, target = floor): RatedLevel[] | undefined {
  const sorted = [...candidates].sort((a, b) => a.score - b.score);
  let best: { window: RatedLevel[]; gap: number } | undefined;
  for (let i = 0; i + BLOCK <= sorted.length; i++) {
    const window = sorted.slice(i, i + BLOCK);
    const m = mean(window.map((r) => r.score));
    if (m < floor) continue;
    const gap = Math.abs(m - target);
    if (!best || gap < best.gap) best = { window, gap };
  }
  return best?.window;
}

export interface CurveOptions {
  appId: string;
  blocks: number;
  seed: number;
  /** Candidats générés par bloc avant d'élargir. */
  candidates?: number;
  onProgress?: (message: string) => void;
}

/** Génère `blocks × BLOCK` niveaux numérotés à partir de 1, tous résolus. */
export function generateCurve(options: CurveOptions): RatedLevel[] {
  const out: RatedLevel[] = [];
  let floor = 0;
  let seed = options.seed;
  for (let b = 0; b < options.blocks; b++) {
    const params = blockParams(b);
    const pool: RatedLevel[] = [];
    let picked: RatedLevel[] | undefined;
    for (let target = options.candidates ?? 16; !picked; target += 8) {
      while (pool.length < target) {
        const level = generateLevel('draft', seed++, params);
        const score = rate(level);
        if (score !== undefined) pool.push({ level, score });
      }
      picked = pickBlock(pool, floor, Math.max(floor, blockTarget(b)));
    }
    floor = mean(picked.map((r) => r.score));
    picked.forEach((r, i) => {
      const n = String(b * BLOCK + i + 1).padStart(3, '0');
      out.push({ level: { ...r.level, id: `${options.appId}-${n}` }, score: r.score });
    });
    options.onProgress?.(`bloc ${b + 1} : moyenne ${floor.toFixed(1)}`);
  }
  return out;
}
