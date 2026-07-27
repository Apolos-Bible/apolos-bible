import { create } from 'zustand'
import { bibleApi } from '@/lib/bibleApi'
import { useVerseStore } from './useVerseStore'

const RECENT_KEY = 'apolos_study_bible_recent'
const RECENT_LIMIT = 8

export interface BiblePreviewVerse {
  id: string
  apiId: number
  verse: number
  text: string
}

export interface RecentRef {
  slug: string
  name: string
  chapter: number
}

interface GoToOptions {
  /** Verse to focus, select and scroll to once the chapter is on screen. */
  verse?: number
  /** Keep the current selection instead of resetting it. */
  keepSelection?: boolean
}

interface BiblePreviewState {
  bookSlug: string | null
  bookName: string
  chapter: number
  /** Chapter count of the current book — 0 until the book list is known. */
  chapters: number
  verses: BiblePreviewVerse[]
  selectedIds: Set<string>
  /** Range anchor for shift-click / shift-arrow selection. */
  anchorId: string | null
  /** Keyboard cursor in the verse list. */
  focusedId: string | null
  /** Verse number the list should scroll to; the panel clears it once done. */
  scrollToVerse: number | null
  loading: boolean
  error: boolean
  recent: RecentRef[]

  loadChapter: (slug: string, chapter: number, options?: GoToOptions) => Promise<void>
  setChapter: (chapter: number) => void
  /** Move a chapter forward/back, rolling over into the adjacent book. */
  stepChapter: (dir: 1 | -1) => void
  toggleVerse: (id: string) => void
  selectOnly: (id: string) => void
  extendTo: (id: string) => void
  selectAllInChapter: () => void
  clearSelection: () => void
  setFocused: (id: string | null) => void
  /** Move the keyboard cursor, optionally extending the selection. */
  moveFocus: (delta: number, extend?: boolean) => void
  consumeScrollTo: () => void
}

function readRecent(): RecentRef[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is RecentRef =>
        r && typeof r.slug === 'string' && typeof r.name === 'string' && typeof r.chapter === 'number',
    )
  } catch {
    return []
  }
}

function pushRecent(list: RecentRef[], entry: RecentRef): RecentRef[] {
  const next = [entry, ...list.filter((r) => !(r.slug === entry.slug && r.chapter === entry.chapter))]
    .slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota — recents are a convenience, not state we need.
  }
  return next
}

/** Inclusive index range between two verse ids, in list order. */
function rangeBetween(verses: BiblePreviewVerse[], aId: string, bId: string): Set<string> {
  const a = verses.findIndex((v) => v.id === aId)
  const b = verses.findIndex((v) => v.id === bId)
  if (a === -1 || b === -1) return new Set(b === -1 ? [] : [bId])
  const [from, to] = a <= b ? [a, b] : [b, a]
  return new Set(verses.slice(from, to + 1).map((v) => v.id))
}

export const useBiblePreviewStore = create<BiblePreviewState>((set, get) => ({
  bookSlug: null,
  bookName: '',
  chapter: 1,
  chapters: 0,
  verses: [],
  selectedIds: new Set(),
  anchorId: null,
  focusedId: null,
  scrollToVerse: null,
  loading: false,
  error: false,
  recent: readRecent(),

  loadChapter: async (slug, chapter, options) => {
    const versionId = useVerseStore.getState().versionId
    const books = useVerseStore.getState().books
    const book = books.find((b) => b.slug === slug)
    const chapters = book?.chapters ?? 0
    const target = chapters > 0 ? Math.min(Math.max(chapter, 1), chapters) : Math.max(chapter, 1)

    set({
      loading: true,
      error: false,
      bookSlug: slug,
      bookName: book?.name ?? get().bookName,
      chapter: target,
      chapters,
      ...(options?.keepSelection ? {} : { selectedIds: new Set<string>(), anchorId: null }),
    })

    try {
      const data = await bibleApi.chapter(versionId, slug, target)

      const verses: BiblePreviewVerse[] = data.verses.map((v) => ({
        id: `${slug}-${target}-${v.number}`,
        apiId: v.id,
        verse: v.number,
        text: v.text,
      }))

      // A newer navigation may have landed while this request was in flight.
      if (get().bookSlug !== slug || get().chapter !== target) return

      const focusVerse = options?.verse
      const focusId = focusVerse != null ? `${slug}-${target}-${focusVerse}` : null
      const exists = focusId != null && verses.some((v) => v.id === focusId)

      set((s) => ({
        bookName: data.book.name,
        verses,
        loading: false,
        error: false,
        focusedId: exists ? focusId : null,
        anchorId: exists ? focusId : s.anchorId,
        selectedIds: exists && !options?.keepSelection ? new Set([focusId!]) : s.selectedIds,
        scrollToVerse: exists ? focusVerse! : null,
        recent: pushRecent(s.recent, { slug, name: data.book.name, chapter: target }),
      }))
    } catch {
      if (get().bookSlug !== slug || get().chapter !== target) return
      set({ loading: false, error: true, verses: [] })
    }
  },

  setChapter: (chapter) => {
    const { bookSlug } = get()
    if (bookSlug) get().loadChapter(bookSlug, chapter)
  },

  stepChapter: (dir) => {
    const { bookSlug, chapter, chapters } = get()
    if (!bookSlug) return

    const next = chapter + dir
    if (next >= 1 && (chapters === 0 || next <= chapters)) {
      get().loadChapter(bookSlug, next)
      return
    }

    // Roll over into the neighbouring book.
    const books = useVerseStore.getState().books
    const idx = books.findIndex((b) => b.slug === bookSlug)
    if (idx === -1) return
    const neighbour = books[idx + dir]
    if (!neighbour) return
    get().loadChapter(neighbour.slug, dir === 1 ? 1 : neighbour.chapters)
  },

  toggleVerse: (id) => {
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next, anchorId: id, focusedId: id }
    })
  },

  selectOnly: (id) => set({ selectedIds: new Set([id]), anchorId: id, focusedId: id }),

  extendTo: (id) => {
    set((s) => {
      const anchor = s.anchorId ?? id
      return { selectedIds: rangeBetween(s.verses, anchor, id), anchorId: anchor, focusedId: id }
    })
  },

  selectAllInChapter: () => {
    set((s) => ({
      selectedIds: new Set(s.verses.map((v) => v.id)),
      anchorId: s.verses[0]?.id ?? null,
      focusedId: s.verses[s.verses.length - 1]?.id ?? null,
    }))
  },

  clearSelection: () => set({ selectedIds: new Set(), anchorId: null }),

  setFocused: (id) => set({ focusedId: id }),

  moveFocus: (delta, extend = false) => {
    const { verses, focusedId } = get()
    if (verses.length === 0) return
    const current = verses.findIndex((v) => v.id === focusedId)
    const nextIdx = current === -1
      ? (delta > 0 ? 0 : verses.length - 1)
      : Math.min(Math.max(current + delta, 0), verses.length - 1)
    const next = verses[nextIdx]
    if (!next) return

    if (extend) {
      // Shift+arrow from a bare cursor anchors where the cursor was, so the
      // verse you started on is part of the range.
      if (get().anchorId == null && focusedId) set({ anchorId: focusedId })
      get().extendTo(next.id)
    } else {
      set({ focusedId: next.id })
    }
    set({ scrollToVerse: next.verse })
  },

  consumeScrollTo: () => set({ scrollToVerse: null }),
}))
