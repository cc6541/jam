import type { Point } from './types';

function onSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  return (
    cross === 0 &&
    Math.min(a.x, b.x) <= p.x &&
    p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y &&
    p.y <= Math.max(a.y, b.y)
  );
}

/** Point à l'intérieur ou sur le bord du polygone (ray casting). */
export function polygonCovers(polygon: Point[], p: Point): boolean {
  let inside = false;
  let onEdge = false;
  polygon.forEach((a, i) => {
    const b = polygon.at(i - 1) ?? a;
    if (onSegment(p, a, b)) onEdge = true;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  });
  return onEdge || inside;
}
