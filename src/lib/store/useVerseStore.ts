import { create } from 'zustand'
import { createContext, createElement, useContext, type ReactNode } from 'react'
import { bibleApi, ApiBook, ApiVersion } from '@/lib/bibleApi'
import {
  BIBLE_VERSION_STORAGE_KEY,
  getFrontendLanguage,
  getStoredBibleVersionId,
  selectDefaultBibleVersionId,
} from '@/lib/defaultBibleVersion'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'
import { prefetchVersion } from '@/lib/prefetchBible'
import { pingReadingActivity } from '@/lib/readingActivity'

const LAST_READING_KEY = 'verbum_last_reading'

export interface Book {
  id: string  // slug used as id for compatibility
  number: number
  name: string
  slug: string
  testament: 'old' | 'new'
  chapters: number
}

export interface Verse {
  id: string      // slug-chapter-verse (for UI)
  apiId: number   // numeric DB id
  book: string
  chapter: number
  verse: number
  text: string
}

export interface VerseState {
  versionId: number
  versions: ApiVersion[]
  books: Book[]
  selectedBook: string
  selectedChapter: number
  selectedVerseId: string | null
  selectedVerseIds: string[]
  /**
   * The reader's keyboard cursor. Deliberately outlives the selection: clearing
   * the selection with Esc must not move the cursor, and verse commands (n, f,
   * h…) need a target even when nothing is selected.
   */
  cursorVerseId: string | null
  /**
   * Where a Shift-range starts. Set by every deliberate single pick (plain
   * click, j/k, mod+click) and left alone while a range is being extended, so
   * Shift+click / Shift+J keep growing from the same origin.
   */
  selectionAnchorId: string | null
  studyVerseId: string | null
  chapterId: number | null
  verses: Verse[]
  loadingVerses: boolean
  loadVersions: () => Promise<void>
  setVersion: (id: number, options?: { sync?: boolean }) => Promise<void>
  setDefaultVersionForLocale: (locale: string) => Promise<void>
  loadBooks: (initialRoute?: { book: string; chapter: number; verse?: number }) => Promise<void>
  ensureBooks: () => Promise<void>
  selectBook: (slug: string) => void
  selectChapter: (chapter: number) => void
  selectVerse: (id: string | null) => void
  setCursorVerse: (id: string | null) => void
  /** Shift+click / Shift+J: select everything between the anchor and `id`. */
  selectVerseRangeTo: (id: string) => void
  /** Shift+J / Shift+K: grow or shrink the range one verse at a time. */
  extendVerseSelection: (dir: 'next' | 'prev') => void
  selectAllVerses: () => void
  toggleVerseSelection: (id: string) => void
  openStudyPanel: (id: string) => void
  closeStudyPanel: () => void
  openVerse: (slug: string, chapter: number, verse: number) => Promise<void>
  navigateVerse: (dir: 'next' | 'prev') => void
  navigateChapter: (dir: 'next' | 'prev') => void
  loadChapter: (slug: string, chapter: number) => Promise<void>
  clearLastReading: () => void
}

// Books 1-39 are OT, 40+ are NT
function testament(bookNumber: number): 'old' | 'new' {
  return bookNumber <= 39 ? 'old' : 'new'
}

function storedActiveVersionId(versions: ApiVersion[]): number | null {
  const storedVersionId = getStoredBibleVersionId()
  if (storedVersionId == null) return null
  if (versions.some((version) => version.id === storedVersionId)) return storedVersionId

  // A previously selected version may have been unpublished since the last
  // session. Remove that stale preference instead of requesting hidden content.
  localStorage.removeItem(BIBLE_VERSION_STORAGE_KEY)
  return null
}

