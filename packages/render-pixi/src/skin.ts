// Dessin vectoriel de l'habillage : aucune règle de jeu, seulement des formes.
// Aplats, traits et reflets uniquement (pas de filtre) ; les décors sont ensuite figés en textures par la vue.
import { Container, Graphics } from 'pixi.js';
import type { PatternId, Point } from '@jam/engine-screw';
import type { Layout, Rect } from './layout';
import { slotCenter } from './layout';
import type { Material, ScrewStyle, Theme } from './theme';

/** Éclaircit (amount > 0) ou assombrit (amount < 0) une couleur 0xRRGGBB. */
export function shade(color: number, amount: number): number {
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * k);
  return (mix((color >> 16) & 255) << 16) | (mix((color >> 8) & 255) << 8) | mix(color & 255);
}

export function centroid(points: readonly Point[]): Point {
  const n = Math.max(1, points.length);
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

/** Polygone réduit vers son centre (biseau intérieur). */
export function inset(points: readonly Point[], factor: number): Point[] {
  const c = centroid(points);
  return points.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }));
}

function bounds(points: readonly Point[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Tracé d'un polygone à coins arrondis (rayon borné par la moitié de l'arête la plus courte). */
export function roundedPath(g: Graphics, points: readonly Point[], radius: number): Graphics {
  const n = points.length;
  if (n < 3) return g;
  const at = (i: number) => points[((i % n) + n) % n] as Point;
  let r = radius;
  for (let i = 0; i < n; i++) r = Math.min(r, Math.hypot(at(i + 1).x - at(i).x, at(i + 1).y - at(i).y) / 2);
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = mid(at(n - 1), at(0));
  g.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(at(i), at(i + 1));
    g.arcTo(at(i).x, at(i).y, m.x, m.y, r);
  }
  return g.closePath();
}

/** Veinage : traits ondulés découpés par la planche (masque). */
function woodGrain(points: readonly Point[], mat: Material, radius: number): Container {
  const c = new Container();
  const b = bounds(points);
  const lines = new Graphics();
  const step = Math.max(6, b.height / 12);
  for (let y = b.y + step / 2, i = 0; y < b.y + b.height; y += step, i++) {
    const wobble = 1.2 + (i % 3) * 0.8;
    lines
      .moveTo(b.x, y)
      .bezierCurveTo(b.x + b.width * 0.3, y - wobble, b.x + b.width * 0.65, y + wobble, b.x + b.width, y)
      .stroke({ width: i % 4 === 0 ? 1.6 : 1, color: mat.grain ?? mat.dark, alpha: 0.4 });
  }
  const mask = roundedPath(new Graphics(), points, radius).fill(0xffffff);
  lines.mask = mask;
  c.addChild(lines, mask);
  return c;
}

/**
 * Planche percée : ombre portée (plus marquée en hauteur), bois veiné, biseau clair, trous de vis.
 * Les trous restent visibles quand la vis sort : c'est ce qui rend l'état lisible.
 */
export function plateGraphic(points: Point[], layer: number, theme: Theme, holes: Point[], holeRadius: number): Container {
  const mat = theme.plate.layers[layer % theme.plate.layers.length] as Material;
  const b = bounds(points);
  const radius = Math.min(14, Math.min(b.width, b.height) * 0.18);
  const lift = 4 + Math.min(layer, 4) * 1.5;
  const c = new Container();
  c.addChild(
    roundedPath(new Graphics(), points.map((p) => ({ x: p.x + lift * 0.4, y: p.y + lift })), radius).fill({ color: 0x0b1a33, alpha: 0.28 }),
    roundedPath(new Graphics(), points, radius).fill({ color: mat.base, alpha: theme.plate.alpha }).stroke({ width: 2.5, color: mat.dark }),
    woodGrain(points, mat, radius),
    roundedPath(new Graphics(), inset(points, 0.94), radius * 0.8).stroke({ width: 2, color: mat.light, alpha: 0.6 }),
  );
  const g = new Graphics();
  for (const h of holes) {
    g.circle(h.x, h.y, holeRadius).fill(theme.plate.hole).stroke({ width: 1.5, color: mat.dark, alpha: 0.8 });
    g.circle(h.x, h.y + holeRadius * 0.18, holeRadius * 0.78).fill(theme.plate.holeDeep);
    // Reflet sous le trou : on part du début de l'arc, sinon le tracé se relie à l'origine.
    const start = Math.PI * 0.15;
    g.moveTo(h.x + Math.cos(start) * (holeRadius + 1), h.y + Math.sin(start) * (holeRadius + 1))
      .arc(h.x, h.y, holeRadius + 1, start, Math.PI * 0.85)
      .stroke({ width: 1.5, color: mat.light, alpha: 0.7 });
  }
  c.addChild(g);
  return c;
}

