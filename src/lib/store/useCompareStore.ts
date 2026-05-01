import { create } from 'zustand'
import { bibleApi } from '@/lib/bibleApi'
import type { ApiVersion, ApiChapterResponse } from '@/lib/bibleApi'

interface VersionChapter {
  version: ApiVersion
  data: ApiChapterResponse | null
  loading: boolean
  error: boolean
  notAvailable: boolean
}

interface CompareState {
  open: boolean
  results: VersionChapter[]
  targetVerseNumbers: number[]
  openCompare: (versions: ApiVersion[], slug: string, chapter: number, verseNumbers?: number | number[]) => Promise<void>
  closeCompare: () => void
}

export const useCompareStore = create<CompareState>((set) => ({
  open: false,
  results: [],
  targetVerseNumbers: [],

  openCompare: async (versions, slug, chapter, verseNumbers) => {
    const initial: VersionChapter[] = versions.map(v => ({ version: v, data: null, loading: true, error: false, notAvailable: false }))
    const targets = Array.isArray(verseNumbers)
      ? verseNumbers
      : verseNumbers != null
        ? [verseNumbers]
        : []

    set({ open: true, results: initial, targetVerseNumbers: targets })

    const settled = await Promise.allSettled(
      versions.map(v => bibleApi.chapter(v.id, slug, chapter))
    )

    set({
      results: versions.map((v, i) => {
        const r = settled[i]
        if (r.status === 'fulfilled') {
          return { version: v, data: r.value, loading: false, error: false, notAvailable: false }
        }
        const is404 = (r.reason as { status?: number })?.status === 404
        return { version: v, data: null, loading: false, error: !is404, notAvailable: is404 }
      }),
    })
  },

  closeCompare: () => set({ open: false, results: [], targetVerseNumbers: [] }),
}))
