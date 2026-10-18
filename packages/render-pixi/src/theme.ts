import type { ColorId, PatternId } from '@jam/engine-screw';

/** Invariant 6 : chaque couleur a toujours un motif associé. */
export interface ScrewStyle {
  fill: number;
  pattern: PatternId;
}

/** Matériau dessiné en aplats + reflets (pas de texture bitmap : léger sur mobile d'entrée de gamme). */
export interface Material {
  base: number;
  light: number;
  dark: number;
  /** Veinage (bois). */
  grain?: number;
}

export interface Theme {
  /** Planches, de la plus basse à la plus haute (plus claire = plus haute : la profondeur se lit d'un coup d'œil). */
  plate: { layers: Material[]; alpha: number; hole: number; holeDeep: number };
  /** Tapis sous le plateau. */
  mat: { fill: number; alpha: number };
  tray: { fill: number; alpha: number; edge: number; hole: number; holeRim: number; locked: number; lockedIcon: number };
  crate: { hole: number };
  screws: Record<ColorId, ScrewStyle>;
  fontFamily: string;
}

export const DEFAULT_THEME: Theme = {
  plate: {
    alpha: 0.9,
    hole: 0x3a2414,
    holeDeep: 0x1d1109,
    layers: [
      { base: 0xb07443, light: 0xd9a06a, dark: 0x6a3f1d, grain: 0x8f5a2f },
      { base: 0xc4884f, light: 0xe8b884, dark: 0x7a4a22, grain: 0xa66c39 },
      { base: 0xd59d63, light: 0xf3cd9c, dark: 0x8a5629, grain: 0xb98048 },
      { base: 0xe2b27a, light: 0xfbe0b8, dark: 0x93602f, grain: 0xc79257 },
    ],
  },
  mat: { fill: 0xffffff, alpha: 0.16 },
  tray: { fill: 0xffffff, alpha: 0.92, edge: 0x9fb6d6, hole: 0xc5d3e6, holeRim: 0x7f95b5, locked: 0xeef3fa, lockedIcon: 0x9fb0c9 },
  crate: { hole: 0x1d2433 },
  screws: {
    red: { fill: 0xf0444b, pattern: 'dots' },
    blue: { fill: 0x2f8cf5, pattern: 'stripes' },
    yellow: { fill: 0xffc928, pattern: 'cross' },
    green: { fill: 0x2fbf63, pattern: 'wave' },
    purple: { fill: 0x9b5cf6, pattern: 'grid' },
    orange: { fill: 0xff8a2a, pattern: 'plain' },
  },
  fontFamily: "Fredoka, ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif",
};
