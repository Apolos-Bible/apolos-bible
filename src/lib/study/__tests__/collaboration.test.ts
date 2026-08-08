import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { getNodesMap, nodeFromYMap, writeNodeToMap } from '../yDocHelpers'

describe('[STUDY-COLLAB-01] concurrent document recovery', () => {
  it('merges concurrent edits from two disconnected participants', () => {
    const ana = new Y.Doc()
    const lucia = new Y.Doc()
    const baseline = Y.encodeStateAsUpdate(ana)
    Y.applyUpdate(lucia, baseline)
    writeNodeToMap(getNodesMap(ana), { id: 'ana-note', type: 'sticky', data: { text: 'Ana' } })
    writeNodeToMap(getNodesMap(lucia), { id: 'lucia-note', type: 'sticky', data: { text: 'Lucía' } })
    const anaUpdate = Y.encodeStateAsUpdate(ana, Y.encodeStateVector(lucia))
    const luciaUpdate = Y.encodeStateAsUpdate(lucia, Y.encodeStateVector(ana))
    Y.applyUpdate(ana, luciaUpdate)
    Y.applyUpdate(lucia, anaUpdate)
    expect(Array.from(getNodesMap(ana).keys()).sort()).toEqual(['ana-note', 'lucia-note'])
    expect(Array.from(getNodesMap(lucia).keys()).sort()).toEqual(['ana-note', 'lucia-note'])
  })

  it('replays an offline update after reconnect without losing existing state', () => {
    const server = new Y.Doc()
    const offline = new Y.Doc()
    writeNodeToMap(getNodesMap(server), { id: 'existing', type: 'sticky', data: { text: 'Antes' } })
    Y.applyUpdate(offline, Y.encodeStateAsUpdate(server))
    writeNodeToMap(getNodesMap(offline), { id: 'offline', type: 'sticky', data: { text: 'Sin conexión' } })
    Y.applyUpdate(server, Y.encodeStateAsUpdate(offline, Y.encodeStateVector(server)))
    expect(nodeFromYMap('existing', getNodesMap(server).get('existing')!)).toMatchObject({ data: { text: 'Antes' } })
    expect(nodeFromYMap('offline', getNodesMap(server).get('offline')!)).toMatchObject({ data: { text: 'Sin conexión' } })
  })
})
