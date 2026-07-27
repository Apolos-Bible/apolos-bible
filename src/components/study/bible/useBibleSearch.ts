import { useEffect, useMemo, useRef, useState } from 'react'
import { bibleApi, type ApiSearchResult } from '@/lib/bibleApi'
import { findBookMatches, parseReferenceQuery } from '@/lib/verseSearch'
import type { Book } from '@/lib/store/useVerseStore'

export type BibleSearchItem =
  /** A parsed reference — "juan 3:16" → jump straight there. */
  | { kind: 'goto'; key: string; slug: string; bookName: string; chapter: number; verse: number | null }
  /** A book name with no chapter yet — jump to chapter 1. */
  | { kind: 'book'; key: string; slug: string; bookName: string; chapters: number }
  /** A full-text hit. */
  | { kind: 'result'; key: string; result: ApiSearchResult }

const MIN_QUERY = 2
const DEBOUNCE_MS = 220

/**
 * Search behind the Bible tool's single input. Three answers, cheapest first:
 * a parsed reference ("juan 3:16"), matching book names ("juan"), and — only
 * when the query isn't a reference — a debounced full-text search.
 */
export function useBibleSearch(query: string, versionId: number, books: Book[]) {
  const [results, setResults] = useState<ApiSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const requestRef = useRef(0)

  const trimmed = query.trim()
  const reference = useMemo(() => parseReferenceQuery(trimmed), [trimmed])

  const bookMatches = useMemo(
    () => (reference ? [] : findBookMatches(trimmed, books, 6)),
    [reference, trimmed, books],
  )

  // A reference resolves locally; only free text needs the network.
  const wantsTextSearch = trimmed.length >= MIN_QUERY && !reference

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!wantsTextSearch) {
      requestRef.current += 1
      setResults([])
      setLoading(false)
      return
    }

    const request = ++requestRef.current
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const found = await bibleApi.search(versionId, trimmed)
        if (requestRef.current !== request) return
        setResults(Array.isArray(found) ? found : [])
      } catch {
        if (requestRef.current !== request) return
        setResults([])
      } finally {
        if (requestRef.current === request) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [trimmed, versionId, wantsTextSearch])

  const items = useMemo<BibleSearchItem[]>(() => {
    const out: BibleSearchItem[] = []

    if (reference) {
      // The reference parser returns canonical English slugs; the loaded books
      // may be localized, so match on the canonical slug the same way
      // findBookMatches does — via the book's own slug or its display name.
      const book =
        books.find((b) => b.slug === reference.slug) ??
        // Aliases are spaced ("1 samuel"), slugs are hyphenated.
        findBookMatches(reference.slug.replace(/-/g, ' '), books, 1)[0] ??
        null
      const slug = book?.slug ?? reference.slug
      const chapter = book ? Math.min(reference.chapter, book.chapters) : reference.chapter
      out.push({
        kind: 'goto',
        key: `goto-${slug}-${chapter}-${reference.verse ?? 'all'}`,
        slug,
        bookName: book?.name ?? reference.slug,
        chapter,
        verse: reference.verse,
      })
    }

    bookMatches.forEach((b) =>
      out.push({ kind: 'book', key: `book-${b.slug}`, slug: b.slug, bookName: b.name, chapters: b.chapters }),
    )

    results.forEach((r) => out.push({ kind: 'result', key: `hit-${r.id}`, result: r }))

    return out
  }, [reference, bookMatches, results, books])

  return {
    items,
    loading,
    /** True once the query is long enough to have produced an answer. */
    active: trimmed.length >= MIN_QUERY || reference != null,
    minQuery: MIN_QUERY,
  }
}
