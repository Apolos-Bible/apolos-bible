import { create } from 'zustand'
import { bibleApi } from '@/lib/bibleApi'
import type { ApiCrossRef } from '@/lib/bibleApi'

export interface CrossRefSource {
  verseApiId: number
  label: string
}

export interface CrossRefGroup {
  source: CrossRefSource
  results: ApiCrossRef[]
}

interface CrossRefState {
  open: boolean
  verseApiId: number | null
  results: ApiCrossRef[]
  groups: CrossRefGroup[]
  loading: boolean
  verseIdsWithRefs: Set<number>
  loadChapterRefs: (chapterId: number) => Promise<void>
  openPanel: (source: number | CrossRefSource[]) => Promise<void>
  closePanel: () => void
}

export const useCrossRefStore = create<CrossRefState>((set, get) => ({
  open: false,
  verseApiId: null,
  results: [],
  groups: [],
  loading: false,
  verseIdsWithRefs: new Set(),

  loadChapterRefs: async (chapterId) => {
    try {
      const ids = await bibleApi.crossRefVerseIds(chapterId)
      set({ verseIdsWithRefs: new Set(ids) })
    } catch {
      // non-critical — indicators just won't show
    }
  },

  openPanel: async (source) => {
    const sources = Array.isArray(source)
      ? source
      : [{ verseApiId: source, label: '' }]
    const firstVerseApiId = sources[0]?.verseApiId ?? null

    if (!Array.isArray(source) && get().verseApiId === source && get().open) return
    set({ open: true, verseApiId: firstVerseApiId, results: [], groups: [], loading: true })
    try {
      const settled = await Promise.allSettled(
        sources.map((item) => bibleApi.crossRefs(item.verseApiId))
      )
      const groups = sources.map((item, index) => ({
        source: item,
        results: settled[index].status === 'fulfilled' ? settled[index].value : [],
      }))
      set({
        groups,
        results: groups.flatMap((group) => group.results),
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  closePanel: () => set({ open: false }),
}))
