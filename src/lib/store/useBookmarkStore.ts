import { create } from 'zustand'
import { api } from '@/lib/api'

export interface BookmarkedVerse {
  id: number
  verse_id: number
  /** IDs for this same passage in every installed Bible version. */
  canonical_verse_ids: number[]
  note: string | null
  created_at: string
  verse: {
    id: number
    number: number
    text: string
    chapter: number
    book: string
    slug: string
  }
}

interface BookmarkState {
  bookmarks: BookmarkedVerse[]
  bookmarkedIds: Set<number>   // all version-specific IDs for fast lookup
  loading: boolean
  load: () => Promise<void>
  toggle: (verseApiId: number) => Promise<void>
  isBookmarked: (verseApiId: number) => boolean
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  bookmarkedIds: new Set(),
  loading: false,

  load: async () => {
    set({ loading: true })
    try {
      const bookmarks = await api.get<BookmarkedVerse[]>('/api/user/bookmarks')
      set({
        bookmarks,
        bookmarkedIds: new Set(bookmarks.flatMap(b => b.canonical_verse_ids ?? [b.verse_id])),
        loading: false,
      })
    } catch {
      set({ loading: false })
    }
  },

  toggle: async (verseApiId) => {
    const { bookmarkedIds } = get()
    if (bookmarkedIds.has(verseApiId)) {
      await api.delete(`/api/verses/${verseApiId}/bookmark`)
      set(s => {
        const next = new Set(s.bookmarkedIds)
        const bookmark = s.bookmarks.find((entry) =>
          (entry.canonical_verse_ids ?? [entry.verse_id]).includes(verseApiId),
        )
        for (const id of bookmark?.canonical_verse_ids ?? [verseApiId]) next.delete(id)
        return {
          bookmarkedIds: next,
          bookmarks: s.bookmarks.filter((entry) => entry.id !== bookmark?.id),
        }
      })
    } else {
      const bookmark = await api.post<BookmarkedVerse>(`/api/verses/${verseApiId}/bookmark`, {})
      set(s => {
        const next = new Set(s.bookmarkedIds)
        for (const id of bookmark.canonical_verse_ids ?? [bookmark.verse_id]) next.add(id)
        return { bookmarkedIds: next, bookmarks: [...s.bookmarks, bookmark] }
      })
    }
  },

  isBookmarked: (verseApiId) => get().bookmarkedIds.has(verseApiId),
}))
