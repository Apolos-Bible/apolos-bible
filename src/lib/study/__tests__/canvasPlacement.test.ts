import { describe, it, expect } from 'vitest'
import { findFreeSpot, findFreeSpotForStack, overlaps, PLACEMENT_GAP } from '../canvasPlacement'

const rect = (x: number, y: number, width = 100, height = 100) => ({ x, y, width, height })

/** Would this landing spot cover any of the obstacles? */
const covers = (spot: { x: number; y: number }, size: { width: number; height: number }, obstacles: ReturnType<typeof rect>[]) =>
  obstacles.some((o) => overlaps({ ...spot, ...size }, o, PLACEMENT_GAP))

describe('findFreeSpot', () => {
  it('leaves the desired spot alone on an empty canvas', () => {
    expect(findFreeSpot(rect(100, 100), [])).toEqual({ x: 100, y: 100 })
  })

  it('leaves it alone when nothing is in the way', () => {
    expect(findFreeSpot(rect(0, 0), [rect(500, 500)])).toEqual({ x: 0, y: 0 })
  })

  it('moves aside when the spot is taken, and does not cover what was there', () => {
    const obstacles = [rect(100, 100)]
    const spot = findFreeSpot(rect(100, 100), obstacles)

    expect(spot).not.toEqual({ x: 100, y: 100 })
    expect(covers(spot, { width: 100, height: 100 }, obstacles)).toBe(false)
  })

  it('slides along an axis instead of wandering off', () => {
    // One node dead centre: the closest free spots are its four sides, so the
    // result keeps one coordinate exactly where it was wanted.
    const spot = findFreeSpot(rect(100, 100), [rect(100, 100)])
    expect(spot.x === 100 || spot.y === 100).toBe(true)
  })

  it('takes the nearest free side rather than the first one it finds', () => {
    // Blocked, with much more room on the left than below.
    const obstacles = [
      rect(100, 100),
      rect(100, 240, 100, 600), // below is walled off for a long way
    ]
    const spot = findFreeSpot(rect(100, 100), obstacles)
    expect(covers(spot, { width: 100, height: 100 }, obstacles)).toBe(false)
    expect(spot.y).toBeLessThanOrEqual(100 + PLACEMENT_GAP)
  })

  it('finds a hole in a crowd', () => {
    // A 3×3 grid of nodes with the middle cell empty.
    const obstacles: ReturnType<typeof rect>[] = []
    for (let gx = 0; gx < 3; gx++) {
      for (let gy = 0; gy < 3; gy++) {
        if (gx === 1 && gy === 1) continue
        obstacles.push(rect(gx * 200, gy * 200, 100, 100))
      }
    }

    const spot = findFreeSpot(rect(200, 200), obstacles)
    expect(covers(spot, { width: 100, height: 100 }, obstacles)).toBe(false)
  })

  it('never lands on top of anything, wherever it is dropped', () => {
    // A wall of nodes, then a drop right in the middle of it.
    const obstacles = Array.from({ length: 40 }, (_, i) => rect((i % 8) * 130, Math.floor(i / 8) * 130))
    const spot = findFreeSpot(rect(260, 260), obstacles)
    expect(covers(spot, { width: 100, height: 100 }, obstacles)).toBe(false)
  })

  it('keeps the gap, not just a hair of clearance', () => {
    const obstacles = [rect(0, 0, 100, 100)]
    const spot = findFreeSpot(rect(10, 10, 100, 100), obstacles)

    const horizontallyClear = spot.x >= 100 + PLACEMENT_GAP || spot.x + 100 <= -PLACEMENT_GAP
    const verticallyClear = spot.y >= 100 + PLACEMENT_GAP || spot.y + 100 <= -PLACEMENT_GAP
    expect(horizontallyClear || verticallyClear).toBe(true)
  })

  it('is deterministic — the same drop lands in the same place', () => {
    const obstacles = [rect(100, 100), rect(300, 100)]
    const first = findFreeSpot(rect(120, 110), obstacles)
    const second = findFreeSpot(rect(120, 110), obstacles)
    expect(first).toEqual(second)
  })
})

describe('findFreeSpotForStack', () => {
  it('finds room for the whole column, not just its first node', () => {
    // Free at the top, but a node sits where the third verse would land.
    const obstacles = [rect(0, 300, 320, 100)]
    const heights = [90, 90, 90]
    const spot = findFreeSpotForStack({ x: 0, y: 100, width: 320 }, heights, 40, obstacles)

    const total = 90 * 3 + 40 * 2
    expect(covers(spot, { width: 320, height: total }, obstacles)).toBe(false)
  })

  it('leaves a clear column where it was asked for', () => {
    const spot = findFreeSpotForStack({ x: 50, y: 50, width: 320 }, [100, 100], 40, [])
    expect(spot).toEqual({ x: 50, y: 50 })
  })
})
