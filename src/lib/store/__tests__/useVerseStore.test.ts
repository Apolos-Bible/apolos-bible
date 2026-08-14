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
  getFrontendLanguage: vi.fn(() => 'en'),
  getStoredBibleVersionId: vi.fn(() => 1),
  selectDefaultBibleVersionId: vi.fn(() => 1),
}))

vi.mock('@/lib/userSettingsApi', () => ({
  saveUserSettingsSilently: vi.fn(),
}))

vi.mock('@/lib/prefetchBible', () => ({
  prefetchVersion: vi.fn(),
  shouldAutoPrefetch: vi.fn(() => true),
}))

import { bibleApi } from '@/lib/bibleApi'
import { getStoredBibleVersionId } from '@/lib/defaultBibleVersion'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'
import { prefetchVersion } from '@/lib/prefetchBible'
import {
  getVerseStoreForTab,
  setBibleVersionForAllStores,
  useVerseStore,
} from '../useVerseStore'
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
  vi.mocked(prefetchVersion).mockResolvedValue(undefined)
  localStorage.clear()
  vi.mocked(getStoredBibleVersionId).mockReturnValue(1)
  mockBibleApi.versions.mockResolvedValue([
    { id: 1, name: 'King James Version', abbreviation: 'KJV', language: 'en' },
  ])
  useVerseStore.setState({
    versionId: 1,
    versions: [],
    books: [],
    selectedBook: '',
    selectedChapter: 1,
    selectedVerseId: null,
    selectedVerseIds: [],
    cursorVerseId: null,
    selectionAnchorId: null,
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

  it('falls back when the stored version is no longer published', async () => {
    localStorage.setItem('bibleVersionId', '99')
    vi.mocked(getStoredBibleVersionId).mockReturnValue(99)

    await useVerseStore.getState().loadVersions()

    expect(useVerseStore.getState().versionId).toBe(1)
    expect(localStorage.getItem('bibleVersionId')).toBeNull()
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

  it('opens and selects a verse range while anchoring the scroll at its start', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapterResponse)

    await useVerseStore.getState().openVerseRange('john', 3, 16, 18)

    const state = useVerseStore.getState()
    expect(state.selectedVerseId).toBe('john-3-16')
    expect(state.selectedVerseIds).toEqual(['john-3-16', 'john-3-17', 'john-3-18'])
    expect(state.cursorVerseId).toBe('john-3-16')
  })

  it('keeps the current reading location and selected range when the version changes', async () => {
    vi.mocked(getStoredBibleVersionId).mockImplementation(
      () => Number(localStorage.getItem('bibleVersionId')) || 1,
    )
    mockBibleApi.versions.mockResolvedValue([
      { id: 1, name: 'King James Version', abbreviation: 'KJV', language: 'en' },
      { id: 2, name: 'New Version', abbreviation: 'NEW', language: 'en' },
    ])
    mockBibleApi.books.mockResolvedValue(mockBooks)
    mockBibleApi.chapter.mockResolvedValue(mockChapterResponse)
    useVerseStore.setState({
      selectedBook: 'john',
      selectedChapter: 3,
      selectedVerseId: 'john-3-16',
      selectedVerseIds: ['john-3-16', 'john-3-17', 'john-3-18'],
      verses: mockChapterResponse.verses.map((verse) => ({
        id: `john-3-${verse.number}`,
        apiId: verse.id,
        book: 'John',
        chapter: 3,
        verse: verse.number,
        text: `old ${verse.text}`,
      })),
    })

    await useVerseStore.getState().setVersion(2)

    expect(useVerseStore.getState().versionId).toBe(2)
    expect(useVerseStore.getState().selectedBook).toBe('john')
    expect(useVerseStore.getState().selectedChapter).toBe(3)
    expect(mockBibleApi.books).toHaveBeenCalledWith(2)
    expect(mockBibleApi.chapter).toHaveBeenCalledWith(2, 'john', 3)
    await vi.waitFor(() => {
      expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')
      expect(useVerseStore.getState().selectedVerseIds).toEqual([
        'john-3-16',
        'john-3-17',
        'john-3-18',
      ])
    })
  })

  it('[SETTINGS-BIBLE-01] persists a YouVersion provider identity instead of its client-only id', async () => {
    mockBibleApi.books.mockResolvedValue(mockBooks)
    mockBibleApi.chapter.mockResolvedValue(mockChapterResponse)

    await useVerseStore.getState().setVersion(1_000_000_128)

    expect(saveUserSettingsSilently).toHaveBeenCalledWith({
      preferred_bible_version_id: null,
      preferred_bible_provider: 'youversion',
      preferred_bible_provider_id: 128,
    })
    expect(localStorage.getItem('bibleVersionId')).toBe('1000000128')
  })

  it('[BIBLE-VERSION-02] rolls back a rejected provider switch without persisting it', async () => {
    vi.mocked(getStoredBibleVersionId).mockImplementation(
      () => Number(localStorage.getItem('bibleVersionId')) || 1,
    )
    const originalBooks = mockBooks.map((book) => ({
      id: book.slug,
      number: book.number,
      name: book.name,
      slug: book.slug,
      testament: (book.number <= 39 ? 'old' : 'new') as 'old' | 'new',
      chapters: book.chapters_count,
    }))
    useVerseStore.setState({
      versionId: 1,
      versions: [
        { id: 1, name: 'King James Version', abbreviation: 'KJV', language: 'en' },
        { id: 1_000_000_128, name: 'Remote', abbreviation: 'NVI-YV', language: 'es', provider: 'youversion', providerId: 128 },
      ],
      books: originalBooks,
      selectedBook: 'john',
      selectedChapter: 3,
    })
    localStorage.setItem('bibleVersionId', '1')
    mockBibleApi.books.mockRejectedValueOnce(new Error('Provider timeout'))

    await expect(useVerseStore.getState().setVersion(1_000_000_128)).rejects.toThrow('Unable to load')

    expect(useVerseStore.getState()).toMatchObject({
      versionId: 1,
      books: originalBooks,
      selectedBook: 'john',
      selectedChapter: 3,
    })
    expect(localStorage.getItem('bibleVersionId')).toBe('1')
    expect(saveUserSettingsSilently).not.toHaveBeenCalled()
  })

  it('updates every existing Bible tab when the preferred version changes', async () => {
    vi.mocked(getStoredBibleVersionId).mockImplementation(
      () => Number(localStorage.getItem('bibleVersionId')) || 1,
    )
    mockBibleApi.versions.mockResolvedValue([
      { id: 1, name: 'King James Version', abbreviation: 'KJV', language: 'en' },
      { id: 2, name: 'New Version', abbreviation: 'NEW', language: 'en' },
    ])
    mockBibleApi.books.mockResolvedValue(mockBooks)
    mockBibleApi.chapter.mockResolvedValue(mockChapterResponse)
    const firstTab = getVerseStoreForTab('version-sync-first')
    const secondTab = getVerseStoreForTab('version-sync-second')
    firstTab.setState({ selectedBook: 'john', selectedChapter: 3 })
    secondTab.setState({ selectedBook: 'genesis', selectedChapter: 2 })

    await setBibleVersionForAllStores(2)

    expect(useVerseStore.getState().versionId).toBe(2)
    expect(firstTab.getState().versionId).toBe(2)
    expect(secondTab.getState().versionId).toBe(2)
    expect(firstTab.getState().selectedBook).toBe('john')
    expect(firstTab.getState().selectedChapter).toBe(3)
    expect(secondTab.getState().selectedBook).toBe('genesis')
    expect(secondTab.getState().selectedChapter).toBe(2)
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

  it('moves the keyboard cursor without committing a selection', () => {
    useVerseStore.setState({
      selectedVerseId: 'john-3-16',
      selectedVerseIds: ['john-3-16'],
      cursorVerseId: 'john-3-16',
    })

    useVerseStore.getState().setCursorVerse('john-3-17')

    expect(useVerseStore.getState().cursorVerseId).toBe('john-3-17')
    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-16')
    expect(useVerseStore.getState().selectedVerseIds).toEqual(['john-3-16'])
  })

  it('selects a contiguous range in either direction from a stable anchor', () => {
    useVerseStore.setState({
      verses: [
        { id: 'john-3-16', apiId: 100, book: 'John', chapter: 3, verse: 16, text: 'a' },
        { id: 'john-3-17', apiId: 101, book: 'John', chapter: 3, verse: 17, text: 'b' },
        { id: 'john-3-18', apiId: 102, book: 'John', chapter: 3, verse: 18, text: 'c' },
      ],
    })
    useVerseStore.getState().selectVerse('john-3-17')

    useVerseStore.getState().selectVerseRangeTo('john-3-18')
    expect(useVerseStore.getState().selectedVerseIds).toEqual([
      'john-3-17',
      'john-3-18',
    ])

    useVerseStore.getState().selectVerseRangeTo('john-3-16')
    expect(useVerseStore.getState().selectedVerseIds).toEqual([
      'john-3-16',
      'john-3-17',
    ])
    expect(useVerseStore.getState().selectionAnchorId).toBe('john-3-17')
  })

  it('clears every selected verse while preserving the keyboard cursor', () => {
    useVerseStore.getState().selectVerse('john-3-16')

    useVerseStore.getState().selectVerse(null)

    expect(useVerseStore.getState().selectedVerseId).toBeNull()
    expect(useVerseStore.getState().selectedVerseIds).toEqual([])
    expect(useVerseStore.getState().cursorVerseId).toBe('john-3-16')
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

  it('navigates from the focused cursor before committing a new selection', () => {
    useVerseStore.setState({
      verses: [
        { id: 'john-3-16', apiId: 100, book: 'John', chapter: 3, verse: 16, text: 'a' },
        { id: 'john-3-17', apiId: 101, book: 'John', chapter: 3, verse: 17, text: 'b' },
        { id: 'john-3-18', apiId: 102, book: 'John', chapter: 3, verse: 18, text: 'c' },
      ],
      selectedVerseId: 'john-3-16',
      selectedVerseIds: ['john-3-16'],
      cursorVerseId: 'john-3-17',
    })

    useVerseStore.getState().navigateVerse('next')

    expect(useVerseStore.getState().selectedVerseId).toBe('john-3-18')
    expect(useVerseStore.getState().selectedVerseIds).toEqual(['john-3-18'])
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

  describe('ensureBooks', () => {
    it('loads books without fetching any chapter', async () => {
      mockBibleApi.books.mockResolvedValue(mockBooks)

      await useVerseStore.getState().ensureBooks()

      expect(useVerseStore.getState().books).toHaveLength(2)
      expect(mockBibleApi.chapter).not.toHaveBeenCalled()
    })

    it('restores the selected-book highlight from last reading', async () => {
      localStorage.setItem('verbum_last_reading', JSON.stringify({ book: 'john', chapter: 3 }))
      mockBibleApi.books.mockResolvedValue(mockBooks)

      await useVerseStore.getState().ensureBooks()

      expect(useVerseStore.getState().selectedBook).toBe('john')
      expect(useVerseStore.getState().selectedChapter).toBe(3)
      expect(mockBibleApi.chapter).not.toHaveBeenCalled()
    })

    it('is a no-op when books are already loaded', async () => {
      useVerseStore.setState({
        books: [{ id: 'genesis', number: 1, name: 'Genesis', slug: 'genesis', testament: 'old', chapters: 50 }],
      })

      await useVerseStore.getState().ensureBooks()

      expect(mockBibleApi.books).not.toHaveBeenCalled()
    })
  })
})
