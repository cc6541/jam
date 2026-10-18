// Mise en page pure : du repère du niveau au repère écran. Aucune dépendance à Pixi.
// Disposition du genre : boîtes en haut, zone tampon juste dessous, plateau au centre (zoomé sur son contenu).
import type { LevelDef, Point } from '@jam/engine-screw';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  /** Rangée des boîtes ouvertes, en haut. */
  boxes: Rect;
  /** Bac de la toolbox (fond). */
  tray: Rect;
  /** Rangée des emplacements de la toolbox, dans le bac. */
  toolbox: Rect;
  /** Établi : zone de jeu sous la zone tampon, dans laquelle le plateau est centré. */
  mat: Rect;
  /** Plateau à l'écran : cadre du contenu du niveau, centré. */
  board: Rect;
  /** Coin haut-gauche du contenu, dans le repère du niveau. */
  origin: Point;
  /** Pixels écran par unité du niveau. */
  scale: number;
  screwRadius: number;
}

const GAP = 10;
/** Marge autour du contenu, en unités du niveau (place pour les têtes de vis et les ombres). */
const CONTENT_PAD = 5;
/** Zoom maximal : un petit niveau grossit, sans devenir caricatural. */
const MAX_SCALE = 7;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Rectangle englobant toutes les plaques du niveau. */
export function contentBounds(level: Pick<LevelDef, 'plates' | 'board'>): Rect {
  const points = level.plates.flatMap((p) => p.polygon);
  if (points.length === 0) return { x: 0, y: 0, width: level.board.width, height: level.board.height };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function computeLayout(level: Pick<LevelDef, 'plates' | 'board' | 'rules'>, viewport: { width: number; height: number }): Layout {
  const { width: w, height: h } = viewport;
  const boxesH = clamp(h * 0.13, 64, 112);
  const trayH = clamp(h * 0.09, 50, 78);
  const boxes = { x: GAP, y: GAP, width: w - 2 * GAP, height: boxesH };
  const tray = { x: GAP + 6, y: boxes.y + boxesH + GAP * 0.6, width: w - 2 * GAP - 12, height: trayH };
  const toolbox = { x: tray.x + 10, y: tray.y + 6, width: tray.width - 20, height: trayH - 12 };

  const areaTop = tray.y + trayH + GAP * 1.8;
  const area = { x: GAP, y: areaTop, width: w - 2 * GAP, height: Math.max(40, h - areaTop - GAP) };
  const content = contentBounds(level);
  const cw = content.width + 2 * CONTENT_PAD;
  const ch = content.height + 2 * CONTENT_PAD;
  const scale = Math.min(area.width / cw, area.height / ch, MAX_SCALE);
  const board = {
    x: area.x + (area.width - cw * scale) / 2,
    y: area.y + (area.height - ch * scale) / 2,
    width: cw * scale,
    height: ch * scale,
  };

  // Une vis doit tenir partout où elle va : sur le plateau, dans un emplacement de toolbox, dans une boîte.
  const capacity = level.rules.boxCapacity;
  const boxCount = Math.max(1, level.rules.activeBoxes);
  const maxSlots = Math.max(1, level.rules.toolboxMaxSlots);
  const screwRadius = clamp(
    Math.min(
      3.8 * scale,
      (toolbox.width / maxSlots) * 0.38,
      toolbox.height * 0.4,
      (boxes.width / boxCount - 28) / (2.5 * capacity + 1),
      boxesH * 0.26,
    ),
    9,
    26,
  );

  return { boxes, tray, toolbox, mat: area, board, origin: { x: content.x - CONTENT_PAD, y: content.y - CONTENT_PAD }, scale, screwRadius };
}

export function toScreen(layout: Layout, p: Point): Point {
  return { x: layout.board.x + (p.x - layout.origin.x) * layout.scale, y: layout.board.y + (p.y - layout.origin.y) * layout.scale };
}

/** Centre de l'emplacement `index` parmi `count` répartis horizontalement dans `rect`. */
export function slotCenter(rect: Rect, index: number, count: number): Point {
  const step = rect.width / Math.max(1, count);
  return { x: rect.x + step * (index + 0.5), y: rect.y + rect.height / 2 };
}

/** Taille d'une boîte (caisse) pour `capacity` vis. */
export function crateSize(layout: Layout, count: number, capacity: number): { width: number; height: number } {
  const r = layout.screwRadius;
  return {
    width: Math.min(layout.boxes.width / Math.max(1, count) - 14, r * 2.5 * capacity + r * 1.2),
    height: Math.min(layout.boxes.height * 0.92, r * 3.6),
  };
}

/** Position d'une vis rangée dans la boîte `box` (parmi `boxes`), à l'emplacement `slot` sur `capacity`. */
export function boxScrewCenter(layout: Layout, box: number, boxes: number, slot: number, capacity: number): Point {
  const center = slotCenter(layout.boxes, box, boxes);
  const spacing = layout.screwRadius * 2.5;
  return { x: center.x + (slot - (capacity - 1) / 2) * spacing, y: center.y + layout.screwRadius * 0.35 };
}
