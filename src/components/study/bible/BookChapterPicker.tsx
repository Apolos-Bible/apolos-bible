import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { normalizeText } from '@/lib/normalizeText'
import { findBookMatches } from '@/lib/verseSearch'
import type { Book } from '@/lib/store/useVerseStore'

interface BookChapterPickerProps {
  books: Book[]
  currentSlug: string | null
  currentChapter: number
  onPick: (slug: string, chapter: number) => void
  onClose: () => void
}

/**
 * Two-pane book → chapter picker. The left pane is the book list (filterable,
 * multilingual via `findBookMatches`); the right pane is the chapter grid for
 * whichever book is highlighted. Highlighting a book never navigates — only a
 * chapter click does, so browsing is free of side effects.
 */
export function BookChapterPicker({
  books,
  currentSlug,
  currentChapter,
  onPick,
  onClose,
}: BookChapterPickerProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('')
  const [testament, setTestament] = useState<'old' | 'new'>(() => {
    const current = books.find((b) => b.slug === currentSlug)
    return current?.testament ?? 'new'
  })
  const [activeSlug, setActiveSlug] = useState<string | null>(currentSlug)
  const bookListRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    filterRef.current?.focus()
  }, [])

  const filtering = filter.trim().length > 0

  const visibleBooks = useMemo(() => {
    if (!filtering) return books.filter((b) => b.testament === testament)

    const q = normalizeText(filter.trim())
    const prefixMatches = findBookMatches(filter, books, books.length)
    if (prefixMatches.length > 0) return prefixMatches
    // Fall back to substring so "sam" still finds "1 Samuel".
    return books.filter((b) => normalizeText(b.name).includes(q))
  }, [books, filter, filtering, testament])

  // Keep a highlighted book that is actually on screen, so the chapter pane is
  // never showing something the user can't see in the list.
  useEffect(() => {
    if (visibleBooks.length === 0) return
    if (!visibleBooks.some((b) => b.slug === activeSlug)) {
      setActiveSlug(visibleBooks[0].slug)
    }
  }, [visibleBooks, activeSlug])

  useEffect(() => {
    if (!activeSlug) return
    bookListRef.current
      ?.querySelector<HTMLElement>(`[data-book="${activeSlug}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeSlug])

  const activeBook = books.find((b) => b.slug === activeSlug) ?? null
  const chapters = activeBook ? Array.from({ length: activeBook.chapters }, (_, i) => i + 1) : []

  const moveActive = (delta: number) => {
    if (visibleBooks.length === 0) return
    const idx = visibleBooks.findIndex((b) => b.slug === activeSlug)
    const next = Math.min(Math.max((idx === -1 ? 0 : idx) + delta, 0), visibleBooks.length - 1)
    setActiveSlug(visibleBooks[next].slug)
  }

  const handleFilterKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive(-1)
    } else if (e.key === 'Enter' && activeBook) {
      e.preventDefault()
      onPick(activeBook.slug, 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // Let Tab reach the chapter grid rather than escaping the picker.
      const first = document.querySelector<HTMLElement>('[data-chapter-grid] button')
      if (first) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-bg-secondary">
      {/* Filter */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          <input
            ref={filterRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={handleFilterKey}
            placeholder={t('study.bible.filterBooks')}
            aria-label={t('study.bible.filterBooks')}
            className="w-full pl-8 pr-2 py-1.5 bg-bg-primary border border-border rounded-md text-xs text-text-primary outline-none focus:border-accent/50 placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Testament tabs — hidden while filtering, since results span both */}
      {!filtering && (
        <div className="shrink-0 flex gap-1 px-3 pb-2">
          {(['old', 'new'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setTestament(tab)}
              className={cn(
                'flex-1 py-1 rounded-md text-2xs font-medium transition-colors',
                testament === tab
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {tab === 'old' ? t('study.bible.oldTestament') : t('study.bible.newTestament')}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 flex border-t border-border">
        {/* Books */}
        <div ref={bookListRef} className="w-1/2 min-w-0 overflow-y-auto border-r border-border py-1">
          {visibleBooks.length === 0 && (
            <p className="text-2xs text-text-muted px-3 py-4 text-center">{t('study.bible.noBooks')}</p>
          )}
          {visibleBooks.map((book) => (
            <button
              key={book.slug}
              data-book={book.slug}
              onClick={() => setActiveSlug(book.slug)}
              onDoubleClick={() => onPick(book.slug, 1)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors',
                book.slug === activeSlug
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary/60 hover:text-text-primary',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{book.name}</span>
              {book.slug === currentSlug && (
                <span className="w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        {/* Chapters */}
        <div className="w-1/2 min-w-0 overflow-y-auto p-2" data-chapter-grid>
          {activeBook ? (
            <>
              <p className="text-2xs uppercase tracking-wider text-text-muted px-1 pb-1.5 truncate">
                {activeBook.name}
              </p>
              <div className="grid grid-cols-5 gap-1">
                {chapters.map((n) => {
                  const isCurrent = activeBook.slug === currentSlug && n === currentChapter
                  return (
                    <button
                      key={n}
                      onClick={() => onPick(activeBook.slug, n)}
                      className={cn(
                        'h-7 rounded-md text-2xs font-medium tabular-nums transition-colors',
                        isCurrent
                          ? 'bg-accent text-bg-primary'
                          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                      )}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="text-2xs text-text-muted px-1 py-4 text-center">{t('study.bible.pickBookFirst')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
