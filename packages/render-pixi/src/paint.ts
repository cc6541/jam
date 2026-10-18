// Peinture des éléments du plateau en Canvas 2D (dégradés, ombres douces, bois procédural), puis textures Pixi.
// Tout est peint une fois par niveau ; à l'image près, le jeu n'affiche que des sprites (léger sur mobile).
// Aucune règle de jeu ici.
import { Texture } from 'pixi.js';
import type { PatternId, Point } from '@jam/engine-screw';
import type { Layout, Rect } from './layout';
import { slotCenter } from './layout';
import type { Material, ScrewStyle, Theme } from './theme';

// ---------- Couleurs et géométrie ----------

/** Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur 0xRRGGBB. */
export function shade(color: number, amount: number): number {
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * k);
  return (mix((color >> 16) & 255) << 16) | (mix((color >> 8) & 255) << 8) | mix(color & 255);
}

/** Mélange linéaire de deux couleurs (k = 0 → a, k = 1 → b). */
export function mixColor(a: number, b: number, k: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * k);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

const css = (color: number, alpha = 1) =>
  `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;

export function centroid(points: readonly Point[]): Point {
  const n = Math.max(1, points.length);
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

function bounds(points: readonly Point[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Tracé d'un polygone à coins arrondis (rayon borné par la moitié de l'arête la plus courte). */
function roundedPath(ctx: CanvasRenderingContext2D, points: readonly Point[], radius: number): void {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n] as Point;
  let r = radius;
  for (let i = 0; i < n; i++) r = Math.min(r, Math.hypot(at(i + 1).x - at(i).x, at(i + 1).y - at(i).y) / 2);
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(at(n - 1), at(0));
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(at(i), at(i + 1));
    ctx.arcTo(at(i).x, at(i).y, m.x, m.y, r);
  }
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  roundedPath(
    ctx,
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    r,
  );
}

// ---------- Bois procédural ----------

/**
 * Bruit de valeur 2D lissé, déterministe et périodique : n(x, y, px, py) se raccorde tous les px en x et py en y,
 * ce qui rend la texture de bois raccordable (aucune couture visible quand elle se répète).
 */
function tileableNoise(seed: number): (x: number, y: number, px: number, py: number) => number {
  const hash = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const wrap = (v: number, p: number) => ((v % p) + p) % p;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y, px, py) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = smooth(x - i);
    const fy = smooth(y - j);
    const [i0, i1, j0, j1] = [wrap(i, px), wrap(i + 1, px), wrap(j, py), wrap(j + 1, py)];
    const a = hash(i0, j0);
    const b = hash(i1, j0);
    const c = hash(i0, j1);
    const d = hash(i1, j1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

let woodCache: HTMLCanvasElement | undefined;

/**
 * Texture de bois en niveaux de gris (veines longues ondulées + fibres fines), 512 × 512.
 * Elle module la couleur de chaque planche en « soft-light » : une seule génération pour toutes les teintes.
 */
export function woodTexture(): HTMLCanvasElement {
  if (woodCache) return woodCache;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  const warp = tileableNoise(1);
  const fiber = tileableNoise(2);
  const knot = tileableNoise(3);
  // fBm à octaves entières : chaque octave garde une période entière, donc la somme reste raccordable.
  const fbm = (n: typeof warp, x: number, y: number, px: number, py: number) =>
    n(x, y, px, py) * 0.6 + n(x * 2, y * 2, px * 2, py * 2) * 0.28 + n(x * 4, y * 4, px * 4, py * 4) * 0.12;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Veines : bandes horizontales déformées par un bruit lent (le bois « coule » le long de la planche).
      const w = fbm(warp, u * 3, v * 9, 3, 9) * 3.2 + fbm(knot, u * 2, v * 2, 2, 2) * 1.4;
      const ring = Math.sin((v * 34 + w) * Math.PI);
      const vein = Math.pow(Math.abs(ring), 0.35);
      const fibers = fbm(fiber, u * 70, v * 4, 70, 4);
      const l = 0.42 + vein * 0.26 + (fibers - 0.5) * 0.22;
      const g = Math.max(0, Math.min(255, Math.round(l * 255)));
      const k = (y * size + x) * 4;
      img.data[k] = g;
      img.data[k + 1] = g;
      img.data[k + 2] = g;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  woodCache = canvas;
  return canvas;
}

// ---------- Motifs gravés (invariant 6 : couleur + motif) ----------

function patternPath(ctx: CanvasRenderingContext2D, pattern: PatternId, r: number): 'fill' | 'stroke' {
  ctx.beginPath();
  switch (pattern) {
    case 'dots':
      for (const [x, y] of [[-0.5, -0.35], [0.5, -0.35], [0, 0.55]] as const) {
        ctx.moveTo(x * r + r * 0.27, y * r);
        ctx.arc(x * r, y * r, r * 0.27, 0, Math.PI * 2);
      }
      return 'fill';
    case 'stripes':
      ctx.moveTo(-r * 0.75, r * 0.2);
      ctx.lineTo(r * 0.2, -r * 0.75);
      ctx.moveTo(-r * 0.2, r * 0.75);
      ctx.lineTo(r * 0.75, -r * 0.2);
      return 'stroke';
    case 'cross':
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      return 'stroke';
    case 'wave':
      ctx.moveTo(-r, 0);
      for (let i = 1; i <= 16; i++) ctx.lineTo(-r + (i * 2 * r) / 16, Math.sin((i / 16) * Math.PI * 2) * r * 0.42);
      return 'stroke';
    case 'grid':
      ctx.rect(-r * 0.62, -r * 0.62, r * 1.24, r * 1.24);
      ctx.moveTo(0, -r * 0.62);
      ctx.lineTo(0, r * 0.62);
      ctx.moveTo(-r * 0.62, 0);
      ctx.lineTo(r * 0.62, 0);
      return 'stroke';
    case 'plain':
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      return 'stroke';
  }
}

function engrave(ctx: CanvasRenderingContext2D, pattern: PatternId, r: number, dark: string, light: string): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.6, r / 3.2);
  for (const [color, dy] of [
    [dark, r * 0.08],
    [light, 0],
  ] as const) {
    ctx.save();
    ctx.translate(0, dy);
    const mode = patternPath(ctx, pattern, r);
    if (mode === 'fill') {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- Peintre ----------

/** Texture peinte et son coin haut-gauche, en coordonnées logiques de la scène. */
export interface Painted {
  texture: Texture;
  x: number;
  y: number;
}

/** Gris neutre vers lequel tirent les vis bloquées (le motif reste lisible). */
const BLOCKED_GREY = 0x8e98a8;

export class Painter {
  private readonly owned: Texture[] = [];
  private readonly screws = new Map<string, Texture>();

  constructor(
    /** Pixels physiques par pixel logique. */
    readonly resolution: number,
    private readonly theme: Theme,
  ) {}

  destroy(): void {
    for (const t of this.owned) t.destroy(true);
    this.owned.length = 0;
    this.screws.clear();
  }

  /** Échelle à appliquer au sprite pour revenir en pixels logiques. */
  get spriteScale(): number {
    return 1 / this.resolution;
  }

  private canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * this.resolution));
    canvas.height = Math.max(1, Math.ceil(height * this.resolution));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponible');
    ctx.scale(this.resolution, this.resolution);
    return [canvas, ctx];
  }

  private texture(canvas: HTMLCanvasElement): Texture {
    const texture = Texture.from(canvas);
    this.owned.push(texture);
    return texture;
  }

  /** Planche de bois épaisse : ombre douce, chant, face veinée, biseau, trous creusés. */
  plate(points: Point[], layer: number, holes: Point[], holeRadius: number): Painted {
    const mat = this.theme.plate.layers[layer % this.theme.plate.layers.length] as Material;
    const b = bounds(points);
    const margin = 26;
    const thick = 5 + Math.min(layer, 3);
    const [canvas, ctx] = this.canvas(b.width + margin * 2, b.height + margin * 2 + thick);
    ctx.translate(margin - b.x, margin - b.y);
    const radius = Math.min(16, Math.min(b.width, b.height) * 0.2);
    const down = points.map((p) => ({ x: p.x, y: p.y + thick }));

    // Ombre portée floue, plus marquée pour les planches hautes.
    ctx.save();
    ctx.shadowColor = 'rgba(12, 28, 64, 0.42)';
    ctx.shadowBlur = 12 + layer * 3;
    ctx.shadowOffsetY = 6 + layer * 2;
    roundedPath(ctx, down, radius);
    ctx.fillStyle = css(mat.dark);
    ctx.fill();
    ctx.restore();

    // Chant (épaisseur) : dégradé sombre.
    roundedPath(ctx, down, radius);
    const side = ctx.createLinearGradient(0, b.y, 0, b.y + b.height + thick);
    side.addColorStop(0, css(shade(mat.base, -0.25)));
    side.addColorStop(1, css(shade(mat.dark, -0.2)));
    ctx.fillStyle = side;
    ctx.fill();

    // Face : couleur, veinage, lumière venant du haut-gauche.
    ctx.save();
    roundedPath(ctx, points, radius);
    ctx.clip();
    ctx.fillStyle = css(mat.base);
    ctx.fillRect(b.x, b.y, b.width, b.height);
    const wood = ctx.createPattern(woodTexture(), 'repeat');
    if (wood) {
      const vertical = b.height > b.width * 1.25;
      const matrix = new DOMMatrix()
        .translate(b.x - ((layer * 137 + Math.round(b.x)) % 512), b.y - ((layer * 89 + Math.round(b.y * 1.7)) % 512))
        .rotate(vertical ? 90 : 0);
      wood.setTransform(matrix);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = wood;
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    const light = ctx.createLinearGradient(b.x, b.y, b.x + b.width * 0.6, b.y + b.height);
    light.addColorStop(0, 'rgba(255, 245, 225, 0.30)');
    light.addColorStop(0.5, 'rgba(255, 245, 225, 0)');
    light.addColorStop(1, 'rgba(40, 20, 5, 0.18)');
    ctx.fillStyle = light;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    // Biseau : liseré clair en haut à gauche, sombre en bas à droite.
    const bevel = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
    bevel.addColorStop(0, css(mat.light, 0.95));
    bevel.addColorStop(0.5, css(mat.light, 0.25));
    bevel.addColorStop(1, css(mat.dark, 0.7));
    roundedPath(ctx, points, radius);
    ctx.lineWidth = 6;
    ctx.strokeStyle = bevel;
    ctx.stroke();
    ctx.restore();

    roundedPath(ctx, points, radius);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = css(shade(mat.dark, -0.3), 0.9);
    ctx.stroke();

    for (const h of holes) this.hole(ctx, h, holeRadius, mat);
    return { texture: this.texture(canvas), x: b.x - margin, y: b.y - margin };
  }

  /** Trou creusé : fond sombre en dégradé, ombre interne en haut, reflet sur la lèvre basse. */
  private hole(ctx: CanvasRenderingContext2D, at: Point, r: number, mat: Material): void {
    const g = ctx.createRadialGradient(at.x, at.y + r * 0.25, r * 0.1, at.x, at.y, r);
    g.addColorStop(0, '#0f0904');
    g.addColorStop(0.7, '#24150a');
    g.addColorStop(1, css(shade(mat.dark, -0.35)));
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r + 0.6, Math.PI * 0.1, Math.PI * 0.9);
    ctx.strokeStyle = css(mat.light, 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(at.x, at.y, r - 1, Math.PI * 1.1, Math.PI * 1.9);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.stroke();
  }

  /** Tête de vis bombée : dôme en dégradé radial, anneau, biseau, motif gravé, reflet. `blocked` : version grisée. */
  screw(style: ScrewStyle, r: number, blocked = false): Texture {
    const key = `${style.fill}-${style.pattern}-${r}-${blocked}`;
    const cached = this.screws.get(key);
    if (cached) return cached;
    const fill = blocked ? mixColor(style.fill, BLOCKED_GREY, 0.8) : style.fill;
    const size = r * 2 + 6;
    const [canvas, ctx] = this.canvas(size, size);
    ctx.translate(size / 2, size / 2);

    const dome = ctx.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.08, 0, 0, r);
    dome.addColorStop(0, css(shade(fill, 0.45)));
    dome.addColorStop(0.45, css(fill));
    dome.addColorStop(1, css(shade(fill, -0.4)));
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = dome;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    ctx.strokeStyle = css(shade(fill, -0.6));
    ctx.stroke();

    const rim = ctx.createLinearGradient(-r, -r, r, r);
    rim.addColorStop(0, 'rgba(255,255,255,0.75)');
    rim.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    rim.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.2, r * 0.13);
    ctx.strokeStyle = rim;
    ctx.stroke();

    engrave(ctx, style.pattern, r * 0.5, css(shade(fill, -0.65), 0.55), blocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.95)');

    const spec = ctx.createRadialGradient(-r * 0.36, -r * 0.48, 0, -r * 0.36, -r * 0.48, r * 0.42);
    spec.addColorStop(0, 'rgba(255,255,255,0.85)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(-r * 0.36, -r * 0.48, r * 0.42, r * 0.26, -0.5, 0, Math.PI * 2);
    ctx.fill();

    const texture = this.texture(canvas);
    this.screws.set(key, texture);
    return texture;
  }

  /** Ombre douce sous une vis (dégradé radial : portable, sans filtre de flou). */
  screwShadow(r: number): Texture {
    const key = `shadow-${r}`;
    const cached = this.screws.get(key);
    if (cached) return cached;
    const size = r * 3;
    const [canvas, ctx] = this.canvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, r * 0.4, size / 2, size / 2, r * 1.35);
    g.addColorStop(0, 'rgba(12, 28, 64, 0.55)');
    g.addColorStop(1, 'rgba(12, 28, 64, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const texture = this.texture(canvas);
    this.screws.set(key, texture);
    return texture;
  }

  /** Bac de la zone tampon : panneau blanc dépoli, alvéoles en creux. */
  /** Établi façon plan d'atelier : panneau en creux, quadrillage fin et majeur, cotes pointillées, vis aux coins. */
  mat(rect: Rect): Painted {
    const { base, line } = this.theme.mat;
    const [canvas, ctx] = this.canvas(rect.width, rect.height);
    const radius = 26;
    roundRect(ctx, 0, 0, rect.width, rect.height, radius);
    const body = ctx.createLinearGradient(0, 0, 0, rect.height);
    body.addColorStop(0, css(base, 0.34));
    body.addColorStop(1, css(shade(base, -0.15), 0.42));
    ctx.fillStyle = body;
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, rect.width, rect.height, radius);
    ctx.clip();
    // Quadrillage aligné sur le centre : le plateau tombe « juste » sur le plan.
    const step = 18;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    for (let k = -Math.ceil(cx / step); k * step <= cx; k++) {
      const x = Math.round(cx + k * step) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.strokeStyle = css(line, k % 5 === 0 ? 0.13 : 0.06);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let k = -Math.ceil(cy / step); k * step <= cy; k++) {
      const y = Math.round(cy + k * step) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.strokeStyle = css(line, k % 5 === 0 ? 0.13 : 0.06);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Ombre portée intérieure (panneau en creux) et lumière en bas.
    const inner = ctx.createLinearGradient(0, 0, 0, 22);
    inner.addColorStop(0, 'rgba(8, 24, 60, 0.28)');
    inner.addColorStop(1, 'rgba(8, 24, 60, 0)');
    ctx.fillStyle = inner;
    ctx.fillRect(0, 0, rect.width, 22);
    ctx.restore();
    roundRect(ctx, 1, 1, rect.width - 2, rect.height - 2, radius - 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = css(line, 0.22);
    ctx.stroke();
    // Cotes pointillées en retrait.
    roundRect(ctx, 12, 12, rect.width - 24, rect.height - 24, radius - 10);
    ctx.setLineDash([6, 7]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = css(line, 0.2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y] of [
      [14, 14],
      [rect.width - 14, 14],
      [14, rect.height - 14],
      [rect.width - 14, rect.height - 14],
    ] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = css(line, 0.35);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.strokeStyle = css(base, 0.8);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    return { texture: this.texture(canvas), x: rect.x, y: rect.y };
  }

  tray(layout: Layout, maxSlots: number): Painted {
    const { tray, screwRadius: r } = layout;
    const margin = 16;
    const [canvas, ctx] = this.canvas(tray.width + margin * 2, tray.height + margin * 2);
    ctx.translate(margin - tray.x, margin - tray.y);
    ctx.save();
    ctx.shadowColor = 'rgba(12, 28, 64, 0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    roundRect(ctx, tray.x, tray.y, tray.width, tray.height, 20);
    const body = ctx.createLinearGradient(0, tray.y, 0, tray.y + tray.height);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(1, '#dfe8f4');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, tray.x + 1, tray.y + 1, tray.width - 2, tray.height - 2, 19);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(160, 182, 212, 0.9)';
    ctx.stroke();
    for (let i = 0; i < maxSlots; i++) this.socket(ctx, slotCenter(layout.toolbox, i, maxSlots), r * 1.16, this.theme.tray.hole);
    return { texture: this.texture(canvas), x: tray.x - margin, y: tray.y - margin };
  }

  /** Alvéole en creux (zone tampon, caisses). */
  private socket(ctx: CanvasRenderingContext2D, at: Point, r: number, base: number, highlight = 0.9): void {
    const g = ctx.createRadialGradient(at.x, at.y - r * 0.35, r * 0.1, at.x, at.y, r);
    g.addColorStop(0, css(shade(base, -0.28)));
    g.addColorStop(1, css(shade(base, 0.12)));
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r - 0.8, Math.PI * 1.05, Math.PI * 1.95);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(at.x, at.y, r + 0.6, Math.PI * 0.08, Math.PI * 0.92);
    ctx.strokeStyle = `rgba(255, 255, 255, ${highlight})`;
    ctx.stroke();
  }

  /** Emplacement verrouillé : pastille claire avec « + ». */
  lockedSlot(r: number): Texture {
    const key = `locked-${r}`;
    const cached = this.screws.get(key);
    if (cached) return cached;
    const size = r * 2.6;
    const [canvas, ctx] = this.canvas(size, size);
    const c = size / 2;
    const g = ctx.createLinearGradient(0, c - r, 0, c + r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, css(this.theme.tray.locked));
    ctx.beginPath();
    ctx.arc(c, c, r * 1.12, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = css(this.theme.tray.lockedIcon, 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, r * 0.22);
    ctx.beginPath();
    ctx.moveTo(c - r * 0.42, c);
    ctx.lineTo(c + r * 0.42, c);
    ctx.moveTo(c, c - r * 0.42);
    ctx.lineTo(c, c + r * 0.42);
    ctx.strokeStyle = css(this.theme.tray.lockedIcon);
    ctx.stroke();
    const texture = this.texture(canvas);
    this.screws.set(key, texture);
    return texture;
  }

  /** Caisse en plastique brillant : ombre, corps en dégradé, bandeau avant, reflet, alvéoles. */
  crate(rect: Rect, color: number, holes: Point[], holeRadius: number): Painted {
    const margin = 16;
    const [canvas, ctx] = this.canvas(rect.width + margin * 2, rect.height + margin * 2);
    ctx.translate(margin - rect.x, margin - rect.y);
    const radius = Math.min(16, rect.height * 0.3);
    ctx.save();
    ctx.shadowColor = 'rgba(12, 28, 64, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);
    const body = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.height);
    body.addColorStop(0, css(shade(color, 0.28)));
    body.addColorStop(0.5, css(color));
    body.addColorStop(1, css(shade(color, -0.22)));
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();
    // Bandeau avant plus sombre, sous les alvéoles.
    const bandY = rect.y + rect.height * 0.86;
    roundRect(ctx, rect.x + 3, bandY, rect.width - 6, rect.y + rect.height - bandY - 3, radius * 0.4);
    ctx.fillStyle = css(shade(color, -0.2));
    ctx.fill();
    // Reflet du dessus.
    const gloss = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.height * 0.4);
    gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, rect.x + 4, rect.y + 3, rect.width - 8, rect.height * 0.4, radius * 0.7);
    ctx.fillStyle = gloss;
    ctx.fill();
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, radius);
    ctx.lineWidth = 2;
    ctx.strokeStyle = css(shade(color, -0.5));
    ctx.stroke();
    for (const h of holes) this.socket(ctx, h, holeRadius, shade(color, -0.32), 0.35);
    return { texture: this.texture(canvas), x: rect.x - margin, y: rect.y - margin };
  }

  /** Couvercle de caisse (posé à la fermeture). */
  lid(rect: Rect, color: number): Painted {
    const margin = 14;
    const [canvas, ctx] = this.canvas(rect.width + margin * 2, rect.height + margin * 2);
    ctx.translate(margin - rect.x, margin - rect.y);
    const x = rect.x - 3;
    const y = rect.y - 3;
    const w = rect.width + 6;
    const h = rect.height + 6;
    const radius = Math.min(17, h * 0.3);
    ctx.save();
    ctx.shadowColor = 'rgba(12, 28, 64, 0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, x, y, w, h, radius);
    const body = ctx.createLinearGradient(0, y, 0, y + h);
    body.addColorStop(0, css(shade(color, 0.35)));
    body.addColorStop(1, css(shade(color, -0.12)));
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, x, y, w, h, radius);
    ctx.lineWidth = 2;
    ctx.strokeStyle = css(shade(color, -0.5));
    ctx.stroke();
    const handleW = w * 0.34;
    roundRect(ctx, x + (w - handleW) / 2, y + h * 0.4, handleW, h * 0.2, h * 0.1);
    ctx.fillStyle = css(shade(color, -0.4));
    ctx.fill();
    const gloss = ctx.createLinearGradient(0, y, 0, y + h * 0.45);
    gloss.addColorStop(0, 'rgba(255,255,255,0.6)');
    gloss.addColorStop(1, 'rgba(255,255,255,0)');
    roundRect(ctx, x + 4, y + 3, w - 8, h * 0.42, radius * 0.7);
    ctx.fillStyle = gloss;
    ctx.fill();
    return { texture: this.texture(canvas), x: rect.x - margin, y: rect.y - margin };
  }
}
