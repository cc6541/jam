import type { ColorId, PatternId } from '@jam/engine-screw';

/** Invariant 6 : chaque couleur a toujours un motif associé. */
export interface ScrewStyle {
  fill: number;
  pattern: PatternId;
}

export interface Theme {
  background: number;
  plate: { fill: number; alpha: number; stroke: number };
  slot: number;
  screws: Record<ColorId, ScrewStyle>;
}

export const DEFAULT_THEME: Theme = {
  background: 0x1e2433,
  plate: { fill: 0xc9d3e6, alpha: 0.82, stroke: 0x55617a },
  slot: 0x2c3448,
  screws: {
    red: { fill: 0xe5484d, pattern: 'dots' },
    blue: { fill: 0x3e8ef7, pattern: 'stripes' },
    yellow: { fill: 0xf5c33b, pattern: 'cross' },
    green: { fill: 0x3fb950, pattern: 'wave' },
    purple: { fill: 0xa371f7, pattern: 'grid' },
    orange: { fill: 0xf0883e, pattern: 'plain' },
  },
};
