import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import {
  filterVersesMissingFromCanvas,
  getNodesMap,
  shouldAutoInsertGuidedPassage,
  writeNodeToMap,
} from '../yDocHelpers'

const verses = [
  { verseId: 101, version_id: 1, reference: 'Juan 3:16', text: 'Porque de tal manera...' },
  { verseId: 102, version_id: 1, reference: 'Juan 3:17', text: 'Porque Dios no envió...' },
]

describe('filterVersesMissingFromCanvas', () => {
  it('does not reinsert an individual verse already on the canvas', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), {
      id: 'verse-existing',
      type: 'verse',
      data: verses[0],
    })

    expect(filterVersesMissingFromCanvas(doc, verses)).toEqual([verses[1]])
  })

  it('recognises verses contained in an existing passage node', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), {
      id: 'passage-existing',
      type: 'passage',
      data: {
        version_id: 1,
        verses: verses.map(({ verseId, reference, text }, index) => ({
          verseId,
          reference,
          text,
          verse: 16 + index,
        })),
      },
    })

    expect(filterVersesMissingFromCanvas(doc, verses)).toEqual([])
  })

  it('does not duplicate identical text even when its stored verse id changed', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), {
      id: 'verse-old-id',
      type: 'verse',
      data: { ...verses[0], verseId: 999, version_id: 2 },
    })

    expect(filterVersesMissingFromCanvas(doc, verses)).toEqual([verses[1]])
  })

  it('keeps a different translation of the same verse', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), {
      id: 'verse-other-version',
      type: 'verse',
      data: { ...verses[0], version_id: 2, text: 'Dios amó tanto al mundo...' },
    })

    expect(filterVersesMissingFromCanvas(doc, verses)).toEqual(verses)
  })
})

describe('shouldAutoInsertGuidedPassage', () => {
  it('does not seed again when reopening a canvas that already has content', () => {
    const doc = new Y.Doc()
    writeNodeToMap(getNodesMap(doc), {
      id: 'existing-passage',
      type: 'verse',
      data: verses[0],
    })

    expect(shouldAutoInsertGuidedPassage({
      doc,
      firstStepInVisit: true,
      progressSessionId: 'old-session',
      sessionId: 'reopened-session',
    })).toBe(false)
  })

  it('does not seed again when progress already belongs to this session', () => {
    expect(shouldAutoInsertGuidedPassage({
      doc: new Y.Doc(),
      firstStepInVisit: true,
      progressSessionId: 'same-session',
      sessionId: 'same-session',
    })).toBe(false)
  })

  it('seeds a new empty session and allows later step changes', () => {
    const doc = new Y.Doc()
    const input = {
      doc,
      progressSessionId: 'old-session',
      sessionId: 'new-session',
    }

    expect(shouldAutoInsertGuidedPassage({ ...input, firstStepInVisit: true })).toBe(true)
    writeNodeToMap(getNodesMap(doc), { id: 'step-one', type: 'verse', data: verses[0] })
    expect(shouldAutoInsertGuidedPassage({ ...input, firstStepInVisit: false })).toBe(true)
  })
})
