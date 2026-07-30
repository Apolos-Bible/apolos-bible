import { describe, expect, it } from 'vitest'
import { verseSelectionIntent } from '../useVersePointerSelection'

describe('verseSelectionIntent', () => {
  it('replaces the selection on a plain click', () => {
    expect(verseSelectionIntent({
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    })).toBe('replace')
  })

  it('extends a range with Shift on every desktop platform', () => {
    expect(verseSelectionIntent({
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
    })).toBe('range')
  })

  it.each([
    { metaKey: true, ctrlKey: false },
    { metaKey: false, ctrlKey: true },
  ])('toggles one verse with Cmd or Ctrl', ({ metaKey, ctrlKey }) => {
    expect(verseSelectionIntent({
      shiftKey: false,
      metaKey,
      ctrlKey,
    })).toBe('toggle')
  })

  it('gives Shift range selection priority over toggle modifiers', () => {
    expect(verseSelectionIntent({
      shiftKey: true,
      metaKey: true,
      ctrlKey: true,
    })).toBe('range')
  })
})
