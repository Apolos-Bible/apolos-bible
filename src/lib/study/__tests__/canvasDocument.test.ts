import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  deleteCanvasNodes, edgeFromYMap, getEdgesMap, getNodesMap, nodeFromYMap,
  resizeCanvasNode, writeEdgeToMap, writeNodeToMap,
} from '../yDocHelpers'

describe('[STUDY-CANVAS-01] collaborative canvas document', () => {
  it('adds and moves a node while preserving its content and dimensions', () => {
    const doc = new Y.Doc()
    const nodes = getNodesMap(doc)
    writeNodeToMap(nodes, {
      id: 'note-1', type: 'sticky', position: { x: 20, y: 30 },
      width: 240, height: 180, data: { text: 'Gracia' },
    })
    writeNodeToMap(nodes, { id: 'note-1', position: { x: 90, y: 120 } })
    expect(nodeFromYMap('note-1', nodes.get('note-1')!)).toMatchObject({
      type: 'sticky', position: { x: 90, y: 120 }, width: 240, height: 180,
      data: { text: 'Gracia' },
    })
  })

  it('rounds a resize and leaves an unknown node untouched', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), { id: 'note-1', width: 200, height: 100 })
    expect(resizeCanvasNode(doc, 'note-1', 321.6, 179.5)).toBe(true)
    expect(resizeCanvasNode(doc, 'missing', 10, 10)).toBe(false)
    expect(nodeFromYMap('note-1', getNodesMap(doc).get('note-1')!)).toMatchObject({ width: 322, height: 180 })
  })

  it('persists edges and deletes every edge connected to removed nodes', () => {
    const doc = new Y.Doc()
    const nodes = getNodesMap(doc)
    const edges = getEdgesMap(doc)
    ;['a', 'b', 'c'].forEach((id) => writeNodeToMap(nodes, { id }))
    writeEdgeToMap(edges, { id: 'a-b', source: 'a', target: 'b', type: 'default' })
    writeEdgeToMap(edges, { id: 'b-c', source: 'b', target: 'c', sourceHandle: 'right' })
    expect(edgeFromYMap('b-c', edges.get('b-c')!)).toMatchObject({ source: 'b', target: 'c', sourceHandle: 'right' })
    expect(deleteCanvasNodes(doc, ['b'])).toEqual(['a-b', 'b-c'])
    expect(Array.from(nodes.keys())).toEqual(['a', 'c'])
    expect(edges.size).toBe(0)
  })
})
