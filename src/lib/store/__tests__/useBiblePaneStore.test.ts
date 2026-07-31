import { beforeEach, describe, expect, it } from 'vitest'
import { getBiblePaneStoreForTab } from '../useBiblePaneStore'

describe('Bible pane reader preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts narrow and persists the selected reader width', () => {
    const store = getBiblePaneStoreForTab(`width-${crypto.randomUUID()}`)
    expect(store.getState().readerWidth).toBe('narrow')

    store.getState().setReaderWidth('wide')

    expect(store.getState().readerWidth).toBe('wide')
    expect(localStorage.getItem('readerWidth')).toBe('wide')
  })

  it('persists reading mode changes made inside a tab', () => {
    const store = getBiblePaneStoreForTab(`mode-${crypto.randomUUID()}`)
    store.getState().setReadingMode('flow')

    expect(store.getState().readingMode).toBe('flow')
    expect(localStorage.getItem('readingMode')).toBe('flow')
  })

  it('persists the compact library preference', () => {
    const store = getBiblePaneStoreForTab(`library-${crypto.randomUUID()}`)
    expect(store.getState().libraryCollapsed).toBe(false)

    store.getState().toggleLibrary()

    expect(store.getState().libraryCollapsed).toBe(true)
    expect(localStorage.getItem('bibleLibraryCollapsed')).toBe('true')
  })
})
