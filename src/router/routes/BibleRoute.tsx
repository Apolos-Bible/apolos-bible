import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { AppLocale } from '@/lib/defaultAppLocale'
import { PanelLayout } from '@/components/layout/PanelLayout'
import { activeBibleContextPanel } from '@/components/layout/bibleContextPanel'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { VerseList } from '@/components/verse/VerseList'
import { StudyPanel } from '@/components/study/StudyPanel'
import { CommentaryPanel } from '@/components/reading/CommentaryPanel'
import { CompareVersionPanel } from '@/components/reading/CompareVersionPanel'
import { CrossReferencesPanel } from '@/components/reading/CrossReferencesPanel'
import { WorkspaceSidePanel } from '@/components/layout/WorkspaceSidePanel'
import { useActiveCompareStore } from '@/lib/store/useCompareStore'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useActiveBiblePaneStore } from '@/lib/store/useBiblePaneStore'
import { useActiveVerseStore, useVerseStoreApi } from '@/lib/store/useVerseStore'
import { isAppLocale, parseChapter, parseVerse, paths, verseIdToNumber } from '@/router/paths'
import { resolveReferenceBook } from '@/lib/bibleRefs'
import { NotFound } from './NotFound'

export function BibleRoute() {
  const params = useParams<{ lang?: string; book: string; chapter?: string; verse?: string }>()
  const [searchParams] = useSearchParams()

  if (params.lang !== undefined && !isAppLocale(params.lang)) {
    return <NotFound />
  }
  if (!params.book) {
    return <NotFound />
  }

  const lang = isAppLocale(params.lang) ? params.lang : null
  const chapter = parseChapter(params.chapter) ?? 1
  const verse = parseVerse(params.verse)
  const endVerse = parseVerse(searchParams.get('endVerse') ?? undefined)

  return (
    <BibleView
      lang={lang}
      book={params.book}
      chapter={chapter}
      verse={verse ?? null}
      endVerse={endVerse && verse && endVerse > verse ? endVerse : null}
      openCommentary={searchParams.get('commentary') === '1'}
    />
  )
}

type BibleViewProps = {
  lang: AppLocale | null
  book: string
  chapter: number
  verse: number | null
  endVerse: number | null
  openCommentary: boolean
}

function BibleView({ lang, book, chapter, verse, endVerse, openCommentary }: BibleViewProps) {
  const navigate = useNavigate()
  const locale = useUIStore(s => s.locale)
  const setLocale = useUIStore(s => s.setLocale)
  const activePanel = useUIStore(s => s.activePanel)
  const commentaryOpen = useActiveBiblePaneStore(s => s.commentaryOpen)
  const toggleCommentary = useActiveBiblePaneStore(s => s.toggleCommentary)
  const studyVerseId = useActiveVerseStore(s => s.studyVerseId)
  const verseStore = useVerseStoreApi()
  const comparisonOpen = useActiveCompareStore(s => s.open)
  const insightsOpen = useActiveCrossRefStore(s => s.open)
  const commentaryRequestHandled = useRef(false)

  useEffect(() => {
    if (!openCommentary || commentaryRequestHandled.current) return
    commentaryRequestHandled.current = true
    if (!commentaryOpen) toggleCommentary()
  }, [openCommentary, commentaryOpen, toggleCommentary])

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
    const key = `${book}/${chapter}/${verse ?? ''}/${endVerse ?? ''}`
    if (lastSyncedKey.current === key) return
    lastSyncedKey.current = key

    const state = verseStore.getState()

    if (state.books.length === 0) {
      void state.loadBooks({ book, chapter, verse: verse ?? undefined, endVerse: endVerse ?? undefined })
      return
    }

    const matched = resolveReferenceBook(state.books, book)
    if (!matched) return

    const safeChapter = Math.min(Math.max(chapter, 1), matched.chapters)
    const targetVerseId = verse ? `${matched.slug}-${safeChapter}-${verse}` : null

    const sameLocation = state.selectedBook === matched.slug && state.selectedChapter === safeChapter
    const selectedEnd = verseIdToNumber(state.selectedVerseIds[state.selectedVerseIds.length - 1])
    const sameVerse = (state.selectedVerseId ?? null) === targetVerseId
      && (endVerse ? selectedEnd === endVerse : state.selectedVerseIds.length <= 1)

    if (sameLocation && sameVerse) return

    if (verse && endVerse) {
      void state.openVerseRange(matched.slug, safeChapter, verse, endVerse)
    } else if (verse) {
      void state.openVerse(matched.slug, safeChapter, verse)
    } else if (!sameLocation) {
      void state.loadChapter(matched.slug, safeChapter)
    }
  }, [book, chapter, verse, endVerse, verseStore])

  // Store → URL sync (when in-app actions mutate the store, mirror to URL)
  useEffect(() => {
    const writeUrl = () => {
      const state = verseStore.getState()
      const { selectedBook, selectedChapter, selectedVerseId, selectedVerseIds } = state
      if (!selectedBook) return
      const verseNum = verseIdToNumber(selectedVerseId)
      const endVerseNum = selectedVerseIds.length > 1
        ? verseIdToNumber(selectedVerseIds[selectedVerseIds.length - 1])
        : null
      const target = paths.bible({
        lang: useUIStore.getState().locale,
        book: selectedBook,
        chapter: selectedChapter,
        verse: verseNum ?? null,
        endVerse: endVerseNum,
      })
      if (window.location.pathname === target) return
      lastSyncedKey.current = `${selectedBook}/${selectedChapter}/${verseNum ?? ''}`
      navigate(target, { replace: true })
    }

    return verseStore.subscribe((state, prev) => {
      if (
        state.selectedBook === prev.selectedBook &&
        state.selectedChapter === prev.selectedChapter &&
        state.selectedVerseId === prev.selectedVerseId &&
        state.selectedVerseIds === prev.selectedVerseIds
      ) return
      writeUrl()
    })
  }, [navigate, verseStore])

  // Locale change → rewrite URL with new prefix
  useEffect(() => {
    const state = verseStore.getState()
    if (!state.selectedBook) return
    const verseNum = verseIdToNumber(state.selectedVerseId)
    const endVerseNum = state.selectedVerseIds.length > 1
      ? verseIdToNumber(state.selectedVerseIds[state.selectedVerseIds.length - 1])
      : null
    const target = paths.bible({
      lang: locale,
      book: state.selectedBook,
      chapter: state.selectedChapter,
      verse: verseNum ?? null,
      endVerse: endVerseNum,
    })
    if (window.location.pathname === target) return
    navigate(target, { replace: true })
  }, [locale, navigate])

  const leftPanelContent = activePanel ? <WorkspaceSidePanel panel={activePanel} /> : null
  const contextPanel = activeBibleContextPanel(
    studyVerseId,
    insightsOpen,
    comparisonOpen,
    commentaryOpen,
  )

  return (
    <PanelLayout
      sidebar={<Sidebar />}
      main={<VerseList />}
      panel={
        contextPanel === 'notes'
          ? <StudyPanel />
          : contextPanel === 'insights'
            ? <CrossReferencesPanel />
          : contextPanel === 'comparison'
            ? <CompareVersionPanel />
          : contextPanel === 'commentary'
            ? <CommentaryPanel />
            : null
      }
      leftPanel={leftPanelContent}
    />
  )
}
