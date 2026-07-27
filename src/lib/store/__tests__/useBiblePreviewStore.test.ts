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

const verseStoreState = {
  versionId: 1,
  books: [
    { id: 'john', number: 43, name: 'John', slug: 'john', testament: 'new' as const, chapters: 21 },
    { id: 'acts', number: 44, name: 'Acts', slug: 'acts', testament: 'new' as const, chapters: 28 },
  ],
  selectedBook: '',
  selectedChapter: 1,
}

vi.mock('../useVerseStore', () => ({
  useVerseStore: {
    getState: vi.fn(() => verseStoreState),
  },
}))

import { bibleApi } from '@/lib/bibleApi'
import { useBiblePreviewStore } from '../useBiblePreviewStore'

const mockBibleApi = bibleApi as unknown as {
  versions: ReturnType<typeof vi.fn>
  books: ReturnType<typeof vi.fn>
  chapter: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  crossRefs: ReturnType<typeof vi.fn>
  crossRefVerseIds: ReturnType<typeof vi.fn>
}

const mockChapterResponse = {
  book: { number: 43, name: 'John', slug: 'john' },
  chapter: 3,
  chapter_id: 10,
  verses: [
    { id: 100, number: 16, text: 'For God so loved the world' },
    { id: 101, number: 17, text: 'that he gave his only Son' },
    { id: 102, number: 18, text: 'whoever believes in him' },
  ],
}

const threeVerses = [
  { id: 'john-3-16', apiId: 100, verse: 16, text: 'a' },
  { id: 'john-3-17', apiId: 101, verse: 17, text: 'b' },
  { id: 'john-3-18', apiId: 102, verse: 18, text: 'c' },
]

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useBiblePreviewStore.setState({
    bookSlug: null,
    bookName: '',
    chapter: 1,
    chapters: 0,
    verses: [],
    selectedIds: new Set(),
    anchorId: null,
    focusedId: null,
    scrollToVerse: null,
    loading: false,
    error: false,
    recent: [],
  })
})

