// Courbe de difficulté v2 (docs/GAME-DESIGN.md §2-3, docs/decisions/0008).
// Chaque niveau a un rôle dans un cycle de 10 et une cible mesurable pour un humain :
// - la marge : cases de toolbox de réserve en jeu parfait (5 − minSlots) ;
// - le piège : part des parties perdues par un joueur naïf qui range toujours ce qui va.
// Le générateur produit des candidats jusqu'à en trouver un qui tient la cible.
import { generateLevel, solve, type GeneratorParams, type LevelDef, type LevelTier } from '@jam/engine-screw';

export const CYCLE = 10;

export function tierOf(n: number): LevelTier {
  if (n <= 3) return 'tutorial';
  if (n % CYCLE === 0) return 'superHard';
  if (n % CYCLE === 5) return 'hard';
  if (n % CYCLE === 1 || n % CYCLE === 6) return 'breather';
  return 'normal';
}

export interface Target {
  tier: LevelTier;
  params: GeneratorParams;
  /** Bornes inclusives de minSlots (sur 5 cases). */
  minSlots: [number, number];
  /** Bornes du taux d'échec du joueur naïf. */
  trap: [number, number];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Cible du niveau n (1-based). La taille monte doucement ; la tension dépend du rôle. */
export function targetFor(n: number): Target {
  const tier = tierOf(n);
  const p = clamp((n - 1) / 99, 0, 1);
  const base: GeneratorParams = {
    groups: Math.round(3 + 8 * p),
    colors: Math.min(6, 2 + Math.floor(n / 9)),
    plates: Math.round(3 + 8 * p),
    multiTapRate: n >= 11 ? 0.08 + 0.14 * p : 0,
    overlap: 0.35 + 0.5 * p,
    trap: 0.35 + 0.35 * p,
  };
  switch (tier) {
    case 'tutorial':
      return { tier, params: { ...base, groups: n + 1, colors: 2, plates: n + 1, trap: 0, overlap: 0.2 }, minSlots: [0, n - 1], trap: [0, 0.05] };
    case 'breather':
      return { tier, params: { ...base, groups: Math.max(3, base.groups - 1), trap: 0.1 }, minSlots: [0, 2], trap: [0, 0.2] };
    case 'normal': {
      const lo = Math.round(1 + 1.6 * p);
      return { tier, params: base, minSlots: [lo, lo + 1], trap: [0, 0.65] };
    }
    case 'hard':
      return {
        tier,
        params: { ...base, groups: base.groups + 1, trap: 0.85, overlap: Math.min(0.95, (base.overlap ?? 0) + 0.1) },
        minSlots: [n < 15 ? 3 : 4, 5],
        trap: [n < 15 ? 0 : 0.25, 1],
      };
    case 'superHard':
      return {
        tier,
        params: { ...base, groups: base.groups + 2, colors: Math.min(6, base.colors + 1), trap: 1, overlap: Math.min(1, (base.overlap ?? 0) + 0.15) },
        minSlots: [n < 20 ? 4 : 5, 5],
        trap: [n < 20 ? 0.4 : 0.7, 1],
      };
  }
}

export interface Measure {
  minSlots: number;
  trapRate: number;
}

/** Mesure un niveau : undefined s'il n'est pas soluble avec ses règles. */
export function measure(level: LevelDef, budget = 20_000): Measure | undefined {
  const full = solve(level, { maxNodes: budget, randomRuns: 40 });
  if (full.status !== 'solved') return undefined;
  let minSlots = level.rules.toolboxSlots;
  for (let k = 0; k < level.rules.toolboxSlots; k++) {
    const rules = { ...level.rules, toolboxSlots: k, toolboxMaxSlots: Math.max(1, k) };
    if (solve({ ...level, rules }, { maxNodes: Math.round(budget / 4), randomRuns: 0 }).status === 'solved') {
      minSlots = k;
      break;
    }
  }
  return { minSlots, trapRate: full.difficulty.greedyFailRate };
}

/** Distance à la cible (0 = dans les bornes). */
export function miss(target: Target, m: Measure): number {
  const out = (v: number, [lo, hi]: [number, number]) => (v < lo ? lo - v : v > hi ? v - hi : 0);
  return out(m.minSlots, target.minSlots) + 2 * out(m.trapRate, target.trap);
}

export interface Designed {
  level: LevelDef;
  measure: Measure;
  /** 0 si la cible est atteinte. */
  miss: number;
  attempts: number;
}

/** Niveau n : candidats seedés jusqu'à atteindre la cible, sinon le plus proche après `maxAttempts`. */
export function designLevel(appId: string, n: number, seed: number, maxAttempts = 40): Designed {
  const target = targetFor(n);
  let best: Designed | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const level = generateLevel(`${appId}-${String(n).padStart(3, '0')}`, seed + n * 1000 + attempt, target.params);
    const m = measure(level);
    if (!m) continue;
    const d = miss(target, m);
    if (!best || d < best.miss) best = { level, measure: m, miss: d, attempts: attempt + 1 };
    if (d === 0) break;
  }
  if (!best) throw new Error(`niveau ${n} : aucun candidat soluble`);
  best.attempts = Math.max(best.attempts, 1);
  return { ...best, level: { ...best.level, meta: { tier: target.tier, ...best.measure } } };
}
