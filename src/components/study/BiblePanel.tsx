import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, ChevronLeft, ChevronRight, ChevronDown, Search, BookOpen,
  ListPlus, Layers, CornerDownLeft, AlertCircle, Check,
} from 'lucide-react'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useBiblePreviewStore, type BiblePreviewVerse } from '@/lib/store/useBiblePreviewStore'
import { useIsMobile } from '@/lib/useIsMobile'
import { cn } from '@/lib/cn'
import { setVerseDrag, endVerseDrag, type VerseDragItem } from '@/lib/study/verseDrag'
import { BookChapterPicker } from './bible/BookChapterPicker'
import { VerseRow } from './bible/VerseRow'
import { formatVerseRanges } from './bible/formatVerseRanges'
import { useBibleSearch, type BibleSearchItem } from './bible/useBibleSearch'

interface BiblePanelProps {
  open: boolean
  onClose: () => void
  isGuest?: boolean
}

type CanvasActions = {
  addVerseNode?: (data: VerseDragItem, position?: { x: number; y: number }) => void
  addVerseChain?: (verses: VerseDragItem[], position?: { x: number; y: number }) => void
  addPassageNode?: (data: {
    bookSlug: string
    chapter: number
    startVerse: number
    endVerse: number
    reference: string
    version_id: number
    verses: { verseId: number; reference: string; verse: number; text: string }[]
  }) => void
}

const getActions = (): CanvasActions | undefined => (window as any).__studyCanvasActions

