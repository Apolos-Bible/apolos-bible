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
import { useCompareStore } from '../useCompareStore'
import type { ApiVersion, ApiChapterResponse } from '@/lib/bibleApi'

const mockBibleApi = bibleApi as unknown as {
  versions: ReturnType<typeof vi.fn>
  books: ReturnType<typeof vi.fn>
  chapter: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  crossRefs: ReturnType<typeof vi.fn>
  crossRefVerseIds: ReturnType<typeof vi.fn>
}

const mockVersion: ApiVersion = { id: 1, name: 'King James Version', abbreviation: 'KJV', language: 'en' }
const mockVersion2: ApiVersion = { id: 2, name: 'Reina-Valera 1960', abbreviation: 'RVR60', language: 'es' }

const mockChapter: ApiChapterResponse = {
  book: { number: 43, name: 'John', slug: 'john' },
  chapter: 3,
  chapter_id: 10,
  verses: [{ id: 100, number: 16, text: 'For God so loved the world' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  useCompareStore.setState({
    open: false,
    results: [],
    targetVerseNumbers: [],
  })
})

describe('useCompareStore', () => {
  it('starts closed with empty results', () => {
    const state = useCompareStore.getState()
    expect(state.open).toBe(false)
    expect(state.results).toEqual([])
    expect(state.targetVerseNumbers).toEqual([])
  })

  it('openCompare fetches chapters for all versions', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapter).mockResolvedValueOnce(mockChapter)

    await useCompareStore.getState().openCompare([mockVersion, mockVersion2], 'john', 3, 16)

    const state = useCompareStore.getState()
    expect(state.open).toBe(true)
    expect(state.results).toHaveLength(2)
    expect(state.results[0].loading).toBe(false)
    expect(state.results[1].loading).toBe(false)
    expect(state.results[0].error).toBe(false)
    expect(state.targetVerseNumbers).toEqual([16])
    expect(mockBibleApi.chapter).toHaveBeenCalledTimes(2)
  })

  it('openCompare handles single verse number', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapter)
    await useCompareStore.getState().openCompare([mockVersion], 'john', 3, 16)
    expect(useCompareStore.getState().targetVerseNumbers).toEqual([16])
  })

  it('openCompare handles verse number array', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapter)
    await useCompareStore.getState().openCompare([mockVersion], 'john', 3, [16, 17])
    expect(useCompareStore.getState().targetVerseNumbers).toEqual([16, 17])
  })

  it('openCompare handles undefined verseNumbers', async () => {
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapter)
    await useCompareStore.getState().openCompare([mockVersion], 'john', 3)
    expect(useCompareStore.getState().targetVerseNumbers).toEqual([])
  })

  it('openCompare marks error for rejected requests', async () => {
    const error = new Error('Not found') as Error & { status: number }
    error.status = 500
    mockBibleApi.chapter.mockResolvedValueOnce(mockChapter).mockRejectedValueOnce(error)

    await useCompareStore.getState().openCompare([mockVersion, mockVersion2], 'john', 3)

    expect(useCompareStore.getState().results[0].error).toBe(false)
    expect(useCompareStore.getState().results[1].error).toBe(true)
    expect(useCompareStore.getState().results[1].notAvailable).toBe(false)
  })

  it('openCompare marks notAvailable for 404', async () => {
    const error = new Error('Not found') as Error & { status: number }
    error.status = 404
    mockBibleApi.chapter.mockRejectedValueOnce(error)

    await useCompareStore.getState().openCompare([mockVersion], 'john', 99)

    expect(useCompareStore.getState().results[0].notAvailable).toBe(true)
    expect(useCompareStore.getState().results[0].error).toBe(false)
  })

  it('closeCompare resets state', () => {
    useCompareStore.setState({ open: true, results: [{ version: mockVersion, data: null, loading: false, error: false, notAvailable: false }] })
    useCompareStore.getState().closeCompare()
    expect(useCompareStore.getState().open).toBe(false)
    expect(useCompareStore.getState().results).toEqual([])
    expect(useCompareStore.getState().targetVerseNumbers).toEqual([])
  })
})
