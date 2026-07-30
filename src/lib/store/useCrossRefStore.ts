import { create } from 'zustand'
import { createContext, createElement, useContext, type ReactNode } from 'react'
import { bibleApi } from '@/lib/bibleApi'
import type { ApiCrossRef, ApiSemanticResult } from '@/lib/bibleApi'

export type CrossRefPanelTab = 'cross' | 'similar'

export interface CrossRefSource {
  verseApiId: number
  label: string
}

export interface CrossRefGroup {
  source: CrossRefSource
  results: ApiCrossRef[]
}

export interface CrossRefState {
  open: boolean
  verseApiId: number | null
  results: ApiCrossRef[]
  groups: CrossRefGroup[]
  loading: boolean
  tab: CrossRefPanelTab
  primarySource: CrossRefSource | null
  similarResults: ApiSemanticResult[]
  similarLoading: boolean
  similarError: boolean
  verseIdsWithRefs: Set<number>
  loadChapterRefs: (chapterId: number) => Promise<void>
  openPanel: (source: number | CrossRefSource[], versionId?: number) => Promise<void>
  openSimilar: (source: CrossRefSource, versionId: number) => Promise<void>
  setTab: (tab: CrossRefPanelTab) => void
  closePanel: () => void
}

export function createCrossRefStore() {
  let requestSequence = 0
  return create<CrossRefState>((set, get) => ({
  open: false,
  verseApiId: null,
  results: [],
  groups: [],
  loading: false,
  tab: 'cross',
  primarySource: null,
  similarResults: [],
  similarLoading: false,
  similarError: false,
  verseIdsWithRefs: new Set(),

  loadChapterRefs: async (chapterId) => {
    try {
      const ids = await bibleApi.crossRefVerseIds(chapterId)
      set({ verseIdsWithRefs: new Set(ids) })
    } catch {
      // non-critical — indicators just won't show
    }
  },

  openPanel: async (source, versionId) => {
    const requestId = ++requestSequence
    const sources = Array.isArray(source)
      ? source
      : [{ verseApiId: source, label: '' }]
    const firstVerseApiId = sources[0]?.verseApiId ?? null

    if (!Array.isArray(source) && get().verseApiId === source && get().open) return
    set({
      open: true,
      tab: 'cross',
      primarySource: sources[0] ?? null,
      verseApiId: firstVerseApiId,
      results: [],
      groups: [],
      loading: true,
      similarResults: [],
      similarLoading: false,
      similarError: false,
    })
    try {
      const settled = await Promise.allSettled(
        sources.map((item) => versionId == null
          ? bibleApi.crossRefs(item.verseApiId)
          : bibleApi.crossRefs(item.verseApiId, versionId))
      )
      const groups = sources.map((item, index) => ({
        source: item,
        results: settled[index].status === 'fulfilled' ? settled[index].value : [],
      }))
      if (requestId !== requestSequence) return
      set({
        groups,
        results: groups.flatMap((group) => group.results),
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  openSimilar: async (source, versionId) => {
    const requestId = ++requestSequence
    set({
      open: true,
      tab: 'similar',
      primarySource: source,
      verseApiId: source.verseApiId,
      similarResults: [],
      similarLoading: true,
      similarError: false,
    })
    try {
      const response = await bibleApi.semanticSimilar(source.verseApiId, 30, versionId)
      if (requestId !== requestSequence) return
      set({ similarResults: response?.results ?? [], similarLoading: false })
    } catch {
      if (requestId !== requestSequence) return
      set({ similarLoading: false, similarError: true })
    }
  },

  setTab: (tab) => set({ tab }),

  closePanel: () => {
    requestSequence += 1
    set({ open: false })
  },
  }))
}

export const useCrossRefStore = createCrossRefStore()
type CrossRefStore = typeof useCrossRefStore

const workspaceCrossRefStores = new Map<string, CrossRefStore>()
const CrossRefStoreContext = createContext<CrossRefStore | null>(null)

export function getCrossRefStoreForTab(tabId: string): CrossRefStore {
  let store = workspaceCrossRefStores.get(tabId)
  if (!store) {
    store = createCrossRefStore()
    workspaceCrossRefStores.set(tabId, store)
  }
  return store
}

export function CrossRefStoreProvider({ store, children }: { store: CrossRefStore; children: ReactNode }) {
  return createElement(CrossRefStoreContext.Provider, { value: store }, children)
}

export function useActiveCrossRefStore(): CrossRefState
export function useActiveCrossRefStore<T>(selector: (state: CrossRefState) => T): T
export function useActiveCrossRefStore<T>(selector?: (state: CrossRefState) => T): T | CrossRefState {
  const store = useContext(CrossRefStoreContext) ?? useCrossRefStore
  if (!selector) return store()
  return store(selector)
}
