import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/study/marketplaceApi', () => ({
  marketplaceApi: {
    browse: vi.fn(),
    featured: vi.fn(),
    path: vi.fn(),
    myList: vi.fn(),
    rate: vi.fn(),
    unrate: vi.fn(),
    addToList: vi.fn(),
    removeFromList: vi.fn(),
  },
}))

vi.mock('@/lib/store/useGuidedStore', () => ({
  useGuidedStore: {
    setState: vi.fn(),
    getState: vi.fn(() => ({ loadPlans: vi.fn(() => Promise.resolve()) })),
  },
}))

import { marketplaceApi } from '@/lib/study/marketplaceApi'
import { useGuidedStore } from '@/lib/store/useGuidedStore'
import { useMarketplaceStore } from '../useMarketplaceStore'
import type { StudyPathCard } from '@/lib/study/marketplaceApi'

const mockApi = marketplaceApi as unknown as Record<string, ReturnType<typeof vi.fn>>

const card = (over: Partial<StudyPathCard> = {}): StudyPathCard => ({
  slug: 'ansiedad',
  title: 'Ansiedad',
  description: null,
  visibility: 'public',
  is_mine: false,
  author: { id: 2, name: 'Otro' },
  study_count: 3,
  rating_avg: 4,
  rating_count: 2,
  list_count: 1,
  my_rating: null,
  in_my_list: false,
  created_at: null,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.myList.mockResolvedValue([])
  useMarketplaceStore.setState({
    listing: [],
    featured: [],
    myList: [],
    detail: null,
    sort: 'recent',
    query: '',
    nextCursor: null,
    loading: false,
    loadingMore: false,
    error: null,
  })
})

describe('browsing', () => {
  it('loads paths and keeps the cursor', async () => {
    mockApi.browse.mockResolvedValue({ paths: [card()], next_cursor: 'abc' })

    await useMarketplaceStore.getState().browse({ sort: 'rating', q: 'ansi' })

    expect(mockApi.browse).toHaveBeenCalledWith({ sort: 'rating', q: 'ansi' })
    const state = useMarketplaceStore.getState()
    expect(state.listing).toHaveLength(1)
    expect(state.nextCursor).toBe('abc')
    expect(state.sort).toBe('rating')
  })

  it('appends the next page instead of replacing it', async () => {
    useMarketplaceStore.setState({ listing: [card()], nextCursor: 'abc' })
    mockApi.browse.mockResolvedValue({ paths: [card({ slug: 'gratitud' })], next_cursor: null })

    await useMarketplaceStore.getState().loadMore()

    const state = useMarketplaceStore.getState()
    expect(state.listing.map((p) => p.slug)).toEqual(['ansiedad', 'gratitud'])
    expect(state.nextCursor).toBeNull()
  })

  it('does not ask for more with no cursor', async () => {
    await useMarketplaceStore.getState().loadMore()
    expect(mockApi.browse).not.toHaveBeenCalled()
  })
})

describe('featured', () => {
  it('loads the shelf the front page shows', async () => {
    mockApi.featured.mockResolvedValue([card({ slug: 'destacado' })])

    await useMarketplaceStore.getState().loadFeatured()

    expect(useMarketplaceStore.getState().featured.map((p) => p.slug)).toEqual(['destacado'])
  })

  it('surfaces a failure without wiping the shelf', async () => {
    useMarketplaceStore.setState({ featured: [card()] })
    mockApi.featured.mockRejectedValue(new Error('caído'))

    await useMarketplaceStore.getState().loadFeatured()

    const state = useMarketplaceStore.getState()
    expect(state.featured).toHaveLength(1)
    expect(state.error).toBe('caído')
  })

  it('keeps the hero in step when the same path is rated from the grid', async () => {
    // The same path can be in the hero and in the listing at once.
    useMarketplaceStore.setState({ featured: [card()], listing: [card()] })
    mockApi.rate.mockResolvedValue({ rating_avg: 5, rating_count: 1, my_rating: 5 })

    await useMarketplaceStore.getState().rate('ansiedad', 5)

    const state = useMarketplaceStore.getState()
    expect(state.featured[0].my_rating).toBe(5)
    expect(state.listing[0].my_rating).toBe(5)
  })

  it('reads the current vote from the shelf when the grid has not loaded', async () => {
    useMarketplaceStore.setState({ featured: [card({ my_rating: 4 })], listing: [] })
    mockApi.unrate.mockResolvedValue({ rating_avg: 0, rating_count: 0, my_rating: null })

    // Same star again = take it back, even though only the shelf knows the vote.
    await useMarketplaceStore.getState().rate('ansiedad', 4)

    expect(mockApi.unrate).toHaveBeenCalledWith('ansiedad')
    expect(useMarketplaceStore.getState().featured[0].my_rating).toBeNull()
  })
})

