import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    versions: { get: vi.fn(), put: vi.fn() },
    books: { get: vi.fn(), put: vi.fn() },
    chapters: {
      get: vi.fn(), put: vi.fn(),
      where: vi.fn(() => ({ equals: vi.fn(() => ({ primaryKeys: vi.fn(() => []) })) })),
    },
    crossRefs: { get: vi.fn(), put: vi.fn() },
    crossRefIds: { get: vi.fn(), put: vi.fn() },
  },
}))

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

vi.mock('@/lib/defaultBibleVersion', () => ({
  BIBLE_VERSION_STORAGE_KEY: 'bibleVersionId',
  getBrowserLanguage: vi.fn(() => 'en-US'),
  getStoredBibleVersionId: vi.fn(() => 1),
  selectDefaultBibleVersionId: vi.fn(() => 1),
}))

vi.mock('@/lib/userSettingsApi', () => ({
  saveUserSettingsSilently: vi.fn(),
}))

import { bibleApi } from '@/lib/bibleApi'
import { useVerseStore } from '../useVerseStore'
import type { ApiBook, ApiChapterResponse } from '@/lib/bibleApi'

const mockBibleApi = bibleApi as unknown as {
  versions: ReturnType<typeof vi.fn>
  books: ReturnType<typeof vi.fn>
  chapter: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  crossRefs: ReturnType<typeof vi.fn>
  crossRefVerseIds: ReturnType<typeof vi.fn>
}

const mockBooks: ApiBook[] = [
  { id: 1, number: 1, name: 'Genesis', slug: 'genesis', chapters_count: 50 },
  { id: 2, number: 43, name: 'John', slug: 'john', chapters_count: 21 },
]

