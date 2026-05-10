export type StrokeKind = 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse';

export interface StrokeData {
  kind: StrokeKind;
  color: string;
  size: number;
  filled: boolean;
  /** Flat array of absolute flow coords [x0,y0,x1,y1,...]. */
  points: number[];
  /** SVG viewBox in flow coords; locked at draw-finish so resize/move don't change geometry. */
  viewBox: { x: number; y: number; w: number; h: number };
  authorId?: string | number;
}

export function buildPenPath(points: number[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]} ${points[1]}`;
  if (points.length === 2) return d;
  for (let i = 2; i < points.length - 2; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    const xn = points[i + 2];
    const yn = points[i + 3];
    const mx = (x + xn) / 2;
    const my = (y + yn) / 2;
    d += ` Q ${x} ${y} ${mx} ${my}`;
  }
  d += ` L ${points[points.length - 2]} ${points[points.length - 1]}`;
  return d;
}

export function pointsBounds(points: number[]): { x: number; y: number; w: number; h: number } {
  if (points.length < 2) return { x: 0, y: 0, w: 1, h: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    x: minX,
    y: minY,
    w: Math.max(1, maxX - minX),
    h: Math.max(1, maxY - minY),
  };
}

/**
 * Bounding box for a stroke considering its kind (rect/ellipse use first 2 points
 * as opposite corners; pen/line/arrow use the actual point list).
 */
export function strokeGeometryBounds(s: Pick<StrokeData, 'kind' | 'points'>): { x: number; y: number; w: number; h: number } {
  if (s.kind === 'rect' || s.kind === 'ellipse') {
    if (s.points.length < 4) return pointsBounds(s.points);
    const [x1, y1, x2, y2] = s.points;
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    return { x, y, w: Math.max(1, Math.abs(x2 - x1)), h: Math.max(1, Math.abs(y2 - y1)) };
  }
  return pointsBounds(s.points);
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function strokeHit(s: Pick<StrokeData, 'kind' | 'points' | 'size' | 'filled'>, x: number, y: number, threshold: number): boolean {
  const t = threshold + s.size / 2;
  if (s.kind === 'pen' || s.kind === 'line' || s.kind === 'arrow') {
    if (s.points.length < 4) {
      if (s.points.length >= 2) {
        return Math.hypot(x - s.points[0], y - s.points[1]) <= t;
      }
      return false;
    }
    if (s.kind === 'pen') {
      for (let i = 0; i < s.points.length - 2; i += 2) {
        if (distToSegment(x, y, s.points[i], s.points[i + 1], s.points[i + 2], s.points[i + 3]) <= t) return true;
      }
      return false;
    }
    return distToSegment(x, y, s.points[0], s.points[1], s.points[2], s.points[3]) <= t;
  }
  const b = strokeGeometryBounds(s as StrokeData);
  if (s.kind === 'rect') {
    const inside = x >= b.x - t && x <= b.x + b.w + t && y >= b.y - t && y <= b.y + b.h + t;
    if (!inside) return false;
    if (s.filled) return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    const onLeft = Math.abs(x - b.x) <= t && y >= b.y - t && y <= b.y + b.h + t;
    const onRight = Math.abs(x - (b.x + b.w)) <= t && y >= b.y - t && y <= b.y + b.h + t;
    const onTop = Math.abs(y - b.y) <= t && x >= b.x - t && x <= b.x + b.w + t;
    const onBottom = Math.abs(y - (b.y + b.h)) <= t && x >= b.x - t && x <= b.x + b.w + t;
    return onLeft || onRight || onTop || onBottom;
  }
  if (s.kind === 'ellipse') {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const rx = b.w / 2;
    const ry = b.h / 2;
    if (rx <= 0 || ry <= 0) return false;
    const norm = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
    if (s.filled) return norm <= 1;
    const eps = Math.max(0.05, t / Math.min(rx, ry));
    return norm >= 1 - eps && norm <= 1 + eps;
  }
  return false;
}