export function createVerseStore() {
  return create<VerseState>((set, get) => ({
  versionId: getStoredBibleVersionId() ?? 1,
  versions: [],
  books: [],
  selectedBook: '',
  selectedChapter: 1,
  selectedVerseId: null,
  selectedVerseIds: [],
  cursorVerseId: null,
  selectionAnchorId: null,
  studyVerseId: null,
  chapterId: null,
  verses: [],
  loadingVerses: false,

  loadVersions: async () => {
    try {
      const versions = await bibleApi.versions()
      const storedVersionId = storedActiveVersionId(versions)
      set({
        versions,
        versionId: storedVersionId ?? selectDefaultBibleVersionId(versions, getFrontendLanguage(), get().versionId),
      })
    } catch (e) {
      console.error('Failed to load versions', e)
    }
  },

  setVersion: async (id, options) => {
    localStorage.setItem(BIBLE_VERSION_STORAGE_KEY, String(id))
    set({ versionId: id, books: [], verses: [], selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
    if (options?.sync !== false) {
      saveUserSettingsSilently({ preferred_bible_version_id: id })
    }
    await get().loadBooks()
  },

  setDefaultVersionForLocale: async (locale) => {
    // A deliberate version choice wins over the UI language. The setting is
    // persisted by setVersion, while this action only manages the default.
    try {
      let { versions, versionId } = get()
      if (versions.length === 0) {
        versions = await bibleApi.versions()
      }
      if (storedActiveVersionId(versions) != null) {
        set({ versions })
        return
      }

      const nextVersionId = selectDefaultBibleVersionId(versions, locale, versionId)
      set({ versions })
      if (nextVersionId === versionId) return

      set({
        versionId: nextVersionId,
        books: [],
        verses: [],
        selectedVerseId: null,
        selectedVerseIds: [],
        cursorVerseId: null,
        selectionAnchorId: null,
        studyVerseId: null,
      })
      await get().loadBooks()
    } catch (e) {
      console.error('Failed to set the default Bible version', e)
    }
  },

  loadBooks: async (initialRoute?: { book: string; chapter: number; verse?: number }) => {
    let { versionId, versions } = get()
    try {
      if (versions.length === 0) {
        versions = await bibleApi.versions()
      }
      versionId = storedActiveVersionId(versions)
        ?? selectDefaultBibleVersionId(versions, getFrontendLanguage(), versionId)
      set({ versions, versionId })

      const apiBooks: ApiBook[] = await bibleApi.books(versionId)
      if (!Array.isArray(apiBooks)) {
        console.error('[bibleApi.books] non-array response', { versionId, apiBooks })
        return
      }
      prefetchVersion(versionId, apiBooks)
      const books: Book[] = apiBooks.map(b => ({
        id: b.slug,
        number: b.number,
        name: b.name,
        slug: b.slug,
        testament: testament(b.number),
        chapters: b.chapters_count,
      }))
      set({ books })

      if (books.length === 0) return

      if (initialRoute) {
        const matchedBook = books.find(b => b.slug === initialRoute.book)
        if (matchedBook) {
          const chapter = Math.min(Math.max(initialRoute.chapter, 1), matchedBook.chapters)
          set({ selectedBook: matchedBook.slug, selectedChapter: chapter })
          if (initialRoute.verse) {
            get().openVerse(matchedBook.slug, chapter, initialRoute.verse)
          } else {
            get().loadChapter(matchedBook.slug, chapter)
          }
          return
        }
      }

      const defaultBook = books[0]
      try {
        const raw = localStorage.getItem(LAST_READING_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed.book === 'string' && typeof parsed.chapter === 'number') {
            const matchedBook = books.find(b => b.slug === parsed.book)
            if (matchedBook && parsed.chapter >= 1 && parsed.chapter <= matchedBook.chapters) {
              set({ selectedBook: matchedBook.slug, selectedChapter: parsed.chapter })
              get().loadChapter(matchedBook.slug, parsed.chapter)
              return
            }
          }
        }
      } catch {
        // ignore parse errors, fall through to default
      }
      set({ selectedBook: defaultBook.slug })
      get().loadChapter(defaultBook.slug, 1)
    } catch (e) {
      console.error('Failed to load books', e)
    }
  },

  // Lightweight loader for routes that show the sidebar without the reader
  // (profile / settings). Fetches versions + books and restores the
  // selected-book highlight from last reading, but does NOT load a chapter —
  // so no verses are fetched and no reading activity is recorded just for
  // opening a page.
  ensureBooks: async () => {
    if (get().books.length > 0) return
    let { versionId, versions } = get()
    try {
      if (versions.length === 0) {
        versions = await bibleApi.versions()
      }
      versionId = storedActiveVersionId(versions)
        ?? selectDefaultBibleVersionId(versions, getFrontendLanguage(), versionId)
      set({ versions, versionId })

      const apiBooks: ApiBook[] = await bibleApi.books(versionId)
      if (!Array.isArray(apiBooks)) {
        console.error('[bibleApi.books] non-array response', { versionId, apiBooks })
        return
      }
      // A concurrent loadBooks() may have populated state meanwhile — defer.
      if (get().books.length > 0) return

      // No prefetchVersion here — the reader triggers the offline prefetch
      // itself when it mounts; pages only need the book list.
      const books: Book[] = apiBooks.map(b => ({
        id: b.slug,
        number: b.number,
        name: b.name,
        slug: b.slug,
        testament: testament(b.number),
        chapters: b.chapters_count,
      }))
      set({ books })

      if (get().selectedBook) return
      try {
        const raw = localStorage.getItem(LAST_READING_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.book === 'string' && typeof parsed.chapter === 'number') {
          const matchedBook = books.find(b => b.slug === parsed.book)
          if (matchedBook && parsed.chapter >= 1 && parsed.chapter <= matchedBook.chapters) {
            set({ selectedBook: matchedBook.slug, selectedChapter: parsed.chapter })
          }
        }
      } catch {
        // ignore parse errors — highlight is cosmetic here
      }
    } catch (e) {
      console.error('Failed to load books', e)
    }
  },

  loadChapter: async (slug, chapter) => {
    const { versionId } = get()
    set({ selectedBook: slug, selectedChapter: chapter, loadingVerses: true, selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: slug, chapter }))
    try {
      const data = await bibleApi.chapter(versionId, slug, chapter)
      const verses: Verse[] = data.verses.map(v => ({
        id: `${slug}-${chapter}-${v.number}`,
        apiId: v.id,
        book: data.book.name,
        chapter,
        verse: v.number,
        text: v.text,
      }))
      set({ verses, chapterId: data.chapter_id, loadingVerses: false })
      const { versions } = get()
      pingReadingActivity({
        book_name: data.book.name,
        book_slug: slug,
        chapter,
        verse: 1,
        version: versions.find(v => v.id === versionId)?.abbreviation ?? '',
      })
    } catch (e) {
      console.error('Failed to load chapter', e)
      set({ loadingVerses: false })
    }
  },

  selectBook: (slug) => {
    set({ selectedBook: slug, selectedChapter: 1, selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: slug, chapter: 1 }))
    get().loadChapter(slug, 1)
  },

  selectChapter: (chapter) => {
    const { selectedBook } = get()
    set({ selectedChapter: chapter, selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: selectedBook, chapter }))
    get().loadChapter(selectedBook, chapter)
  },

  // Note: clearing the selection (id === null) leaves the cursor where it is.
  selectVerse: (id) =>
    set(
      id
        ? { selectedVerseId: id, selectedVerseIds: [id], cursorVerseId: id, selectionAnchorId: id }
        : { selectedVerseId: null, selectedVerseIds: [] },
    ),

  setCursorVerse: (id) => set({ cursorVerseId: id }),

  selectVerseRangeTo: (id) => {
    const { verses, selectionAnchorId, selectedVerseId, cursorVerseId } = get()
    const anchorId = selectionAnchorId ?? selectedVerseId ?? cursorVerseId ?? id

    const from = verses.findIndex((v) => v.id === anchorId)
    const to = verses.findIndex((v) => v.id === id)
    if (from < 0 || to < 0) return

    const [lo, hi] = from <= to ? [from, to] : [to, from]
    set({
      selectedVerseIds: verses.slice(lo, hi + 1).map((v) => v.id),
      selectedVerseId: id,
      cursorVerseId: id,
      // The anchor deliberately survives so successive extensions keep growing
      // from the original origin instead of ratcheting along.
      selectionAnchorId: anchorId,
    })
  },

  extendVerseSelection: (dir) => {
    const { verses, selectedVerseId, cursorVerseId } = get()
    if (!verses.length) return

    const idx = verses.findIndex((v) => v.id === (selectedVerseId ?? cursorVerseId))
    const nextIdx = idx < 0
      ? 0
      : dir === 'next'
        ? Math.min(verses.length - 1, idx + 1)
        : Math.max(0, idx - 1)

    const next = verses[nextIdx]
    if (next) get().selectVerseRangeTo(next.id)
  },

  selectAllVerses: () => {
    const { verses } = get()
    if (!verses.length) return
    set({
      selectedVerseIds: verses.map((v) => v.id),
      selectedVerseId: verses[verses.length - 1].id,
      cursorVerseId: verses[verses.length - 1].id,
      selectionAnchorId: verses[0].id,
    })
  },

  toggleVerseSelection: (id) => {
    const { selectedVerseId, selectedVerseIds } = get()
    const isSelected = selectedVerseIds.includes(id)
    const nextIds = isSelected
      ? selectedVerseIds.filter((selectedId) => selectedId !== id)
      : [...selectedVerseIds, id]

    set({
      selectedVerseIds: nextIds,
      cursorVerseId: id,
      selectionAnchorId: id,
      selectedVerseId: isSelected
        ? selectedVerseId === id
          ? nextIds[nextIds.length - 1] ?? null
          : selectedVerseId
        : id,
    })
  },

  openStudyPanel: (id) => {
    const { selectedVerseIds } = get()
    set({
      studyVerseId: id,
      selectedVerseId: id,
      cursorVerseId: id,
      selectedVerseIds: selectedVerseIds.includes(id) ? selectedVerseIds : [id],
    })
  },

  closeStudyPanel: () => set({ studyVerseId: null }),

  clearLastReading: () => {
    localStorage.removeItem(LAST_READING_KEY)
  },

  openVerse: async (slug, chapter, verse) => {
    set({ selectedBook: slug, selectedChapter: chapter, selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
    await get().loadChapter(slug, chapter)
    const verseId = `${slug}-${chapter}-${verse}`
    set({ selectedVerseId: verseId, selectedVerseIds: [verseId], cursorVerseId: verseId, selectionAnchorId: verseId })
    const { verses, versionId, versions } = get()
    pingReadingActivity({
      book_name: verses[0]?.book ?? slug,
      book_slug: slug,
      chapter,
      verse,
      version: versions.find(v => v.id === versionId)?.abbreviation ?? '',
    })
  },

  navigateVerse: (dir) => {
    const { verses, cursorVerseId, selectedVerseId } = get()
    if (!verses.length) return
    const idx = verses.findIndex(v => v.id === (cursorVerseId ?? selectedVerseId))
    const next = dir === 'next'
      ? verses[idx + 1] ?? verses[0]
      : verses[idx - 1] ?? verses[verses.length - 1]
    set({
      selectedVerseId: next.id,
      selectedVerseIds: [next.id],
      cursorVerseId: next.id,
      selectionAnchorId: next.id,
    })
  },

  navigateChapter: (dir) => {
    const { books, selectedBook, selectedChapter } = get()
    if (!books.length) return
    const bookIdx = books.findIndex(b => b.slug === selectedBook)
    if (bookIdx === -1) return
    const book = books[bookIdx]

    if (dir === 'next') {
      if (selectedChapter < book.chapters) {
        get().selectChapter(selectedChapter + 1)
      } else if (bookIdx < books.length - 1) {
        const nextBook = books[bookIdx + 1]
        set({ selectedBook: nextBook.slug, selectedChapter: 1, selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
        get().loadChapter(nextBook.slug, 1)
      }
    } else {
      if (selectedChapter > 1) {
        get().selectChapter(selectedChapter - 1)
      } else if (bookIdx > 0) {
        const prevBook = books[bookIdx - 1]
        set({ selectedBook: prevBook.slug, selectedChapter: prevBook.chapters, selectedVerseId: null, selectedVerseIds: [], cursorVerseId: null, selectionAnchorId: null, studyVerseId: null })
        get().loadChapter(prevBook.slug, prevBook.chapters)
      }
    }
  },
  }))
}

/** The legacy/global reader store used by mobile and non-workspace routes. */
export const useVerseStore = createVerseStore()

export type VerseStore = typeof useVerseStore

const workspaceVerseStores = new Map<string, VerseStore>()

/** Lazily creates a completely independent Bible state for an editor tab. */
export function getVerseStoreForTab(tabId: string): VerseStore {
  let store = workspaceVerseStores.get(tabId)
  if (!store) {
    store = createVerseStore()
    workspaceVerseStores.set(tabId, store)
  }
  return store
}

const VerseStoreContext = createContext<VerseStore | null>(null)

export function VerseStoreProvider({ store, children }: { store: VerseStore; children: ReactNode }) {
  return createElement(VerseStoreContext.Provider, { value: store }, children)
}

/** Reads the Bible store belonging to the current workspace pane. */
export function useActiveVerseStore<T>(selector: (state: VerseState) => T): T {
  const store = useContext(VerseStoreContext) ?? useVerseStore
  return store(selector)
}

export function useVerseStoreApi(): VerseStore {
  return useContext(VerseStoreContext) ?? useVerseStore
}
