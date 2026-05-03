import { useEffect, useRef } from 'react'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import type { AppLocale } from '@/lib/defaultAppLocale'

const APP_LOCALES = new Set<string>(['en', 'es'])

function parseBibleUrl(pathname: string): { book: string; chapter: number; verse?: number; lang?: string } | null {
  const match = pathname.match(/^\/bible\/(?:([a-z]{2})\/)?([^/]+)(?:\/(\d+))?(?:\/(\d+))?/)
  if (!match) return null

  if (match[1] && APP_LOCALES.has(match[1])) {
    return {
      lang: match[1],
      book: match[2],
      chapter: match[3] ? parseInt(match[3], 10) : 1,
      verse: match[4] ? parseInt(match[4], 10) : undefined,
    }
  }

  return {
    book: match[1] || match[2],
    chapter: match[2] ? parseInt(match[2], 10) : match[3] ? parseInt(match[3], 10) : 1,
    verse: match[3] ? parseInt(match[3], 10) : undefined,
  }
}

function buildPath(book: string, chapter: number, verseId: string | null): string {
  const locale = useUIStore.getState().locale
  const langPrefix = locale && locale !== 'en' ? `/${locale}` : ''
  let path = `${langPrefix}/bible/${book}/${chapter}`
  if (verseId) {
    const parts = verseId.split('-')
    if (parts.length >= 3) path += `/${parts[2]}`
  }
  return path
}

export function useBibleRouter() {
  const programmaticNav = useRef(false)
  const locale = useUIStore(s => s.locale)

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

  useEffect(() => {
    const { selectedBook, selectedChapter, selectedVerseId } = useVerseStore.getState()
    if (!selectedBook) return

    const path = buildPath(selectedBook, selectedChapter, selectedVerseId)
    if (window.location.pathname === path) return

    programmaticNav.current = true
    window.history.replaceState(null, '', path)
  }, [locale])

  useEffect(() => {
    const handlePopstate = () => {
      if (programmaticNav.current) {
        programmaticNav.current = false
        return
      }
      const route = parseBibleUrl(window.location.pathname)
      if (!route) return

      if (route.lang && route.lang !== useUIStore.getState().locale) {
        const valid = route.lang as AppLocale
        if (APP_LOCALES.has(valid)) {
          useUIStore.getState().setLocale(valid)
        }
      }

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

  return parseBibleUrl(window.location.pathname)
}
