import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/bibleApi', () => ({
  bibleApi: {
    versions: vi.fn(),
    books: vi.fn(),
    chapter: vi.fn(),
    search: vi.fn(),
    crossRefs: vi.fn(),
    crossRefVerseIds: vi.fn(),
  },
}))

import { bibleApi } from '@/lib/bibleApi'
import { useCrossRefStore } from '../useCrossRefStore'
import type { ApiCrossRef } from '@/lib/bibleApi'

const mockBibleApi = bibleApi as unknown as {
  versions: ReturnType<typeof vi.fn>
  books: ReturnType<typeof vi.fn>
  chapter: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  crossRefs: ReturnType<typeof vi.fn>
  crossRefVerseIds: ReturnType<typeof vi.fn>
}

const mockCrossRef: ApiCrossRef = {
  id: 1,
  book: 'Matthew',
  slug: 'matthew',
  chapter: 5,
  verse: 14,
  text: 'You are the light of the world',
}

beforeEach(() => {
  vi.clearAllMocks()
  useCrossRefStore.setState({
    open: false,
    verseApiId: null,
    results: [],
    groups: [],
    loading: false,
    verseIdsWithRefs: new Set(),
  })
})

describe('useCrossRefStore', () => {
  it('starts closed with empty results', () => {
    const state = useCrossRefStore.getState()
    expect(state.open).toBe(false)
    expect(state.results).toEqual([])
    expect(state.groups).toEqual([])
    expect(state.loading).toBe(false)
    expect(state.verseIdsWithRefs.size).toBe(0)
  })

  it('loadChapterRefs fetches verse IDs with references', async () => {
    mockBibleApi.crossRefVerseIds.mockResolvedValueOnce([100, 101])
    await useCrossRefStore.getState().loadChapterRefs(5)
    expect(useCrossRefStore.getState().verseIdsWithRefs.has(100)).toBe(true)
    expect(useCrossRefStore.getState().verseIdsWithRefs.has(101)).toBe(true)
  })

  it('loadChapterRefs handles errors silently', async () => {
    mockBibleApi.crossRefVerseIds.mockRejectedValueOnce(new Error('Fail'))
    await useCrossRefStore.getState().loadChapterRefs(5)
    expect(useCrossRefStore.getState().verseIdsWithRefs.size).toBe(0)
  })

  it('openPanel with a verse fetches and stores results', async () => {
    mockBibleApi.crossRefs.mockResolvedValueOnce([mockCrossRef])
    await useCrossRefStore.getState().openPanel(100)
    const state = useCrossRefStore.getState()
    expect(state.open).toBe(true)
    expect(state.verseApiId).toBe(100)
    expect(state.results).toHaveLength(1)
    expect(state.results[0].book).toBe('Matthew')
    expect(state.loading).toBe(false)
  })

  it('openPanel with multiple sources groups results', async () => {
    mockBibleApi.crossRefs
      .mockResolvedValueOnce([mockCrossRef])
      .mockResolvedValueOnce([])

    await useCrossRefStore.getState().openPanel([
      { verseApiId: 100, label: 'John 3:16' },
      { verseApiId: 101, label: 'John 3:17' },
    ])
    const state = useCrossRefStore.getState()
    expect(state.groups).toHaveLength(2)
    expect(state.groups[0].results).toHaveLength(1)
    expect(state.groups[1].results).toHaveLength(0)
  })

  it('openPanel skips re-fetching if same verse and already open', async () => {
    mockBibleApi.crossRefs.mockResolvedValue([mockCrossRef])
    await useCrossRefStore.getState().openPanel(100)
    mockBibleApi.crossRefs.mockClear()
    await useCrossRefStore.getState().openPanel(100)
    expect(mockBibleApi.crossRefs).not.toHaveBeenCalled()
  })

  it('closePanel sets open to false', () => {
    useCrossRefStore.setState({ open: true, verseApiId: 100 })
    useCrossRefStore.getState().closePanel()
    expect(useCrossRefStore.getState().open).toBe(false)
  })
})