describe('rating', () => {
  it('sends the vote and takes the server totals back', async () => {
    useMarketplaceStore.setState({ listing: [card()] })
    mockApi.rate.mockResolvedValue({ rating_avg: 4.5, rating_count: 3, my_rating: 5 })

    await useMarketplaceStore.getState().rate('ansiedad', 5)

    expect(mockApi.rate).toHaveBeenCalledWith('ansiedad', 5)
    const item = useMarketplaceStore.getState().listing[0]
    expect(item.my_rating).toBe(5)
    expect(item.rating_avg).toBe(4.5)
    expect(item.rating_count).toBe(3)
  })

  it('clicking the star I already gave takes the vote back', async () => {
    useMarketplaceStore.setState({ listing: [card({ my_rating: 3 })] })
    mockApi.unrate.mockResolvedValue({ rating_avg: 0, rating_count: 0, my_rating: null })

    await useMarketplaceStore.getState().rate('ansiedad', 3)

    expect(mockApi.unrate).toHaveBeenCalledWith('ansiedad')
    expect(mockApi.rate).not.toHaveBeenCalled()
    expect(useMarketplaceStore.getState().listing[0].my_rating).toBeNull()
  })

  it('rolls the star back when the write fails', async () => {
    useMarketplaceStore.setState({ listing: [card({ my_rating: 2 })] })
    mockApi.rate.mockRejectedValue(new Error('sin conexión'))

    await useMarketplaceStore.getState().rate('ansiedad', 5)

    const state = useMarketplaceStore.getState()
    expect(state.listing[0].my_rating).toBe(2)
    expect(state.error).toBe('sin conexión')
  })

  it('patches the open detail view too', async () => {
    useMarketplaceStore.setState({
      listing: [card()],
      detail: { ...card(), studies: [] },
    })
    mockApi.rate.mockResolvedValue({ rating_avg: 5, rating_count: 1, my_rating: 5 })

    await useMarketplaceStore.getState().rate('ansiedad', 5)

    expect(useMarketplaceStore.getState().detail?.my_rating).toBe(5)
  })
})

describe('study list', () => {
  it('adds the path and refreshes the guided picker', async () => {
    useMarketplaceStore.setState({ listing: [card()] })
    mockApi.addToList.mockResolvedValue({ in_my_list: true, list_count: 2 })

    await useMarketplaceStore.getState().toggleList('ansiedad')

    expect(mockApi.addToList).toHaveBeenCalledWith('ansiedad')
    const item = useMarketplaceStore.getState().listing[0]
    expect(item.in_my_list).toBe(true)
    expect(item.list_count).toBe(2)
    // Adding is what puts it in the picker, so the picker has to reload.
    expect(useGuidedStore.setState).toHaveBeenCalledWith({ plans: [] })
  })

  it('removes it when it was already on the list', async () => {
    useMarketplaceStore.setState({ listing: [card({ in_my_list: true, list_count: 1 })] })
    mockApi.removeFromList.mockResolvedValue({ in_my_list: false, list_count: 0 })

    await useMarketplaceStore.getState().toggleList('ansiedad')

    expect(mockApi.removeFromList).toHaveBeenCalledWith('ansiedad')
    expect(useMarketplaceStore.getState().listing[0].in_my_list).toBe(false)
  })

  it('puts the bookmark back when the write fails', async () => {
    useMarketplaceStore.setState({ listing: [card()] })
    mockApi.addToList.mockRejectedValue(new Error('nope'))

    await useMarketplaceStore.getState().toggleList('ansiedad')

    const state = useMarketplaceStore.getState()
    expect(state.listing[0].in_my_list).toBe(false)
    expect(state.error).toBe('nope')
  })
})
