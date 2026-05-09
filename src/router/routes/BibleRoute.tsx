import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { AppLocale } from '@/lib/defaultAppLocale'
import { PanelLayout } from '@/components/layout/PanelLayout'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { VerseList } from '@/components/verse/VerseList'
import { StudyPanel } from '@/components/study/StudyPanel'
import { FavoritesPanel } from '@/components/sidebar/FavoritesPanel'
import { MyNotesPanel } from '@/components/sidebar/MyNotesPanel'
import { MyStudiesPanel } from '@/components/study/MyStudiesPanel'
import { FriendsPanel } from '@/components/friends/FriendsPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { CommentaryPanel } from '@/components/reading/CommentaryPanel'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { isAppLocale, parseChapter, parseVerse, paths, verseIdToNumber } from '@/router/paths'
import { NotFound } from './NotFound'

export function BibleRoute() {
  const params = useParams<{ lang?: string; book: string; chapter?: string; verse?: string }>()

  if (params.lang !== undefined && !isAppLocale(params.lang)) {
    return <NotFound />
  }
  if (!params.book) {
    return <NotFound />
  }

  const lang = isAppLocale(params.lang) ? params.lang : null
  const chapter = parseChapter(params.chapter) ?? 1
  const verse = parseVerse(params.verse)

  return (
    <BibleView
      lang={lang}
      book={params.book}
      chapter={chapter}
      verse={verse ?? null}
    />
  )
}

type BibleViewProps = {
  lang: AppLocale | null
  book: string
  chapter: number
  verse: number | null
}

function BibleView({ lang, book, chapter, verse }: BibleViewProps) {
  const navigate = useNavigate()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)
  const activePanel = useUIStore(s => s.activePanel)
  const commentaryOpen = useUIStore(s => s.commentaryOpen)
  const studyVerseId = useVerseStore(s => s.studyVerseId)

  // URL → locale (when navigating to a localized URL).
  // Important: depend only on `lang` so that locale changes coming from the
  // store (e.g. user toggling language in settings) don't cause this effect
  // to fight back and revert to the URL's old prefix. The locale→URL effect
  // below is responsible for rewriting the URL after store changes.
  useEffect(() => {
    if (!lang) return
    if (lang !== useUIStore.getState().locale) setLocale(lang)
  }, [lang, setLocale])

  // URL → store sync (initial mount + back/forward + programmatic param change)
  const lastSyncedKey = useRef<string>('')
  useEffect(() => {
    const key = `${book}/${chapter}/${verse ?? ''}`
    if (lastSyncedKey.current === key) return
    lastSyncedKey.current = key

    const state = useVerseStore.getState()

    if (state.books.length === 0) {
      void state.loadBooks({ book, chapter, verse: verse ?? undefined })
      return
    }

    const matched = state.books.find(b => b.slug === book)
    if (!matched) return

    const safeChapter = Math.min(Math.max(chapter, 1), matched.chapters)
    const targetVerseId = verse ? `${book}-${safeChapter}-${verse}` : null

    const sameLocation = state.selectedBook === book && state.selectedChapter === safeChapter
    const sameVerse = (state.selectedVerseId ?? null) === targetVerseId

    if (sameLocation && sameVerse) return

    if (verse) {
      void state.openVerse(book, safeChapter, verse)
    } else if (!sameLocation) {
      void state.loadChapter(book, safeChapter)
    }
  }, [book, chapter, verse])

  // Store → URL sync (when in-app actions mutate the store, mirror to URL)
  useEffect(() => {
    const writeUrl = () => {
      const state = useVerseStore.getState()
      const { selectedBook, selectedChapter, selectedVerseId } = state
      if (!selectedBook) return
      const verseNum = verseIdToNumber(selectedVerseId)
      const target = paths.bible({
        lang: useUIStore.getState().locale,
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseNum ?? null,
      })
      if (window.location.pathname === target) return
      lastSyncedKey.current = `${selectedBook}/${selectedChapter}/${verseNum ?? ''}`
      navigate(target, { replace: true })
    }

    return useVerseStore.subscribe((state, prev) => {
      if (
        state.selectedBook === prev.selectedBook &&
        state.selectedChapter === prev.selectedChapter &&
        state.selectedVerseId === prev.selectedVerseId
      ) return
      writeUrl()
    })
  }, [navigate])

  // Locale change → rewrite URL with new prefix
  useEffect(() => {
    const state = useVerseStore.getState()
    if (!state.selectedBook) return
    const verseNum = verseIdToNumber(state.selectedVerseId)
    const target = paths.bible({
      lang: locale,
      book: state.selectedBook,
      chapter: state.selectedChapter,
      verse: verseNum ?? null,
    })
    if (window.location.pathname === target) return
    navigate(target, { replace: true })
  }, [locale, navigate])

  const leftPanelContent = activePanel === 'favorites' ? <FavoritesPanel />
    : activePanel === 'my-notes' ? <MyNotesPanel />
    : activePanel === 'my-studies' ? <MyStudiesPanel />
    : activePanel === 'friends' ? <FriendsPanel />
    : activePanel === 'chat' ? <ChatPanel />
    : null

  return (
    <PanelLayout
      sidebar={<Sidebar />}
      main={<VerseList />}
      panel={commentaryOpen ? <CommentaryPanel /> : studyVerseId ? <StudyPanel /> : null}
      leftPanel={leftPanelContent}
    />
  )
}