/** Tapis translucide sous le plateau : délimite la zone de jeu sans l'enfermer. */
export function matGraphic(board: Rect, theme: Theme): Graphics {
  return new Graphics()
    .roundRect(board.x - 6, board.y - 6, board.width + 12, board.height + 12, 22)
    .fill({ color: theme.mat.fill, alpha: theme.mat.alpha })
    .stroke({ width: 2, color: 0xffffff, alpha: theme.mat.alpha * 1.6 });
}

/** Bac de la toolbox : panneau blanc, emplacements creusés. */
export function trayGraphic(layout: Layout, theme: Theme, maxSlots: number): Graphics {
  const { tray, screwRadius: r } = layout;
  const g = new Graphics()
    .roundRect(tray.x, tray.y + 4, tray.width, tray.height, 18)
    .fill({ color: 0x0b1a33, alpha: 0.18 })
    .roundRect(tray.x, tray.y, tray.width, tray.height, 18)
    .fill({ color: theme.tray.fill, alpha: theme.tray.alpha })
    .stroke({ width: 2, color: theme.tray.edge });
  for (let i = 0; i < maxSlots; i++) {
    const at = slotCenter(layout.toolbox, i, maxSlots);
    g.circle(at.x, at.y, r * 1.12).fill(theme.tray.hole).stroke({ width: 2, color: theme.tray.holeRim });
    g.circle(at.x, at.y - r * 0.12, r * 0.95).fill({ color: theme.tray.holeRim, alpha: 0.28 });
  }
  return g;
}

/** Emplacements pas encore débloqués : pastille claire avec « + ». */
export function lockedSlots(layout: Layout, theme: Theme, from: number, maxSlots: number): Graphics {
  const g = new Graphics();
  const r = layout.screwRadius;
  for (let i = from; i < maxSlots; i++) {
    const at = slotCenter(layout.toolbox, i, maxSlots);
    const k = r * 0.45;
    g.circle(at.x, at.y, r * 1.14)
      .fill(theme.tray.locked)
      .stroke({ width: 2, color: theme.tray.edge })
      .moveTo(at.x - k, at.y)
      .lineTo(at.x + k, at.y)
      .moveTo(at.x, at.y - k)
      .lineTo(at.x, at.y + k)
      .stroke({ width: Math.max(2.5, r * 0.22), color: theme.tray.lockedIcon, cap: 'round' });
  }
  return g;
}

/** Caisse colorée : corps, bandeau avant plus sombre, trous où viendront les vis. */
export function crateBody(rect: Rect, fill: number, holes: Point[], holeRadius: number, theme: Theme): Graphics {
  const g = new Graphics()
    .roundRect(rect.x, rect.y + 5, rect.width, rect.height, 14)
    .fill({ color: 0x0b1a33, alpha: 0.25 })
    .roundRect(rect.x, rect.y, rect.width, rect.height, 14)
    .fill(fill)
    .stroke({ width: 2.5, color: shade(fill, -0.45) })
    .roundRect(rect.x + 3, rect.y + rect.height * 0.62, rect.width - 6, rect.height * 0.38 - 3, 10)
    .fill({ color: shade(fill, -0.22) })
    .roundRect(rect.x + 4, rect.y + 3, rect.width - 8, rect.height * 0.22, 9)
    .fill({ color: 0xffffff, alpha: 0.28 });
  for (const h of holes) {
    g.circle(h.x, h.y, holeRadius).fill(theme.crate.hole).stroke({ width: 1.5, color: shade(fill, -0.55) });
  }
  return g;
}

