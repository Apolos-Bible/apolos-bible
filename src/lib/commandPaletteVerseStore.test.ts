import { describe, expect, it } from 'vitest'
import { commandPaletteVerseStore } from './commandPaletteVerseStore'
import { getVerseStoreForTab, useVerseStore } from './store/useVerseStore'

describe('commandPaletteVerseStore', () => {
  it('[SEARCH-BOOK-01] reads the focused desktop tab instead of the legacy reader', () => {
    const focused = getVerseStoreForTab('search-focused-tab')

    expect(commandPaletteVerseStore(false, 'search-focused-tab')).toBe(focused)
    expect(commandPaletteVerseStore(false, 'search-focused-tab')).not.toBe(useVerseStore)
  })

  it('uses the shared reader on mobile or without an active workspace tab', () => {
    expect(commandPaletteVerseStore(true, 'search-focused-tab')).toBe(useVerseStore)
    expect(commandPaletteVerseStore(false, null)).toBe(useVerseStore)
  })
})
