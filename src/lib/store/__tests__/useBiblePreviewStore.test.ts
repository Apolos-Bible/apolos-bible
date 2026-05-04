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

vi.mock('../useVerseStore', () => ({
  useVerseStore: {
    getState: vi.fn(() => ({ versionId: 1 })),
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
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  useBiblePreviewStore.setState({
    bookSlug: null,
    bookName: '',
    chapter: 1,
    chapters: 0,
    verses: [],
    selectedIds: new Set(),
    loading: false,
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
    expect(state.verses).toHaveLength(2)
    expect(state.verses[0].id).toBe('john-3-16')
    expect(state.verses[0].apiId).toBe(100)
    expect(state.loading).toBe(false)
  })

  it('loadChapter handles errors gracefully', async () => {
    mockBibleApi.chapter.mockRejectedValueOnce(new Error('Fail'))
    await useBiblePreviewStore.getState().loadChapter('john', 3)
    expect(useBiblePreviewStore.getState().loading).toBe(false)
    expect(useBiblePreviewStore.getState().verses).toEqual([])
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

  it('toggleVerse adds and removes from selection', () => {
    useBiblePreviewStore.setState({
      verses: [
        { id: 'john-3-16', apiId: 100, verse: 16, text: 'a' },
        { id: 'john-3-17', apiId: 101, verse: 17, text: 'b' },
      ],
    })

    useBiblePreviewStore.getState().toggleVerse('john-3-16')
    expect(useBiblePreviewStore.getState().selectedIds.has('john-3-16')).toBe(true)

    useBiblePreviewStore.getState().toggleVerse('john-3-16')
    expect(useBiblePreviewStore.getState().selectedIds.has('john-3-16')).toBe(false)
  })

  it('selectAllInChapter selects all verses', () => {
    useBiblePreviewStore.setState({
      verses: [
        { id: 'john-3-16', apiId: 100, verse: 16, text: 'a' },
        { id: 'john-3-17', apiId: 101, verse: 17, text: 'b' },
      ],
    })
    useBiblePreviewStore.getState().selectAllInChapter()
    expect(useBiblePreviewStore.getState().selectedIds.size).toBe(2)
  })

  it('clearSelection empties selection', () => {
    useBiblePreviewStore.setState({ selectedIds: new Set(['john-3-16']) })
    useBiblePreviewStore.getState().clearSelection()
    expect(useBiblePreviewStore.getState().selectedIds.size).toBe(0)
  })
})
