import { describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { exportStudyToText, studyHasContent } from '../exportStudy'
import { getEdgesMap, getNodesMap, writeEdgeToMap, writeNodeToMap } from '../yDocHelpers'

describe('[STUDY-EXPORT-01] safe study text export', () => {
  it('orders visible nodes, preserves connections and omits drawings', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-08T12:00:00Z'))
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), { id: 'verse', type: 'verse', position: { x: 20, y: 100 }, data: { reference: 'Juan 1:1', text: 'El Verbo.' } })
    writeNodeToMap(getNodesMap(doc), { id: 'note', type: 'sticky', position: { x: 10, y: 10 }, data: { text: 'Primero' } })
    writeNodeToMap(getNodesMap(doc), { id: 'draw', type: 'drawing', position: { x: 0, y: 0 }, data: { points: [1, 2, 3, 4] } })
    writeEdgeToMap(getEdgesMap(doc), { id: 'link', source: 'note', target: 'verse' })
    const text = exportStudyToText({ doc, title: 'Compartido' })
    expect(text).toContain('# Estudio: Compartido\nExportado: 2026-08-08T12:00:00.000Z')
    expect(text.indexOf('[#1] Nota adhesiva')).toBeLessThan(text.indexOf('[#2] Versículo'))
    expect(text).toContain('[#1] Nota: "Primero"  →  [#2] Versículo Juan 1:1')
    expect(text).not.toContain('Dibujo')
    vi.useRealTimers()
  })

  it('never exports private capability URLs or unknown payload data', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), { id: 'upload', type: 'file', data: { kind: 'upload', name: 'privado.pdf', mimeType: 'application/pdf', size: 10, contentUrl: 'https://signed.example/secret-token' } })
    writeNodeToMap(getNodesMap(doc), { id: 'public', type: 'file', data: { kind: 'link', name: 'example.com', mimeType: 'text/html', size: 0, contentUrl: 'https://example.com/' } })
    writeNodeToMap(getNodesMap(doc), { id: 'future', type: 'future-secret', data: { apiToken: 'never-export-me' } })
    const text = exportStudyToText({ doc })
    expect(text).toContain('privado.pdf')
    expect(text).toContain('https://example.com/')
    expect(text).not.toContain('secret-token')
    expect(text).not.toContain('never-export-me')
  })

  it('treats drawing-only documents as empty', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), { id: 'draw', type: 'drawing' })
    expect(studyHasContent(doc)).toBe(false)
  })
})