/** Couvercle de caisse (animé à la fermeture). */
export function crateLid(rect: Rect, fill: number): Graphics {
  const handleW = rect.width * 0.3;
  return new Graphics()
    .roundRect(rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6, 15)
    .fill(shade(fill, 0.08))
    .stroke({ width: 2.5, color: shade(fill, -0.45) })
    .roundRect(rect.x + 4, rect.y + 2, rect.width - 8, rect.height * 0.25, 9)
    .fill({ color: 0xffffff, alpha: 0.3 })
    .roundRect(rect.x + (rect.width - handleW) / 2, rect.y + rect.height * 0.42, handleW, rect.height * 0.16, 6)
    .fill(shade(fill, -0.35));
}

/** Tête de vis : anneau sombre, dôme coloré, reflet, motif gravé (couleur + motif, invariant 6), liseré blanc. */
export function screwHead(g: Graphics, r: number, style: ScrewStyle): void {
  g.circle(0, 0, r).fill(shade(style.fill, -0.3)).stroke({ width: Math.max(1.5, r / 10), color: 0xffffff, alpha: 0.9 });
  g.circle(0, 0, r * 0.84).fill(style.fill);
  g.circle(-r * 0.12, -r * 0.16, r * 0.6).fill({ color: shade(style.fill, 0.4), alpha: 0.35 });
  drawPattern(g, style.pattern, r * 0.52, 0x000000, 0.32, r * 0.07);
  drawPattern(g, style.pattern, r * 0.52, 0xffffff, 0.95, 0);
  g.ellipse(-r * 0.34, -r * 0.5, r * 0.28, r * 0.13).fill({ color: 0xffffff, alpha: 0.6 });
}

export function screwShadow(g: Graphics, r: number): void {
  g.circle(0, 0, r * 1.02).fill({ color: 0x0b1a33, alpha: 0.32 });
}

export function drawPattern(g: Graphics, pattern: PatternId, r: number, color: number, alpha: number, offset: number): void {
  const ink = { color, alpha };
  const line = { width: Math.max(2, r / 3.4), color, alpha, cap: 'round' as const };
  const o = offset;
  switch (pattern) {
    case 'dots':
      for (const [x, y] of [[-0.5, -0.35], [0.5, -0.35], [0, 0.55]] as const) g.circle(x * r + o, y * r + o, r * 0.26).fill(ink);
      return;
    case 'stripes':
      g.moveTo(-r * 0.75 + o, r * 0.2 + o).lineTo(r * 0.2 + o, -r * 0.75 + o).moveTo(-r * 0.2 + o, r * 0.75 + o).lineTo(r * 0.75 + o, -r * 0.2 + o).stroke(line);
      return;
    case 'cross':
      g.moveTo(-r + o, o).lineTo(r + o, o).moveTo(o, -r + o).lineTo(o, r + o).stroke(line);
      return;
    case 'wave':
      g.moveTo(-r + o, o);
      for (let i = 1; i <= 8; i++) g.lineTo(-r + (i * 2 * r) / 8 + o, Math.sin((i / 8) * Math.PI * 2) * r * 0.42 + o);
      g.stroke(line);
      return;
    case 'grid':
      g.rect(-r * 0.62 + o, -r * 0.62 + o, r * 1.24, r * 1.24).moveTo(o, -r * 0.62 + o).lineTo(o, r * 0.62 + o).moveTo(-r * 0.62 + o, o).lineTo(r * 0.62 + o, o).stroke(line);
      return;
    case 'plain':
      g.circle(o, o, r * 0.55).stroke(line);
      return;
  }
}
