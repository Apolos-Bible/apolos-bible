export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Breathing room kept between a newly placed node and the ones already there. */
export const PLACEMENT_GAP = 24

const right = (r: Rect) => r.x + r.width
const bottom = (r: Rect) => r.y + r.height

/** Do two rects overlap, once each is grown by half the gap on every side? */
export function overlaps(a: Rect, b: Rect, gap = PLACEMENT_GAP): boolean {
  return (
    a.x < right(b) + gap
    && right(a) + gap > b.x
    && a.y < bottom(b) + gap
    && bottom(a) + gap > b.y
  )
}

function isFree(candidate: Rect, obstacles: Rect[], gap: number): boolean {
  return !obstacles.some((o) => overlaps(candidate, o, gap))
}

/** Squared distance between two top-left corners — enough to compare by. */
function distance2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

/**
 * Where to actually drop something on the canvas so it lands *near* where it was
 * meant to, without covering what is already there.
 *
 * Dropping on top of existing work is the worst outcome: whatever was
 * underneath is hidden, and on a shared canvas it may be someone else's. So the
 * desired spot is used when it is free, and otherwise we look for the closest
 * free one.
 *
 * The candidates are the four sides of every node in the way — slide right,
 * left, below or above it, keeping the other axis where it was wanted — which
 * makes the result read as "it moved aside" rather than "it went somewhere
 * random". A ring search backs that up when the canvas is crowded enough that
 * every edge is blocked too, and as a last resort it goes below everything.
 *
 * @param desired  the rect as it would have been placed with no obstacles
 * @param obstacles  the nodes already on the canvas
 */
export function findFreeSpot(
  desired: Rect,
  obstacles: Rect[],
  gap = PLACEMENT_GAP,
): { x: number; y: number } {
  if (obstacles.length === 0 || isFree(desired, obstacles, gap)) {
    return { x: desired.x, y: desired.y }
  }

  const candidates: { x: number; y: number }[] = []

  for (const o of obstacles) {
    // Slide along one axis, stay put on the other.
    candidates.push({ x: right(o) + gap, y: desired.y })
    candidates.push({ x: o.x - desired.width - gap, y: desired.y })
    candidates.push({ x: desired.x, y: bottom(o) + gap })
    candidates.push({ x: desired.x, y: o.y - desired.height - gap })
  }

  const free = candidates
    .filter((c) => isFree({ ...desired, ...c }, obstacles, gap))
    .sort(
      (a, b) =>
        distance2(a.x, a.y, desired.x, desired.y) - distance2(b.x, b.y, desired.x, desired.y),
    )

  if (free.length > 0) return free[0]

  // Crowded: walk outward in rings until something fits. The step follows the
  // node's own size so a big node does not creep out by pixels.
  const step = Math.max(80, Math.min(desired.width, desired.height) / 2)
  for (let ring = 1; ring <= 24; ring++) {
    const radius = ring * step
    let best: { x: number; y: number } | null = null
    let bestD = Infinity

    for (let i = 0; i < ring * 8; i++) {
      const angle = (i / (ring * 8)) * Math.PI * 2
      const c = {
        x: desired.x + Math.cos(angle) * radius,
        y: desired.y + Math.sin(angle) * radius,
      }
      if (!isFree({ ...desired, ...c }, obstacles, gap)) continue
      const d = distance2(c.x, c.y, desired.x, desired.y)
      if (d < bestD) {
        bestD = d
        best = c
      }
    }

    if (best) return best
  }

  // Nothing fit anywhere near: park it under everything, which is at least
  // predictable and never hides anything.
  const lowest = obstacles.reduce((max, o) => Math.max(max, bottom(o)), -Infinity)
  return { x: desired.x, y: lowest + gap }
}

/**
 * Same idea for a vertical stack placed as one block (a chain of verses): find
 * room for the whole column, then hand back where its top-left goes.
 */
export function findFreeSpotForStack(
  desired: { x: number; y: number; width: number },
  heights: number[],
  innerGap: number,
  obstacles: Rect[],
  gap = PLACEMENT_GAP,
): { x: number; y: number } {
  const totalHeight =
    heights.reduce((sum, h) => sum + h, 0) + Math.max(0, heights.length - 1) * innerGap

  return findFreeSpot({ ...desired, height: totalHeight }, obstacles, gap)
}
