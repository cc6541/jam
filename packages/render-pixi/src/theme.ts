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
  plate: { layers: Material[] };
  /** Zone tampon : couleur des alvéoles, des emplacements verrouillés et de leur « + ». */
  tray: { hole: number; locked: number; lockedIcon: number };
  screws: Record<ColorId, ScrewStyle>;
  fontFamily: string;
}

export const DEFAULT_THEME: Theme = {
  plate: {
    layers: [
      { base: 0xa8703f, light: 0xe0ad74, dark: 0x5e3716 },
      { base: 0xbd844c, light: 0xedc28c, dark: 0x6d4219 },
      { base: 0xcf9659, light: 0xf7d29f, dark: 0x7c4d1f },
      { base: 0xdeaa6b, light: 0xffe2b5, dark: 0x8a5a28 },
    ],
  },
  tray: { hole: 0xc2d0e3, locked: 0xe6edf7, lockedIcon: 0x9fb0c9 },
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
