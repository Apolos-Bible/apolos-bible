import { create } from 'zustand'
import { marketplaceApi } from '@/lib/study/marketplaceApi'
import type { MarketplaceSort, StudyPathCard, StudyPathDetail } from '@/lib/study/marketplaceApi'
import { useGuidedStore } from '@/lib/store/useGuidedStore'

type Shelves = {
  listing: StudyPathCard[]
  featured: StudyPathCard[]
  myList: StudyPathCard[]
  detail: StudyPathDetail | null
}

/** Apply a patch to whichever copies of a path are on screen. */
function patchEverywhere(state: Shelves, slug: string, patch: Partial<StudyPathCard>) {
  const one = (p: StudyPathCard) => (p.slug === slug ? { ...p, ...patch } : p)

  return {
    listing: state.listing.map(one),
    featured: state.featured.map(one),
    myList: state.myList.map(one),
    detail: state.detail?.slug === slug ? { ...state.detail, ...patch } : state.detail,
  }
}

/**
 * The same path can be on screen in several places at once — the hero, the
 * featured shelf, the grid, the detail page — so find it wherever it is.
 */
function findPath(state: Shelves, slug: string): StudyPathCard | undefined {
  return (
    state.featured.find((p) => p.slug === slug)
    ?? state.listing.find((p) => p.slug === slug)
    ?? state.myList.find((p) => p.slug === slug)
    ?? (state.detail?.slug === slug ? state.detail : undefined)
  )
}

type MarketplaceStore = Shelves & {
  sort: MarketplaceSort
  query: string
  nextCursor: string | null
  loading: boolean
  loadingMore: boolean
  error: string | null

  browse: (options?: { sort?: MarketplaceSort; q?: string }) => Promise<void>
  loadMore: () => Promise<void>
  loadFeatured: () => Promise<void>
  loadMyList: () => Promise<void>
  openPath: (slug: string) => Promise<void>
  closePath: () => void

  rate: (slug: string, stars: number) => Promise<void>
  toggleList: (slug: string) => Promise<void>
}

export const useMarketplaceStore = create<MarketplaceStore>((set, get) => ({
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

  browse: async (options) => {
    const sort = options?.sort ?? get().sort
    const q = options?.q ?? get().query
    set({ loading: true, sort, query: q })
    try {
      const { paths, next_cursor } = await marketplaceApi.browse({ sort, q })
      set({ listing: paths, nextCursor: next_cursor, error: null })
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    } finally {
      set({ loading: false })
    }
  },

  loadMore: async () => {
    const { nextCursor, sort, query, loadingMore } = get()
    if (!nextCursor || loadingMore) return
    set({ loadingMore: true })
    try {
      const { paths, next_cursor } = await marketplaceApi.browse({ sort, q: query, cursor: nextCursor })
      set((s) => ({ listing: [...s.listing, ...paths], nextCursor: next_cursor, error: null }))
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    } finally {
      set({ loadingMore: false })
    }
  },

  loadFeatured: async () => {
    try {
      set({ featured: await marketplaceApi.featured(), error: null })
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    }
  },

  loadMyList: async () => {
    try {
      set({ myList: await marketplaceApi.myList(), error: null })
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    }
  },

  openPath: async (slug) => {
    set({ loading: true })
    try {
      set({ detail: await marketplaceApi.path(slug), error: null })
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    } finally {
      set({ loading: false })
    }
  },

  closePath: () => set({ detail: null }),

  rate: async (slug, stars) => {
    // Clicking the star you already gave takes the vote back.
    const current = findPath(get(), slug)?.my_rating ?? null
    const removing = current === stars

    set((s) => patchEverywhere(s, slug, { my_rating: removing ? null : stars }))

    try {
      const state = removing ? await marketplaceApi.unrate(slug) : await marketplaceApi.rate(slug, stars)
      set((s) => patchEverywhere(s, slug, state))
    } catch (e: any) {
      set((s) => ({
        ...patchEverywhere(s, slug, { my_rating: current }),
        error: e?.message ?? 'save failed',
      }))
    }
  },

  toggleList: async (slug) => {
    const before = findPath(get(), slug)?.in_my_list ?? false

    set((s) => patchEverywhere(s, slug, { in_my_list: !before }))

    try {
      const state = before
        ? await marketplaceApi.removeFromList(slug)
        : await marketplaceApi.addToList(slug)
      set((s) => patchEverywhere(s, slug, state))
      await get().loadMyList()
      // Adding a path is what puts it in the guided picker, so the picker's
      // copy of the plans is now stale.
      useGuidedStore.setState({ plans: [] })
      await useGuidedStore.getState().loadPlans()
    } catch (e: any) {
      set((s) => ({
        ...patchEverywhere(s, slug, { in_my_list: before }),
        error: e?.message ?? 'save failed',
      }))
    }
  },
}))
