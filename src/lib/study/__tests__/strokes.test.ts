import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { buildPenPath, pointsBounds, strokeGeometryBounds, strokeHit } from '../strokes'
import { getNodesMap, nodeFromYMap, writeNodeToMap } from '../yDocHelpers'

describe('[STUDY-DRAW-01] drawing geometry and collaboration', () => {
  it('builds pen geometry and bounds deterministically', () => {
    expect(buildPenPath([0, 0, 10, 10, 20, 0])).toBe('M 0 0 Q 10 10 15 5 L 20 0')
    expect(pointsBounds([20, 8, -4, 30, 10, 2])).toEqual({ x: -4, y: 2, w: 24, h: 28 })
    expect(strokeGeometryBounds({ kind: 'rect', points: [30, 40, 10, 5] })).toEqual({ x: 10, y: 5, w: 20, h: 35 })
  })

  it('hits strokes and filled shapes without erasing nearby empty space', () => {
    expect(strokeHit({ kind: 'pen', points: [0, 0, 20, 20], size: 4, filled: false }, 10, 11, 2)).toBe(true)
    expect(strokeHit({ kind: 'rect', points: [0, 0, 20, 20], size: 2, filled: false }, 10, 10, 1)).toBe(false)
    expect(strokeHit({ kind: 'ellipse', points: [0, 0, 20, 10], size: 2, filled: true }, 10, 5, 1)).toBe(true)
  })

  it('synchronizes a completed stroke through a Yjs update', () => {
    const author = new Y.Doc()
    const peer = new Y.Doc()
    writeNodeToMap(getNodesMap(author), {
      id: 'drawing-1', type: 'drawing', position: { x: 15, y: 20 }, width: 100, height: 40,
      data: { kind: 'line', color: '#ef4444', size: 4, filled: false, points: [15, 20, 115, 60], viewBox: { x: 15, y: 20, w: 100, h: 40 } },
    })
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(author))
    expect(nodeFromYMap('drawing-1', getNodesMap(peer).get('drawing-1')!)).toMatchObject({
      type: 'drawing', position: { x: 15, y: 20 }, width: 100, height: 40,
      data: { kind: 'line', points: [15, 20, 115, 60] },
    })
  })
})
