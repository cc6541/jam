// Dessin vectoriel de l'habillage « atelier » : aucune règle de jeu, seulement des formes.
// Tout est fait d'aplats, de traits et de reflets (pas de filtres) pour tenir 60 fps sur mobile d'entrée de gamme.
import { Container, Graphics, Text } from 'pixi.js';
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

/** Veinage : traits horizontaux ondulés, découpés par le polygone (masque). */
function woodGrain(points: readonly Point[], mat: Material): Container {
  const c = new Container();
  const b = bounds(points);
  const lines = new Graphics();
  const step = Math.max(7, b.height / 14);
  for (let y = b.y + step / 2, i = 0; y < b.y + b.height; y += step, i++) {
    const wobble = 1.5 + (i % 3);
    lines
      .moveTo(b.x, y)
      .bezierCurveTo(b.x + b.width * 0.3, y - wobble, b.x + b.width * 0.65, y + wobble, b.x + b.width, y)
      .stroke({ width: i % 4 === 0 ? 1.6 : 1, color: mat.grain ?? mat.dark, alpha: 0.45 });
  }
  const mask = new Graphics().poly([...points]).fill(0xffffff);
  lines.mask = mask;
  c.addChild(lines, mask);
  return c;
}

/** Plaque métal ou bois : ombre portée, corps, biseau clair, veinage éventuel. */
export function plateGraphic(points: Point[], kind: 'metal' | 'wood', theme: Theme): Container {
  const mat = theme.plate[kind];
  const c = new Container();
  c.addChild(
    new Graphics().poly(points.map((p) => ({ x: p.x + 2.5, y: p.y + 4 }))).fill({ color: 0x000000, alpha: 0.35 }),
    new Graphics()
      .poly(points)
      .fill({ color: mat.base, alpha: theme.plate.alpha })
      .stroke({ width: 2.5, color: mat.dark, alpha: 0.95 }),
  );
  if (kind === 'wood') c.addChild(woodGrain(points, mat));
  c.addChild(new Graphics().poly(inset(points, 0.93)).stroke({ width: 2, color: mat.light, alpha: 0.5 }));
  return c;
}

/** Cadre en bois autour du plateau, creux sombre au centre, vis de coin. */
export function frameGraphic(board: Rect, theme: Theme): Container {
  const { wood } = theme.frame;
  const pad = 11;
  const outer = { x: board.x - pad, y: board.y - pad, width: board.width + 2 * pad, height: board.height + 2 * pad };
  const c = new Container();
  c.addChild(
    new Graphics().roundRect(outer.x + 2, outer.y + 5, outer.width, outer.height, 16).fill({ color: 0x000000, alpha: 0.4 }),
    new Graphics().roundRect(outer.x, outer.y, outer.width, outer.height, 16).fill(wood.base).stroke({ width: 3, color: wood.dark }),
  );
  const outline = [
    { x: outer.x, y: outer.y },
    { x: outer.x + outer.width, y: outer.y },
    { x: outer.x + outer.width, y: outer.y + outer.height },
    { x: outer.x, y: outer.y + outer.height },
  ];
  c.addChild(woodGrain(outline, wood));
  c.addChild(
    new Graphics().roundRect(outer.x + 2, outer.y + 2, outer.width - 4, outer.height - 4, 14).stroke({ width: 2, color: wood.light, alpha: 0.6 }),
    new Graphics().roundRect(board.x - 3, board.y - 3, board.width + 6, board.height + 6, 9).fill(theme.frame.recess).stroke({ width: 3, color: shade(wood.dark, -0.4) }),
  );
  for (const [x, y] of [
    [outer.x + 7, outer.y + 7],
    [outer.x + outer.width - 7, outer.y + 7],
    [outer.x + 7, outer.y + outer.height - 7],
    [outer.x + outer.width - 7, outer.y + outer.height - 7],
  ] as const) {
    c.addChild(
      new Graphics()
        .circle(x, y, 4)
        .fill(theme.tray.metal.base)
        .stroke({ width: 1.5, color: theme.tray.metal.dark })
        .moveTo(x - 2.4, y - 2.4)
        .lineTo(x + 2.4, y + 2.4)
        .stroke({ width: 1.2, color: theme.tray.metal.dark }),
    );
  }
  return c;
}

const label = (text: string, size: number, fill: number, outline: number) => {
  const t = new Text({ text, style: { fill, fontSize: size, fontWeight: '800', stroke: { color: outline, width: Math.max(2, size / 4) } } });
  t.anchor.set(0.5);
  return t;
};

