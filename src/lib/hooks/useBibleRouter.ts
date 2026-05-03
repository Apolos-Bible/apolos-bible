import { useEffect, useRef } from 'react'
import { useVerseStore } from '@/lib/store/useVerseStore'

function parseBibleUrl(pathname: string): { book: string; chapter: number; verse?: number } | null {
  const match = pathname.match(/^\/bible\/([^/]+)(?:\/(\d+))?(?:\/(\d+))?/)
  if (!match) return null
  return {
    book: match[1],
    chapter: match[2] ? parseInt(match[2], 10) : 1,
    verse: match[3] ? parseInt(match[3], 10) : undefined,
  }
}

function buildPath(book: string, chapter: number, verseId: string | null): string {
  let path = `/bible/${book}/${chapter}`
  if (verseId) {
    const parts = verseId.split('-')
    if (parts.length >= 3) path += `/${parts[2]}`
  }
  return path
}

export function useBibleRouter() {
  const programmaticNav = useRef(false)

  // Store → URL sync via Zustand subscribe (fires synchronously on set())
  useEffect(() => {
    let prevBook = ''
    let prevChapter = 0
    let prevVerseId = ''

    const unsub = useVerseStore.subscribe((state) => {
      const { selectedBook, selectedChapter, selectedVerseId } = state
      if (!selectedBook) return

      if (selectedBook === prevBook && selectedChapter === prevChapter && selectedVerseId === prevVerseId) return
      prevBook = selectedBook
      prevChapter = selectedChapter
      prevVerseId = selectedVerseId ?? ''

      const path = buildPath(selectedBook, selectedChapter, selectedVerseId)
      if (window.location.pathname === path) return

      programmaticNav.current = true
      window.history.replaceState(null, '', path)
    })

    return unsub
  }, [])

  // Browser back/forward → Store via popstate
  useEffect(() => {
    const handlePopstate = () => {
      if (programmaticNav.current) {
        programmaticNav.current = false
        return
      }
      const route = parseBibleUrl(window.location.pathname)
      if (!route) return
      const state = useVerseStore.getState()
      if (state.books.length === 0) return
      if (route.book !== state.selectedBook || route.chapter !== state.selectedChapter) {
        if (route.verse) {
          state.openVerse(route.book, route.chapter, route.verse)
        } else {
          state.loadChapter(route.book, route.chapter)
        }
      }
    }

    window.addEventListener('popstate', handlePopstate)
    return () => window.removeEventListener('popstate', handlePopstate)
  }, [])

  // Parse URL on mount so caller can use it for initial load
  return parseBibleUrl(window.location.pathname)
}