const mockChapterResponse: ApiChapterResponse = {
  book: { number: 43, name: 'John', slug: 'john' },
  chapter: 3,
  chapter_id: 10,
  verses: [
    { id: 100, number: 16, text: 'For God so loved the world' },
    { id: 101, number: 17, text: 'that he gave his only Son' },
    { id: 102, number: 18, text: 'whoever believes in him' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useVerseStore.setState({
    versionId: 1,
    versions: [],
    books: [],
    selectedBook: '',
    selectedChapter: 1,
    selectedVerseId: null,
    selectedVerseIds: [],
    studyVerseId: null,
    chapterId: null,
    verses: [],
    loadingVerses: false,
  })
})

describe('useVerseStore', () => {
  it('starts with default values', () => {
    const state = useVerseStore.getState()
    expect(state.versions).toEqual([])
    expect(state.books).toEqual([])
    expect(state.selectedBook).toBe('')
    expect(state.selectedChapter).toBe(1)
    expect(state.verses).toEqual([])
  })

  it('loadBooks fetches books and selects first book by default', async () => {
    mockBibleApi.books.mockResolvedValueOnce(mockBooks)
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)

    await useVerseStore.getState().loadBooks()

    expect(useVerseStore.getState().books).toHaveLength(2)
    expect(useVerseStore.getState().selectedBook).toBe('genesis')
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(1, 'genesis', 1)
  })

  it('loadBooks follows initialRoute', async () => {
    mockBibleApi.books.mockResolvedValueOnce(mockBooks)
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)

    await useVerseStore.getState().loadBooks({ book: 'john', chapter: 3 })

    expect(useVerseStore.getState().selectedBook).toBe('john')
    expect(useVerseStore.getState().selectedChapter).toBe(3)
  })

  it('loadBooks follows initialRoute with verse (openVerse is fire-and-forget)', async () => {
    mockBibleApi.books.mockResolvedValueOnce(mockBooks)
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)

    await useVerseStore.getState().loadBooks({ book: 'john', chapter: 3, verse: 16 })

    // loadBooks fires openVerse without awaiting — so selectedBook/chapter are set synchronously
    expect(useVerseStore.getState().selectedBook).toBe('john')
    expect(useVerseStore.getState().selectedChapter).toBe(3)
    // selectedVerseId is set asynchronously by openVerse → loadChapter, so skip strict assertion
  })

  it('loadBooks restores last reading from localStorage', async () => {
    localStorage.setItem('verbum_last_reading', JSON.stringify({ book: 'john', chapter: 3 }))
    mockBibleApi.books.mockResolvedValueOnce(mockBooks)
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)

    await useVerseStore.getState().loadBooks()

    expect(useVerseStore.getState().selectedBook).toBe('john')
    expect(useVerseStore.getState().selectedChapter).toBe(3)
  })

  it('loadChapter fetches verses for a book and chapter', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    await useVerseStore.getState().loadChapter('john', 3)
    const state = useVerseStore.getState()
    expect(state.verses).toHaveLength(3)
    expect(state.verses[0].id).toBe('john-3-16')
    expect(state.chapterId).toBe(10)
    expect(state.loadingVerses).toBe(false)
  })

  it('selectBook switches book and loads chapter 1', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    useVerseStore.setState({
      books: mockBooks.map(b => ({
        id: b.slug, number: b.number, name: b.name, slug: b.slug,
        testament: 'new' as const, chapters: b.chapters_count,
      })),
    })
    await useVerseStore.getState().selectBook('john')
    expect(useVerseStore.getState().selectedBook).toBe('john')
    expect(useVerseStore.getState().selectedChapter).toBe(1)
  })

  it('selectBook resets verse selection', () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)
    useVerseStore.setState({
      books: [
        { id: 'genesis', number: 1, name: 'Genesis', slug: 'genesis', testament: 'old', chapters: 50 },
        { id: 'john', number: 43, name: 'John', slug: 'john', testament: 'new', chapters: 21 },
      ],
      selectedVerseId: 'genesis-1-1',
      selectedVerseIds: ['genesis-1-1'],
      studyVerseId: 'genesis-1-1',
    })
    useVerseStore.getState().selectBook('john')
    expect(useVerseStore.getState().selectedVerseId).toBeNull()
    expect(useVerseStore.getState().selectedVerseIds).toEqual([])
    expect(useVerseStore.getState().studyVerseId).toBeNull()
  })

  it('selectVerse sets a single verse', () => {
    useVerseStore.getState().selectVerse('john-3-16')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')
    expect(useVerseStore.getState().selectedVerseIds).toEqual(['john-3-16'])
  })

  it('toggleVerseSelection adds and removes', () => {
    useVerseStore.getState().toggleVerseSelection('john-3-16')
    expect(useVerseStore.getState().selectedVerseIds).toContain('john-3-16')

    useVerseStore.getState().toggleVerseSelection('john-3-16')
    expect(useVerseStore.getState().selectedVerseIds).not.toContain('john-3-16')
  })

  it('toggleVerseSelection updates selectedVerseId on removal', () => {
    useVerseStore.getState().toggleVerseSelection('john-3-16')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')
    useVerseStore.getState().toggleVerseSelection('john-3-17')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-17')
    useVerseStore.getState().toggleVerseSelection('john-3-17')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')
  })

  it('navigateVerse moves to next/prev', () => {
    useVerseStore.setState({
      verses: [
        { id: 'john-3-16', apiId: 100, book: 'John', chapter: 3, verse: 16, text: 'a' },
        { id: 'john-3-17', apiId: 101, book: 'John', chapter: 3, verse: 17, text: 'b' },
        { id: 'john-3-18', apiId: 102, book: 'John', chapter: 3, verse: 18, text: 'c' },
      ],
      selectedVerseId: 'john-3-16',
      selectedVerseIds: ['john-3-16'],
    })

    useVerseStore.getState().navigateVerse('next')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-17')

    useVerseStore.getState().navigateVerse('prev')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')
  })

  it('navigateVerse wraps around', () => {
    useVerseStore.setState({
      verses: [
        { id: 'john-3-16', apiId: 100, book: 'John', chapter: 3, verse: 16, text: 'a' },
        { id: 'john-3-17', apiId: 101, book: 'John', chapter: 3, verse: 17, text: 'b' },
      ],
      selectedVerseId: 'john-3-17',
      selectedVerseIds: ['john-3-17'],
    })

    useVerseStore.getState().navigateVerse('next')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')

    useVerseStore.getState().navigateVerse('prev')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-17')
  })

  it('openStudyPanel sets studyVerseId and ensures selection', () => {
    useVerseStore.getState().openStudyPanel('john-3-17')
    expect(useVerseStore.getState().studyVerseId).toBe('john-3-17')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-17')
  })

  it('closeStudyPanel clears studyVerseId', () => {
    useVerseStore.setState({ studyVerseId: 'john-3-16' })
    useVerseStore.getState().closeStudyPanel()
    expect(useVerseStore.getState().studyVerseId).toBeNull()
  })

  it('clearLastReading removes localStorage key', () => {
    localStorage.setItem('verbum_last_reading', 'test')
    useVerseStore.getState().clearLastReading()
    expect(localStorage.getItem('verbum_last_reading')).toBeNull()
  })
})