/** Bac de toolbox : plaque métal, titre, emplacements numérotés (tous visibles, jusqu'au maximum). */
export function trayGraphic(layout: Layout, theme: Theme, maxSlots: number, title: string): Container {
  const { tray } = layout;
  const mat = theme.tray.metal;
  const c = new Container();
  c.addChild(
    new Graphics().roundRect(tray.x + 2, tray.y + 5, tray.width, tray.height, 14).fill({ color: 0x000000, alpha: 0.4 }),
    new Graphics().roundRect(tray.x, tray.y, tray.width, tray.height, 14).fill(mat.base).stroke({ width: 3, color: mat.dark }),
    new Graphics().roundRect(tray.x + 3, tray.y + 3, tray.width - 6, tray.height - 6, 11).stroke({ width: 2, color: mat.light, alpha: 0.7 }),
    new Graphics()
      .roundRect(layout.toolbox.x - 6, layout.toolbox.y - 4, layout.toolbox.width + 12, layout.toolbox.height + 8, 10)
      .fill({ color: shade(mat.dark, -0.35), alpha: 0.9 }),
  );
  const title_ = label(title, 14, theme.tray.text, shade(mat.dark, -0.5));
  title_.position.set(tray.x + tray.width / 2, tray.y + 11);
  c.addChild(title_);
  for (const x of [tray.x + 14, tray.x + tray.width - 14]) {
    c.addChild(new Graphics().circle(x, tray.y + 11, 4).fill(mat.light).stroke({ width: 1.5, color: mat.dark }));
  }
  const step = layout.toolbox.width / maxSlots;
  const side = Math.min(step * 0.9, layout.screwRadius * 2.6);
  for (let i = 0; i < maxSlots; i++) {
    const at = slotCenter(layout.toolbox, i, maxSlots);
    c.addChild(
      new Graphics()
        .roundRect(at.x - side / 2, at.y - side / 2, side, side, 8)
        .fill(theme.tray.slot)
        .stroke({ width: 2, color: theme.tray.slotEdge })
        .roundRect(at.x - side / 2 + 2, at.y - side / 2 + side * 0.55, side - 4, side * 0.4, 6)
        .fill({ color: 0x000000, alpha: 0.18 }),
    );
    const n = label(String(i + 1), 11, theme.tray.text, shade(mat.dark, -0.5));
    n.position.set(at.x, layout.toolbox.y + layout.toolbox.height + 11);
    c.addChild(n);
  }
  return c;
}

/** Emplacements pas encore débloqués : voile sombre et « + ». */
export function lockedSlots(layout: Layout, from: number, maxSlots: number): Graphics {
  const g = new Graphics();
  const side = Math.min((layout.toolbox.width / maxSlots) * 0.9, layout.screwRadius * 2.6);
  for (let i = from; i < maxSlots; i++) {
    const at = slotCenter(layout.toolbox, i, maxSlots);
    const k = side * 0.18;
    g.roundRect(at.x - side / 2, at.y - side / 2, side, side, 8)
      .fill({ color: 0x0b0d12, alpha: 0.55 })
      .moveTo(at.x - k, at.y)
      .lineTo(at.x + k, at.y)
      .moveTo(at.x, at.y - k)
      .lineTo(at.x, at.y + k)
      .stroke({ width: 2.5, color: 0xffffff, alpha: 0.45, cap: 'round' });
  }
  return g;
}

/** Caisse d'une couleur : métal sombre, liseré coloré, fond creux. */
export function crateGraphic(rect: Rect, fill: number, theme: Theme): Graphics {
  const mat = theme.crate.metal;
  return new Graphics()
    .roundRect(rect.x + 1.5, rect.y + 4, rect.width, rect.height, 12)
    .fill({ color: 0x000000, alpha: 0.4 })
    .roundRect(rect.x, rect.y, rect.width, rect.height, 12)
    .fill(mat.base)
    .stroke({ width: 3, color: mat.dark })
    .roundRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, 8)
    .fill(theme.crate.recess)
    .stroke({ width: 3, color: fill })
    .roundRect(rect.x + 5, rect.y + 5, rect.width - 10, 7, 4)
    .fill({ color: fill, alpha: 0.85 });
}

/** Tête de vis : dôme bombé, anneau sombre, reflet, motif gravé (couleur + motif, invariant 6). */
export function screwHead(g: Graphics, r: number, style: ScrewStyle): void {
  const rim = Math.max(2, r / 7);
  g.circle(0, 0, r).fill(shade(style.fill, -0.18)).stroke({ width: rim, color: shade(style.fill, -0.62) });
  g.circle(0, 0, r * 0.8).fill(style.fill);
  g.circle(-r * 0.16, -r * 0.2, r * 0.52).fill({ color: shade(style.fill, 0.45), alpha: 0.3 });
  drawPattern(g, style.pattern, r * 0.55, 0x000000, 0.35, r * 0.07);
  drawPattern(g, style.pattern, r * 0.55, 0xffffff, 0.92, 0);
  g.ellipse(-r * 0.32, -r * 0.5, r * 0.3, r * 0.14).fill({ color: 0xffffff, alpha: 0.55 });
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
