import type { ColorId, PatternId } from '@jam/engine-screw';

/** Invariant 6 : chaque couleur a toujours un motif associé. */
export interface ScrewStyle {
  fill: number;
  pattern: PatternId;
}

/** Matériau dessiné en aplats + reflets (pas de texture : rendu vectoriel, léger sur mobile d'entrée de gamme). */
export interface Material {
  base: number;
  light: number;
  dark: number;
  /** Veinage (bois). */
  grain?: number;
}

export interface Theme {
  plate: { metal: Material; wood: Material; alpha: number };
  frame: { wood: Material; recess: number };
  tray: { metal: Material; slot: number; slotEdge: number; text: number };
  crate: { metal: Material; recess: number };
  screws: Record<ColorId, ScrewStyle>;
}

export const DEFAULT_THEME: Theme = {
  plate: {
    // Légèrement translucides : on devine les vis bloquées sous une plaque.
    alpha: 0.88,
    metal: { base: 0xb4bfcf, light: 0xeaf0fa, dark: 0x5d6879 },
    wood: { base: 0xa9743f, light: 0xd29c64, dark: 0x66411f, grain: 0x8a5a30 },
  },
  frame: {
    wood: { base: 0x8a5a2b, light: 0xb98450, dark: 0x3f2610, grain: 0x6f4520 },
    recess: 0x2b1d1c,
  },
  tray: {
    metal: { base: 0x9ba7b8, light: 0xdfe6f2, dark: 0x4b5566 },
    slot: 0x3a4150,
    slotEdge: 0x1c2029,
    text: 0xf1f4fa,
  },
  crate: { metal: { base: 0x434c5c, light: 0x7f8aa0, dark: 0x1f2530 }, recess: 0x262c38 },
  screws: {
    red: { fill: 0xe5484d, pattern: 'dots' },
    blue: { fill: 0x3e8ef7, pattern: 'stripes' },
    yellow: { fill: 0xf5c33b, pattern: 'cross' },
    green: { fill: 0x3fb950, pattern: 'wave' },
    purple: { fill: 0xa371f7, pattern: 'grid' },
    orange: { fill: 0xf0883e, pattern: 'plain' },
  },
};