export function BiblePanel({ open, onClose, isGuest = false }: BiblePanelProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const books = useVerseStore((s) => s.books)
  const versionId = useVerseStore((s) => s.versionId)
  const ensureBooks = useVerseStore((s) => s.ensureBooks)

  const {
    bookSlug, bookName, chapter, chapters, verses,
    selectedIds, focusedId, scrollToVerse, loading, error, recent,
    loadChapter, stepChapter, toggleVerse, selectOnly, extendTo,
    selectAllInChapter, clearSelection, moveFocus, consumeScrollTo,
  } = useBiblePreviewStore()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchIdx, setSearchIdx] = useState(0)
  // The cursor outline only shows while the list actually holds focus, so it
  // can't be mistaken for a selection once you click away.
  const [listFocused, setListFocused] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const { items: searchItems, loading: searching, active: searchActive, minQuery } =
    useBibleSearch(query, versionId, books)

  const searchMode = query.trim().length > 0
  const canEdit = !isGuest

  // --- Bootstrap -----------------------------------------------------------
  useEffect(() => {
    if (open) ensureBooks()
  }, [open, ensureBooks])

  // Land somewhere meaningful on first open: where the user last was in this
  // tool, then whatever they were reading, then the first book.
  useEffect(() => {
    if (!open || bookSlug || books.length === 0) return
    const readerBook = useVerseStore.getState().selectedBook
    const fromRecent = recent.find((r) => books.some((b) => b.slug === r.slug))
    if (fromRecent) {
      loadChapter(fromRecent.slug, fromRecent.chapter)
    } else if (readerBook && books.some((b) => b.slug === readerBook)) {
      loadChapter(readerBook, useVerseStore.getState().selectedChapter || 1)
    } else {
      loadChapter(books[0].slug, 1)
    }
  }, [open, bookSlug, books, recent, loadChapter])

  // The book list can arrive after the chapter did, leaving `chapters` at 0 —
  // refresh it so the chapter pager knows where the book ends.
  useEffect(() => {
    if (!bookSlug || chapters > 0) return
    const book = books.find((b) => b.slug === bookSlug)
    if (book) useBiblePreviewStore.setState({ chapters: book.chapters })
  }, [books, bookSlug, chapters])

  useEffect(() => {
    if (!open) {
      setPickerOpen(false)
      setQuery('')
    }
  }, [open])

  // Re-fetch the open chapter when the reading version changes under us.
  const knownVersionRef = useRef(versionId)
  useEffect(() => {
    if (knownVersionRef.current === versionId) return
    knownVersionRef.current = versionId
    if (!bookSlug) return
    loadChapter(bookSlug, chapter, { keepSelection: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version changes only
  }, [versionId])

  useEffect(() => {
    setSearchIdx(0)
  }, [query])

  // --- Scroll the requested verse into view --------------------------------
  useEffect(() => {
    if (scrollToVerse == null) return
    const row = listRef.current?.querySelector<HTMLElement>(`[data-verse="${scrollToVerse}"]`)
    row?.scrollIntoView({ block: 'nearest' })
    consumeScrollTo()
  }, [scrollToVerse, verses, consumeScrollTo])

  // --- Selection helpers ---------------------------------------------------
  const selectedVerses = useMemo(
    () => verses.filter((v) => selectedIds.has(v.id)),
    [verses, selectedIds],
  )

  /** "Juan 3:16-18" — names the selection instead of only counting it. */
  const selectionLabel = useMemo(() => {
    if (selectedVerses.length === 0) return ''
    return `${bookName} ${chapter}:${formatVerseRanges(selectedVerses.map((v) => v.verse))}`
  }, [selectedVerses, bookName, chapter])

  const toDragItem = useCallback(
    (v: BiblePreviewVerse): VerseDragItem => ({
      verseId: v.apiId,
      reference: `${bookName} ${chapter}:${v.verse}`,
      version_id: versionId,
      text: v.text,
      verse: v.verse,
    }),
    [bookName, chapter, versionId],
  )

  const insertVerses = useCallback(
    (list: BiblePreviewVerse[], position?: { x: number; y: number }) => {
      if (!canEdit || list.length === 0) return
      const items = list.map(toDragItem)
      const actions = getActions()
      if (items.length === 1) actions?.addVerseNode?.(items[0], position)
      else actions?.addVerseChain?.(items, position)
      clearSelection()
    },
    [canEdit, toDragItem, clearSelection],
  )

  const insertAsPassage = useCallback(() => {
    if (!canEdit || selectedVerses.length === 0 || !bookSlug) return
    const first = selectedVerses[0]
    const last = selectedVerses[selectedVerses.length - 1]
    const reference =
      first.verse === last.verse
        ? `${bookName} ${chapter}:${first.verse}`
        : `${bookName} ${chapter}:${first.verse}-${last.verse}`
    getActions()?.addPassageNode?.({
      bookSlug,
      chapter,
      startVerse: first.verse,
      endVerse: last.verse,
      reference,
      version_id: versionId,
      verses: selectedVerses.map((v) => ({
        verseId: v.apiId,
        reference: `${bookName} ${chapter}:${v.verse}`,
        verse: v.verse,
        text: v.text,
      })),
    })
    clearSelection()
  }, [canEdit, selectedVerses, bookSlug, bookName, chapter, versionId, clearSelection])

  const handleRowClick = useCallback(
    (verse: BiblePreviewVerse, e: React.MouseEvent) => {
      if (e.shiftKey) extendTo(verse.id)
      else if (e.metaKey || e.ctrlKey) toggleVerse(verse.id)
      else selectOnly(verse.id)
      listRef.current?.focus({ preventScroll: true })
    },
    [extendTo, toggleVerse, selectOnly],
  )

  // --- Dragging ------------------------------------------------------------
  const ghostRef = useRef<HTMLElement | null>(null)

  const handleDragStart = useCallback(
    (verse: BiblePreviewVerse, e: React.DragEvent) => {
      if (!canEdit) {
        e.preventDefault()
        return
      }
      // Dragging a selected verse drags the whole selection; dragging an
      // unselected one makes it the selection first, so what you drag is
      // always what you see highlighted.
      const dragging = selectedIds.has(verse.id) && selectedVerses.length > 0 ? selectedVerses : [verse]
      if (!selectedIds.has(verse.id)) selectOnly(verse.id)

      setVerseDrag(e.dataTransfer, {
        bookSlug: bookSlug ?? '',
        bookName,
        chapter,
        items: dragging.map(toDragItem),
      })

      if (dragging.length > 1) {
        const ghost = document.createElement('div')
        ghost.textContent = t('study.bible.selectedCount', { count: dragging.length })
        ghost.className =
          'fixed -left-[999px] top-0 px-2.5 py-1.5 rounded-md bg-accent text-bg-primary text-xs font-medium shadow-lg'
        document.body.appendChild(ghost)
        ghostRef.current = ghost
        e.dataTransfer.setDragImage(ghost, 12, 12)
      }
    },
    [canEdit, selectedIds, selectedVerses, selectOnly, bookSlug, bookName, chapter, toDragItem, t],
  )

  const handleDragEnd = useCallback(() => {
    endVerseDrag()
    if (ghostRef.current) {
      ghostRef.current.remove()
      ghostRef.current = null
    }
  }, [])

  // --- Navigation ----------------------------------------------------------
  const goTo = useCallback(
    (slug: string, ch: number, verse?: number) => {
      setPickerOpen(false)
      setQuery('')
      loadChapter(slug, ch, { verse })
      requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }))
    },
    [loadChapter],
  )

  const activateSearchItem = useCallback(
    (item: BibleSearchItem) => {
      if (item.kind === 'goto') goTo(item.slug, item.chapter, item.verse ?? undefined)
      else if (item.kind === 'book') goTo(item.slug, 1)
      else goTo(item.result.slug, item.result.chapter, item.result.verse)
    },
    [goTo],
  )

  // --- Keyboard: verse list ------------------------------------------------
  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const handled = new Set([
        'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', ' ', 'Enter', 'Escape',
      ])
      // React Flow and the draw tool listen on document/window; anything the
      // list consumes must not also pan the canvas or delete a node.
      if (handled.has(e.key) || (mod && (e.key === 'a' || e.key === 'A'))) e.stopPropagation()

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveFocus(1, e.shiftKey)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveFocus(-1, e.shiftKey)
      } else if (e.key === 'Home') {
        e.preventDefault()
        moveFocus(-verses.length, e.shiftKey)
      } else if (e.key === 'End') {
        e.preventDefault()
        moveFocus(verses.length, e.shiftKey)
      } else if (e.key === 'ArrowRight' && !mod) {
        e.preventDefault()
        stepChapter(1)
      } else if (e.key === 'ArrowLeft' && !mod) {
        e.preventDefault()
        stepChapter(-1)
      } else if (e.key === ' ') {
        e.preventDefault()
        if (focusedId) toggleVerse(focusedId)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const target = selectedVerses.length > 0
          ? selectedVerses
          : verses.filter((v) => v.id === focusedId)
        insertVerses(target)
      } else if (mod && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        selectAllInChapter()
      } else if (e.key === 'Escape') {
        if (selectedIds.size > 0) {
          e.preventDefault()
          clearSelection()
        }
      }
    },
    [
      moveFocus, verses, stepChapter, focusedId, toggleVerse, selectedVerses,
      insertVerses, selectAllInChapter, selectedIds, clearSelection,
    ],
  )

  // --- Keyboard: search ----------------------------------------------------
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSearchIdx((i) => Math.min(i + 1, Math.max(searchItems.length - 1, 0)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSearchIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const item = searchItems[searchIdx]
        if (item) {
          e.preventDefault()
          activateSearchItem(item)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (query) {
          setQuery('')
        } else {
          listRef.current?.focus({ preventScroll: true })
        }
      }
    },
    [searchItems, searchIdx, activateSearchItem, query],
  )

  const totalChapters = chapters || 1
  const referenceLabel = bookName ? `${bookName} ${chapter}` : t('study.bible.selectBook')

  // --- Sub-views -----------------------------------------------------------
  const header = (
    <div className="h-11 shrink-0 flex items-center gap-1 px-2 border-b border-border">
      <button
        onClick={() => setPickerOpen((v) => !v)}
        aria-expanded={pickerOpen}
        className={cn(
          'min-w-0 flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium transition-colors',
          pickerOpen ? 'bg-bg-tertiary text-text-primary' : 'text-text-primary hover:bg-bg-tertiary',
        )}
      >
        <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
        <span className="truncate">{referenceLabel}</span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 text-text-muted transition-transform', pickerOpen && 'rotate-180')} />
      </button>

      <div className="flex-1" />

      <button
        onClick={() => stepChapter(-1)}
        disabled={!bookSlug}
        title={t('study.bible.prevChapter')}
        aria-label={t('study.bible.prevChapter')}
        className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 md:h-7 md:w-7"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-2xs text-text-muted tabular-nums min-w-[2.5rem] text-center">
        {chapter}/{totalChapters}
      </span>
      <button
        onClick={() => stepChapter(1)}
        disabled={!bookSlug}
        title={t('study.bible.nextChapter')}
        aria-label={t('study.bible.nextChapter')}
        className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30 md:h-7 md:w-7"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        onClick={onClose}
        aria-label={t('common.close')}
        className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary md:h-7 md:w-7"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )

  const searchBar = (
    <div className="shrink-0 px-2 py-2 border-b border-border">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
        <input
          ref={searchRef}
          data-bible-search
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('study.bible.searchPlaceholder')}
          aria-label={t('study.bible.searchPlaceholder')}
          className="w-full pl-8 pr-7 py-1.5 bg-bg-primary border border-border rounded-md text-xs text-text-primary outline-none focus:border-accent/50 placeholder:text-text-muted"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); searchRef.current?.focus() }}
            aria-label={t('common.close')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-primary"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )

  const searchResults = (
    <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
      {!searchActive && (
        <p className="text-2xs text-text-muted text-center py-6">
          {t('study.bible.typeMore', { min: minQuery })}
        </p>
      )}
      {searchActive && searchItems.length === 0 && !searching && (
        <p className="text-2xs text-text-muted text-center py-6">{t('study.bible.noResults')}</p>
      )}
      {searchItems.map((item, i) => {
        const active = i === searchIdx
        const base = cn(
          'w-full text-left px-2.5 py-2 rounded-md transition-colors',
          active ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
        )

        if (item.kind === 'goto' || item.kind === 'book') {
          const label =
            item.kind === 'goto'
              ? `${item.bookName} ${item.chapter}${item.verse != null ? `:${item.verse}` : ''}`
              : item.bookName
          return (
            <button key={item.key} onClick={() => activateSearchItem(item)} onMouseEnter={() => setSearchIdx(i)} className={cn(base, 'flex items-center gap-2')}>
              <CornerDownLeft className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium text-text-primary truncate">{label}</span>
              <span className="ml-auto text-2xs text-text-muted shrink-0">{t('study.bible.goTo')}</span>
            </button>
          )
        }

        const r = item.result
        return (
          <button key={item.key} onClick={() => activateSearchItem(item)} onMouseEnter={() => setSearchIdx(i)} className={cn(base, 'flex flex-col gap-0.5')}>
            <span className="text-2xs font-medium text-accent">
              {r.book} {r.chapter}:{r.verse}
            </span>
            <span className="text-xs text-text-muted line-clamp-2 leading-snug">{r.text}</span>
          </button>
        )
      })}
      {searching && (
        <p className="text-2xs text-text-muted text-center py-3">{t('study.bible.searching')}</p>
      )}
    </div>
  )

  const verseList = (
    <div
      ref={listRef}
      // Marks the list as a keyboard surface: global single-key study shortcuts
      // (n, b, a, v…) stand down while the cursor lives in here.
      data-keyboard-input
      tabIndex={0}
      role="listbox"
      aria-multiselectable="true"
      aria-label={referenceLabel}
      onKeyDown={handleListKeyDown}
      onFocus={() => setListFocused(true)}
      onBlur={() => setListFocused(false)}
      className="flex-1 min-h-0 overflow-y-auto py-1 outline-none"
    >
      {loading && verses.length === 0 && (
        <div className="px-3 py-2 space-y-2" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-bg-tertiary animate-pulse" style={{ width: `${70 + ((i * 7) % 25)}%` }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
          <AlertCircle className="w-4 h-4 text-text-muted" aria-hidden="true" />
          <p className="text-2xs text-text-muted">{t('study.bible.loadError')}</p>
          <button
            onClick={() => bookSlug && loadChapter(bookSlug, chapter, { keepSelection: true })}
            className="text-2xs text-accent hover:underline"
          >
            {t('study.bible.retry')}
          </button>
        </div>
      )}

      {!loading && !error && verses.length === 0 && (
        <p className="text-2xs text-text-muted text-center py-8">{t('study.bible.selectToBegin')}</p>
      )}

      {verses.map((v, i) => {
        const selected = selectedIds.has(v.id)
        return (
          <VerseRow
            key={v.id}
            verse={v}
            selected={selected}
            selectionMode={selectedIds.size > 0}
            showCursor={listFocused && focusedId === v.id}
            runStart={selected && !selectedIds.has(verses[i - 1]?.id ?? '')}
            runEnd={selected && !selectedIds.has(verses[i + 1]?.id ?? '')}
            draggable={canEdit && !isMobile}
            onSelect={(e) => handleRowClick(v, e)}
            onToggle={() => toggleVerse(v.id)}
            onQuickAdd={() => insertVerses([v])}
            onDragStart={(e) => handleDragStart(v, e)}
            onDragEnd={handleDragEnd}
          />
        )
      })}
    </div>
  )

  const footer = selectedIds.size > 0 && canEdit ? (
    <div className="shrink-0 border-t border-border">
      {/* What is selected, spelled out — the count alone doesn't tell you
          whether you grabbed the range you meant to. */}
      <div className="flex items-center gap-2 px-2.5 pt-2 pb-1.5">
        <span className="flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded bg-accent/15 border border-accent/25">
          <Check className="w-3 h-3 text-accent shrink-0" strokeWidth={3} aria-hidden="true" />
          <span className="text-2xs font-medium text-accent truncate">{selectionLabel}</span>
        </span>
        <span className="text-2xs text-text-muted shrink-0">
          {t('study.bible.selectedCount', { count: selectedIds.size })}
        </span>
        <button
          onClick={clearSelection}
          className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-2xs text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          {t('study.bible.clear')}
        </button>
      </div>
      <div className="flex items-center gap-1.5 px-2 pb-2">
        <button
          onClick={() => insertVerses(selectedVerses)}
          className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-accent text-bg-primary text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <ListPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{t('study.bible.addSelected', { count: selectedIds.size })}</span>
        </button>
        {selectedIds.size > 1 && (
          <button
            onClick={insertAsPassage}
            title={t('study.bible.addAsPassage')}
            aria-label={t('study.bible.addAsPassage')}
            className="w-8 h-7 flex items-center justify-center rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="shrink-0 border-t border-border px-3 py-1.5 flex items-center gap-2">
      <p className="text-2xs text-text-muted truncate">
        {canEdit
          ? (isMobile ? t('study.bible.hintTap') : t('study.bible.hintDrag'))
          : t('study.bible.guestNote')}
      </p>
      {canEdit && verses.length > 0 && (
        <button
          onClick={selectAllInChapter}
          className="ml-auto shrink-0 text-2xs text-text-muted hover:text-accent transition-colors"
        >
          {t('study.bible.selectAll')}
        </button>
      )}
    </div>
  )

  const body = (
    <div className="flex-1 min-h-0 flex flex-col">
      {header}
      {searchBar}
      {pickerOpen ? (
        <BookChapterPicker
          books={books}
          currentSlug={bookSlug}
          currentChapter={chapter}
          onPick={(slug, ch) => goTo(slug, ch)}
          onClose={() => setPickerOpen(false)}
        />
      ) : searchMode ? (
        searchResults
      ) : (
        <>
          {verseList}
          {footer}
        </>
      )}
    </div>
  )

  if (isMobile) {
    if (!open) return null
    return (
      <div className="absolute inset-0 z-20 md:hidden">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute inset-x-0 bottom-0 top-10 bg-bg-secondary rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="w-8 h-1 bg-border mx-auto my-2 rounded-full shrink-0" />
          {body}
        </div>
      </div>
    )
  }

  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'absolute inset-y-0 left-0 z-20 bg-bg-secondary border-r border-border flex flex-col',
        'transition-all duration-300 ease-in-out',
        open ? 'w-panel opacity-100' : 'w-0 opacity-0 border-0 pointer-events-none',
      )}
    >
      <div className="w-panel h-full flex flex-col shrink-0">{open && body}</div>
    </aside>
  )
}
