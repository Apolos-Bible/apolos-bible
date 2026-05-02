import { create } from 'zustand'
import { bibleApi } from '@/lib/bibleApi'
import { useVerseStore } from './useVerseStore'

interface BiblePreviewVerse {
  id: string
  apiId: number
  verse: number
  text: string
}

interface BiblePreviewState {
  bookSlug: string | null
  bookName: string
  chapter: number
  chapters: number
  verses: BiblePreviewVerse[]
  selectedIds: Set<string>
  loading: boolean

  loadChapter: (slug: string, chapter: number) => Promise<void>
  setChapter: (chapter: number) => void
  toggleVerse: (id: string) => void
  selectAllInChapter: () => void
  clearSelection: () => void
}

export const useBiblePreviewStore = create<BiblePreviewState>((set, get) => ({
  bookSlug: null,
  bookName: '',
  chapter: 1,
  chapters: 0,
  verses: [],
  selectedIds: new Set(),
  loading: false,

  loadChapter: async (slug, chapter) => {
    const versionId = useVerseStore.getState().versionId

    set({ loading: true })

    try {
      const data = await bibleApi.chapter(versionId, slug, chapter)

      const verses: BiblePreviewVerse[] = data.verses.map(v => ({
        id: `${slug}-${chapter}-${v.number}`,
        apiId: v.id,
        verse: v.number,
        text: v.text,
      }))

      set({
        bookSlug: slug,
        bookName: data.book.name,
        chapter,
        verses,
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  setChapter: (chapter) => {
    const { bookSlug } = get()
    if (bookSlug) {
      get().loadChapter(bookSlug, chapter)
    }
  },

  toggleVerse: (id) => {
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    })
  },

  selectAllInChapter: () => {
    set((s) => {
      const all = new Set(s.verses.map(v => v.id))
      return { selectedIds: all }
    })
  },

  clearSelection: () => set({ selectedIds: new Set() }),
}))
