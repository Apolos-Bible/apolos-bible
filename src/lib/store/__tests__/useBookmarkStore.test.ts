import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import { useBookmarkStore } from '../useBookmarkStore'
import type { BookmarkedVerse } from '../useBookmarkStore'

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }

const mockBookmark: BookmarkedVerse = {
  id: 1,
  verse_id: 100,
  note: null,
  created_at: '2024-01-01T00:00:00Z',
  verse: {
    id: 100,
    number: 16,
    text: 'For God so loved the world',
    chapter: 3,
    book: 'John',
    slug: 'john',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  useBookmarkStore.setState({
    bookmarks: [],
    bookmarkedIds: new Set(),
    loading: false,
  })
})

describe('useBookmarkStore', () => {
  it('starts with empty bookmarks', () => {
    const state = useBookmarkStore.getState()
    expect(state.bookmarks).toEqual([])
    expect(state.bookmarkedIds.size).toBe(0)
    expect(state.loading).toBe(false)
  })

  it('isBookmarked returns false for unknown verse', () => {
    expect(useBookmarkStore.getState().isBookmarked(999)).toBe(false)
  })

  it('load populates bookmarks from API', async () => {
    mockApi.get.mockResolvedValueOnce([mockBookmark])
    await useBookmarkStore.getState().load()
    const state = useBookmarkStore.getState()
    expect(state.bookmarks).toHaveLength(1)
    expect(state.bookmarkedIds.has(100)).toBe(true)
    expect(state.loading).toBe(false)
  })

  it('load handles errors gracefully', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network error'))
    await useBookmarkStore.getState().load()
    expect(useBookmarkStore.getState().loading).toBe(false)
    expect(useBookmarkStore.getState().bookmarks).toEqual([])
  })

  it('toggle adds a bookmark via API', async () => {
    mockApi.post.mockResolvedValueOnce(mockBookmark)
    await useBookmarkStore.getState().toggle(100)
    const state = useBookmarkStore.getState()
    expect(state.bookmarkedIds.has(100)).toBe(true)
    expect(state.bookmarks).toHaveLength(1)
    expect(mockApi.post).toHaveBeenCalledWith('/api/verses/100/bookmark', {})
  })

  it('toggle removes a bookmark via API', async () => {
    useBookmarkStore.setState({
      bookmarks: [mockBookmark],
      bookmarkedIds: new Set([100]),
    })
    mockApi.delete.mockResolvedValueOnce(undefined)
    await useBookmarkStore.getState().toggle(100)
    const state = useBookmarkStore.getState()
    expect(state.bookmarkedIds.has(100)).toBe(false)
    expect(state.bookmarks).toHaveLength(0)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/verses/100/bookmark')
  })
})
