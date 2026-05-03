import { create } from 'zustand'
import { bibleApi, ApiBook, ApiVersion } from '@/lib/bibleApi'
import {
  BIBLE_VERSION_STORAGE_KEY,
  getBrowserLanguage,
  getStoredBibleVersionId,
  selectDefaultBibleVersionId,
} from '@/lib/defaultBibleVersion'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'

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

interface VerseState {
  versionId: number
  versions: ApiVersion[]
  books: Book[]
  selectedBook: string
  selectedChapter: number
  selectedVerseId: string | null
  selectedVerseIds: string[]
  studyVerseId: string | null
  chapterId: number | null
  verses: Verse[]
  loadingVerses: boolean
  loadVersions: () => Promise<void>
  setVersion: (id: number, options?: { sync?: boolean }) => Promise<void>
  loadBooks: (initialRoute?: { book: string; chapter: number; verse?: number }) => Promise<void>
  selectBook: (slug: string) => void
  selectChapter: (chapter: number) => void
  selectVerse: (id: string | null) => void
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

export const useVerseStore = create<VerseState>((set, get) => ({
  versionId: getStoredBibleVersionId() ?? 1,
  versions: [],
  books: [],
  selectedBook: '',
  selectedChapter: 1,
  selectedVerseId: null,
  selectedVerseIds: [],
  studyVerseId: null,
  chapterId: null,
  verses: [],
  loadingVerses: false,

  loadVersions: async () => {
    try {
      const versions = await bibleApi.versions()
      const storedVersionId = getStoredBibleVersionId()
      set({
        versions,
        versionId: storedVersionId ?? selectDefaultBibleVersionId(versions, getBrowserLanguage(), get().versionId),
      })
    } catch (e) {
      console.error('Failed to load versions', e)
    }
  },

  setVersion: async (id, options) => {
    localStorage.setItem(BIBLE_VERSION_STORAGE_KEY, String(id))
    set({ versionId: id, books: [], verses: [], selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
    if (options?.sync !== false) {
      saveUserSettingsSilently({ preferred_bible_version_id: id })
    }
    await get().loadBooks()
  },

  loadBooks: async (initialRoute?: { book: string; chapter: number; verse?: number }) => {
    let { versionId, versions } = get()
    try {
      if (!getStoredBibleVersionId() && versions.length === 0) {
        versions = await bibleApi.versions()
        versionId = selectDefaultBibleVersionId(versions, getBrowserLanguage(), versionId)
        set({ versions, versionId })
      }

      const apiBooks: ApiBook[] = await bibleApi.books(versionId)
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

  loadChapter: async (slug, chapter) => {
    const { versionId } = get()
    set({ selectedBook: slug, selectedChapter: chapter, loadingVerses: true, selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
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
    } catch (e) {
      console.error('Failed to load chapter', e)
      set({ loadingVerses: false })
    }
  },

  selectBook: (slug) => {
    set({ selectedBook: slug, selectedChapter: 1, selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: slug, chapter: 1 }))
    get().loadChapter(slug, 1)
  },

  selectChapter: (chapter) => {
    const { selectedBook } = get()
    set({ selectedChapter: chapter, selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: selectedBook, chapter }))
    get().loadChapter(selectedBook, chapter)
  },

  selectVerse: (id) => set({ selectedVerseId: id, selectedVerseIds: id ? [id] : [] }),

  toggleVerseSelection: (id) => {
    const { selectedVerseId, selectedVerseIds } = get()
    const isSelected = selectedVerseIds.includes(id)
    const nextIds = isSelected
      ? selectedVerseIds.filter((selectedId) => selectedId !== id)
      : [...selectedVerseIds, id]

    set({
      selectedVerseIds: nextIds,
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
      selectedVerseIds: selectedVerseIds.includes(id) ? selectedVerseIds : [id],
    })
  },

  closeStudyPanel: () => set({ studyVerseId: null }),

  clearLastReading: () => {
    localStorage.removeItem(LAST_READING_KEY)
  },

  openVerse: async (slug, chapter, verse) => {
    set({ selectedBook: slug, selectedChapter: chapter, selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
    await get().loadChapter(slug, chapter)
    const verseId = `${slug}-${chapter}-${verse}`
    set({ selectedVerseId: verseId, selectedVerseIds: [verseId] })
  },

  navigateVerse: (dir) => {
    const { verses, selectedVerseId } = get()
    if (!verses.length) return
    const idx = verses.findIndex(v => v.id === selectedVerseId)
    const next = dir === 'next'
      ? verses[idx + 1] ?? verses[0]
      : verses[idx - 1] ?? verses[verses.length - 1]
    set({ selectedVerseId: next.id, selectedVerseIds: [next.id] })
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
        set({ selectedBook: nextBook.slug, selectedChapter: 1, selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
        get().loadChapter(nextBook.slug, 1)
      }
    } else {
      if (selectedChapter > 1) {
        get().selectChapter(selectedChapter - 1)
      } else if (bookIdx > 0) {
        const prevBook = books[bookIdx - 1]
        set({ selectedBook: prevBook.slug, selectedChapter: prevBook.chapters, selectedVerseId: null, selectedVerseIds: [], studyVerseId: null })
        get().loadChapter(prevBook.slug, prevBook.chapters)
      }
    }
  },
}))