describe('useBiblePreviewStore', () => {
  it('starts with empty state', () => {
    const state = useBiblePreviewStore.getState()
    expect(state.bookSlug).toBeNull()
    expect(state.bookName).toBe('')
    expect(state.verses).toEqual([])
    expect(state.selectedIds.size).toBe(0)
  })

  it('loadChapter fetches and populates verses', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    await useBiblePreviewStore.getState().loadChapter('john', 3)

    const state = useBiblePreviewStore.getState()
    expect(state.bookSlug).toBe('john')
    expect(state.bookName).toBe('John')
    expect(state.chapter).toBe(3)
    expect(state.chapters).toBe(21)
    expect(state.verses).toHaveLength(3)
    expect(state.verses[0].id).toBe('john-3-16')
    expect(state.verses[0].apiId).toBe(100)
    expect(state.loading).toBe(false)
    expect(state.error).toBe(false)
  })

  it('loadChapter clamps the chapter to the book length', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    await useBiblePreviewStore.getState().loadChapter('john', 99)
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(1, 'john', 21)
  })

  it('loadChapter records the chapter as recent', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    await useBiblePreviewStore.getState().loadChapter('john', 3)
    expect(useBiblePreviewStore.getState().recent[0]).toEqual({ slug: 'john', name: 'John', chapter: 3 })
  })

  it('loadChapter with a verse selects and scrolls to it', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    await useBiblePreviewStore.getState().loadChapter('john', 3, { verse: 17 })

    const state = useBiblePreviewStore.getState()
    expect([...state.selectedIds]).toEqual(['john-3-17'])
    expect(state.focusedId).toBe('john-3-17')
    expect(state.scrollToVerse).toBe(17)
  })

  it('loadChapter handles errors gracefully', async () => {
    mockBibleApi.chapter.mockRejectedValueOnce(new Error('Fail'))
    await useBiblePreviewStore.getState().loadChapter('john', 3)
    const state = useBiblePreviewStore.getState()
    expect(state.loading).toBe(false)
    expect(state.error).toBe(true)
    expect(state.verses).toEqual([])
  })

  it('setChapter reloads chapter if bookSlug is set', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    useBiblePreviewStore.setState({ bookSlug: 'john' })
    await useBiblePreviewStore.getState().setChapter(4)
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(1, 'john', 4)
  })

  it('setChapter does nothing if bookSlug is null', async () => {
    await useBiblePreviewStore.getState().setChapter(5)
    expect(mockBibleApi.chapter).not.toHaveBeenCalled()
  })

  it('stepChapter moves within the book', () => {
    mockBibleApi.chapter.mockResolvedValue(mockChapterResponse)
    useBiblePreviewStore.setState({ bookSlug: 'john', chapter: 3, chapters: 21 })
    useBiblePreviewStore.getState().stepChapter(1)
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(1, 'john', 4)
  })

  it('stepChapter rolls over into the next book', () => {
    mockBibleApi.chapter.mockResolvedValue(mockChapterResponse)
    useBiblePreviewStore.setState({ bookSlug: 'john', chapter: 21, chapters: 21 })
    useBiblePreviewStore.getState().stepChapter(1)
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(1, 'acts', 1)
  })

  it('stepChapter rolls back into the previous book at its last chapter', () => {
    mockBibleApi.chapter.mockResolvedValue(mockChapterResponse)
    useBiblePreviewStore.setState({ bookSlug: 'acts', chapter: 1, chapters: 28 })
    useBiblePreviewStore.getState().stepChapter(-1)
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(1, 'john', 21)
  })

  it('stepChapter stops at the end of the last book', () => {
    useBiblePreviewStore.setState({ bookSlug: 'acts', chapter: 28, chapters: 28 })
    useBiblePreviewStore.getState().stepChapter(1)
    expect(mockBibleApi.chapter).not.toHaveBeenCalled()
  })

  it('toggleVerse adds and removes from selection', () => {
    useBiblePreviewStore.setState({ verses: threeVerses })

    useBiblePreviewStore.getState().toggleVerse('john-3-16')
    expect(useBiblePreviewStore.getState().selectedIds.has('john-3-16')).toBe(true)

    useBiblePreviewStore.getState().toggleVerse('john-3-16')
    expect(useBiblePreviewStore.getState().selectedIds.has('john-3-16')).toBe(false)
  })

  it('selectOnly replaces the selection and sets the anchor', () => {
    useBiblePreviewStore.setState({ verses: threeVerses, selectedIds: new Set(['john-3-18']) })
    useBiblePreviewStore.getState().selectOnly('john-3-16')
    const state = useBiblePreviewStore.getState()
    expect([...state.selectedIds]).toEqual(['john-3-16'])
    expect(state.anchorId).toBe('john-3-16')
  })

  it('extendTo selects the inclusive range from the anchor', () => {
    useBiblePreviewStore.setState({ verses: threeVerses })
    useBiblePreviewStore.getState().selectOnly('john-3-16')
    useBiblePreviewStore.getState().extendTo('john-3-18')
    expect([...useBiblePreviewStore.getState().selectedIds].sort()).toEqual([
      'john-3-16', 'john-3-17', 'john-3-18',
    ])
  })

  it('extendTo works backwards from the anchor', () => {
    useBiblePreviewStore.setState({ verses: threeVerses })
    useBiblePreviewStore.getState().selectOnly('john-3-18')
    useBiblePreviewStore.getState().extendTo('john-3-17')
    expect([...useBiblePreviewStore.getState().selectedIds].sort()).toEqual([
      'john-3-17', 'john-3-18',
    ])
  })

  it('extendTo re-anchors so shrinking a range works', () => {
    useBiblePreviewStore.setState({ verses: threeVerses })
    useBiblePreviewStore.getState().selectOnly('john-3-16')
    useBiblePreviewStore.getState().extendTo('john-3-18')
    useBiblePreviewStore.getState().extendTo('john-3-17')
    expect([...useBiblePreviewStore.getState().selectedIds].sort()).toEqual([
      'john-3-16', 'john-3-17',
    ])
  })

  it('moveFocus walks the list and extends the selection when asked', () => {
    useBiblePreviewStore.setState({ verses: threeVerses })
    useBiblePreviewStore.getState().moveFocus(1)
    expect(useBiblePreviewStore.getState().focusedId).toBe('john-3-16')

    useBiblePreviewStore.getState().moveFocus(1, true)
    const state = useBiblePreviewStore.getState()
    expect(state.focusedId).toBe('john-3-17')
    expect([...state.selectedIds].sort()).toEqual(['john-3-16', 'john-3-17'])
  })

  it('moveFocus clamps at the list edges', () => {
    useBiblePreviewStore.setState({ verses: threeVerses, focusedId: 'john-3-18' })
    useBiblePreviewStore.getState().moveFocus(5)
    expect(useBiblePreviewStore.getState().focusedId).toBe('john-3-18')
  })

  it('selectAllInChapter selects all verses', () => {
    useBiblePreviewStore.setState({ verses: threeVerses })
    useBiblePreviewStore.getState().selectAllInChapter()
    expect(useBiblePreviewStore.getState().selectedIds.size).toBe(3)
  })

  it('clearSelection empties selection', () => {
    useBiblePreviewStore.setState({ selectedIds: new Set(['john-3-16']), anchorId: 'john-3-16' })
    useBiblePreviewStore.getState().clearSelection()
    expect(useBiblePreviewStore.getState().selectedIds.size).toBe(0)
    expect(useBiblePreviewStore.getState().anchorId).toBeNull()
  })
})
