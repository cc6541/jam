// Mise en page pure : du repère du niveau au repère écran. Aucune dépendance à Pixi.
import type { LevelDef, Point } from '@jam/engine-screw';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  /** Zone des boîtes ouvertes, en haut. */
  boxes: Rect;
  /** Plateau, au milieu. */
  board: Rect;
  /** Toolbox, en bas. */
  toolbox: Rect;
  /** Pixels écran par unité du niveau. */
  scale: number;
  screwRadius: number;
}

const GAP = 12;

export function computeLayout(level: LevelDef, viewport: { width: number; height: number }): Layout {
  const boxesHeight = Math.round(viewport.height * 0.14);
  const toolboxHeight = Math.round(viewport.height * 0.1);
  const available = {
    width: viewport.width - 2 * GAP,
    height: viewport.height - boxesHeight - toolboxHeight - 4 * GAP,
  };
  const scale = Math.min(available.width / level.board.width, available.height / level.board.height);
  const width = level.board.width * scale;
  const height = level.board.height * scale;
  return {
    boxes: { x: GAP, y: GAP, width: viewport.width - 2 * GAP, height: boxesHeight },
    board: { x: (viewport.width - width) / 2, y: boxesHeight + 2 * GAP + (available.height - height) / 2, width, height },
    toolbox: { x: GAP, y: viewport.height - toolboxHeight - GAP, width: viewport.width - 2 * GAP, height: toolboxHeight },
    scale,
    screwRadius: Math.max(8, Math.min(22, 3.2 * scale)),
  };
}

export function toScreen(layout: Layout, p: Point): Point {
  return { x: layout.board.x + p.x * layout.scale, y: layout.board.y + p.y * layout.scale };
}

/** Centre de l'emplacement `index` parmi `count` répartis horizontalement dans `rect`. */
export function slotCenter(rect: Rect, index: number, count: number): Point {
  const step = rect.width / Math.max(1, count);
  return { x: rect.x + step * (index + 0.5), y: rect.y + rect.height / 2 };
}

/** Position d'une vis rangée dans la boîte `box` (parmi `boxes`), à l'emplacement `slot` sur `capacity`. */
export function boxScrewCenter(layout: Layout, box: number, boxes: number, slot: number, capacity: number): Point {
  const center = slotCenter(layout.boxes, box, boxes);
  const spacing = layout.screwRadius * 2.4;
  return { x: center.x + (slot - (capacity - 1) / 2) * spacing, y: center.y + layout.screwRadius * 0.4 };
}
