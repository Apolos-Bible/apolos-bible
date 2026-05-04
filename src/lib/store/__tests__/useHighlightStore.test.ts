import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import { useHighlightStore } from '../useHighlightStore'
import type { Highlight } from '@/types'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const mockHighlight: Highlight = {
  id: 1,
  user_id: 10,
  verse_id: 100,
  start_index: 0,
  end_index: 5,
  color: 'yellow',
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useHighlightStore.setState({
    highlights: {},
    loading: {},
  })
})

describe('useHighlightStore', () => {
  it('starts empty', () => {
    expect(useHighlightStore.getState().highlights).toEqual({})
    expect(useHighlightStore.getState().loading).toEqual({})
  })

  it('loadHighlights fetches and stores for a verse', async () => {
    localStorage.setItem('verbum_token', 'test-token')
    mockApi.get.mockResolvedValueOnce([mockHighlight])
    await useHighlightStore.getState().loadHighlights(100)
    expect(useHighlightStore.getState().highlights[100]).toHaveLength(1)
    expect(useHighlightStore.getState().highlights[100][0].color).toBe('yellow')
    expect(useHighlightStore.getState().loading[100]).toBe(false)
  })

  it('loadHighlights skips when not authenticated', async () => {
    await useHighlightStore.getState().loadHighlights(100)
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it('loadHighlightsForChapter fetches batch and groups by verse', async () => {
    localStorage.setItem('verbum_token', 'test-token')
    const h1: Highlight = { id: 1, user_id: 10, verse_id: 100, start_index: 0, end_index: 3, color: 'yellow' }
    const h2: Highlight = { id: 2, user_id: 10, verse_id: 101, start_index: 0, end_index: 5, color: 'blue' }
    mockApi.post.mockResolvedValueOnce([h1, h2])
    await useHighlightStore.getState().loadHighlightsForChapter([100, 101])
    const state = useHighlightStore.getState()
    expect(state.highlights[100]).toHaveLength(1)
    expect(state.highlights[101]).toHaveLength(1)
  })

  it('loadHighlightsForChapter skips when no token', async () => {
    await useHighlightStore.getState().loadHighlightsForChapter([100])
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('addHighlight appends to store', async () => {
    mockApi.post.mockResolvedValueOnce(mockHighlight)
    await useHighlightStore.getState().addHighlight(100, 0, 10, 'blue')
    expect(useHighlightStore.getState().highlights[100]).toHaveLength(1)
    expect(mockApi.post).toHaveBeenCalledWith('/api/verses/100/highlights', {
      start_index: 0,
      end_index: 10,
      color: 'blue',
    })
  })

  it('removeHighlight filters out from store', async () => {
    mockApi.delete.mockResolvedValueOnce(undefined)
    useHighlightStore.setState({ highlights: { 100: [mockHighlight] } })
    await useHighlightStore.getState().removeHighlight(100, 1)
    expect(useHighlightStore.getState().highlights[100]).toHaveLength(0)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/highlights/1')
  })
})
