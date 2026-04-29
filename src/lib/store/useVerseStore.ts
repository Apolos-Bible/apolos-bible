import { create } from 'zustand'
import { bibleApi, ApiBook, ApiVersion } from '@/lib/bibleApi'

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
  chapterId: number | null
  verses: Verse[]
  loadingVerses: boolean
  loadVersions: () => Promise<void>
  setVersion: (id: number) => Promise<void>
  loadBooks: () => Promise<void>
  selectBook: (slug: string) => void
  selectChapter: (chapter: number) => void
  selectVerse: (id: string | null) => void
  openVerse: (slug: string, chapter: number, verse: number) => Promise<void>
  navigateVerse: (dir: 'next' | 'prev') => void
  navigateChapter: (dir: 'next' | 'prev') => void
  loadChapter: (slug: string, chapter: number) => Promise<void>
}

// Books 1-39 are OT, 40+ are NT
function testament(bookNumber: number): 'old' | 'new' {
  return bookNumber <= 39 ? 'old' : 'new'
}

export const useVerseStore = create<VerseState>((set, get) => ({
  versionId: Number(localStorage.getItem('tulia_version_id')) || 1,
  versions: [],
  books: [],
  selectedBook: '',
  selectedChapter: 1,
  selectedVerseId: null,
  chapterId: null,
  verses: [],
  loadingVerses: false,

  loadVersions: async () => {
    try {
      const versions = await bibleApi.versions()
      set({ versions })
    } catch (e) {
      console.error('Failed to load versions', e)
    }
  },

  setVersion: async (id) => {
    localStorage.setItem('tulia_version_id', String(id))
    set({ versionId: id, books: [], verses: [], selectedVerseId: null })
    await get().loadBooks()
  },

  loadBooks: async () => {
    const { versionId } = get()
    try {
      const apiBooks: ApiBook[] = await bibleApi.books(versionId)
      const books: Book[] = apiBooks.map(b => ({
        id: b.slug,
        number: b.number,
        name: b.name,
        slug: b.slug,
        testament: testament(b.number),
        chapters: b.chapters_count,
      }))
      const defaultBook = books[0]
      set({ books })
      if (defaultBook) {
        set({ selectedBook: defaultBook.slug })
        get().loadChapter(defaultBook.slug, 1)
      }
    } catch (e) {
      console.error('Failed to load books', e)
    }
  },

  loadChapter: async (slug, chapter) => {
    const { versionId } = get()
    set({ loadingVerses: true, selectedVerseId: null })
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
    set({ selectedBook: slug, selectedChapter: 1, selectedVerseId: null })
    get().loadChapter(slug, 1)
  },

  selectChapter: (chapter) => {
    const { selectedBook } = get()
    set({ selectedChapter: chapter, selectedVerseId: null })
    get().loadChapter(selectedBook, chapter)
  },

  selectVerse: (id) => set({ selectedVerseId: id }),

  openVerse: async (slug, chapter, verse) => {
    set({ selectedBook: slug, selectedChapter: chapter, selectedVerseId: null })
    await get().loadChapter(slug, chapter)
    const verseId = `${slug}-${chapter}-${verse}`
    set({ selectedVerseId: verseId })
  },

  navigateVerse: (dir) => {
    const { verses, selectedVerseId } = get()
    if (!verses.length) return
    const idx = verses.findIndex(v => v.id === selectedVerseId)
    const next = dir === 'next'
      ? verses[idx + 1] ?? verses[0]
      : verses[idx - 1] ?? verses[verses.length - 1]
    set({ selectedVerseId: next.id })
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
        set({ selectedBook: nextBook.slug, selectedChapter: 1, selectedVerseId: null })
        get().loadChapter(nextBook.slug, 1)
      }
    } else {
      if (selectedChapter > 1) {
        get().selectChapter(selectedChapter - 1)
      } else if (bookIdx > 0) {
        const prevBook = books[bookIdx - 1]
        set({ selectedBook: prevBook.slug, selectedChapter: prevBook.chapters, selectedVerseId: null })
        get().loadChapter(prevBook.slug, prevBook.chapters)
      }
    }
  },
}))
