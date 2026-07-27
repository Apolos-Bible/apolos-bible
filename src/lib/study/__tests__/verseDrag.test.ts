import { describe, it, expect, beforeEach } from 'vitest'
import {
  VERSE_DRAG_MIME,
  setVerseDrag,
  hasVerseDrag,
  readVerseDrag,
  endVerseDrag,
  type VerseDragPayload,
} from '../verseDrag'

/** Minimal stand-in for DataTransfer — happy-dom's drag events aren't wired. */
function fakeDataTransfer(options: { reject?: boolean } = {}) {
  const store = new Map<string, string>()
  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    get types() {
      return [...store.keys()]
    },
    setData(type: string, value: string) {
      if (options.reject) throw new Error('unsupported MIME type')
      store.set(type, value)
    },
    getData(type: string) {
      return store.get(type) ?? ''
    },
  } as unknown as DataTransfer
}

const payload: VerseDragPayload = {
  bookSlug: 'john',
  bookName: 'John',
  chapter: 3,
  items: [
    { verseId: 100, reference: 'John 3:16', version_id: 1, text: 'For God so loved', verse: 16 },
    { verseId: 101, reference: 'John 3:17', version_id: 1, text: 'he gave his Son', verse: 17 },
  ],
}

beforeEach(() => {
  endVerseDrag()
})

describe('verseDrag', () => {
  it('round-trips a payload through the DataTransfer', () => {
    const dt = fakeDataTransfer()
    setVerseDrag(dt, payload)

    expect(dt.types).toContain(VERSE_DRAG_MIME)
    expect(dt.effectAllowed).toBe('copy')
    expect(readVerseDrag(dt)).toEqual(payload)
  })

  it('also writes plain text for drops outside the canvas', () => {
    const dt = fakeDataTransfer()
    setVerseDrag(dt, payload)
    expect(dt.getData('text/plain')).toBe('John 3:16 — For God so loved\nJohn 3:17 — he gave his Son')
  })

  it('hasVerseDrag recognises our drag from the types alone', () => {
    const dt = fakeDataTransfer()
    expect(hasVerseDrag(dt)).toBe(false)
    setVerseDrag(dt, payload)
    expect(hasVerseDrag(dt)).toBe(true)
  })

  it('falls back to the in-flight mirror when the webview drops the MIME type', () => {
    const dt = fakeDataTransfer({ reject: true })
    setVerseDrag(dt, payload)

    expect(dt.types).toHaveLength(0)
    expect(hasVerseDrag(dt)).toBe(true)
    expect(readVerseDrag(dt)).toEqual(payload)
  })

  it('ignores an empty payload and reports no drag once ended', () => {
    const dt = fakeDataTransfer()
    setVerseDrag(dt, { ...payload, items: [] })
    endVerseDrag()

    expect(hasVerseDrag(dt)).toBe(true) // the MIME type is still on the transfer
    expect(readVerseDrag(dt)).toBeNull() // ...but an empty item list is not a drop
  })

  it('reports no drag for a foreign DataTransfer', () => {
    const dt = fakeDataTransfer()
    dt.setData('text/plain', 'hello')
    expect(hasVerseDrag(dt)).toBe(false)
    expect(readVerseDrag(dt)).toBeNull()
  })
})
