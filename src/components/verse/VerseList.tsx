
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import type { Verse } from '@/lib/store/useVerseStore'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useActiveBiblePaneStore } from '@/lib/store/useBiblePaneStore'
import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { useActivityStore } from '@/lib/store/useActivityStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useActiveCompareStore } from '@/lib/store/useCompareStore'
import { useVerseActions, HIGHLIGHT_SWATCHES } from '@/lib/verseActions'
import { useCommands } from '@/lib/keyboard'
import { isFocusIdle } from '@/lib/keyboard/focus'
import { ReadingToolbar } from '@/components/reading/ReadingToolbar'
import { PresenceAvatars } from '@/components/realtime/PresenceAvatars'
import { Tooltip } from '@/components/ui/Tooltip'
import { VerseText } from '@/components/verse/VerseText'
import { useVersePointerSelection } from '@/components/verse/useVersePointerSelection'
import { EmptyState } from '@/components/ui/EmptyState'
import { SEOMeta } from '@/components/seo/SEOMeta'
import { cn } from '@/lib/cn'
import { isAuthError } from '@/lib/auth'

// ── Icons ──────────────────────────────────────────────────────────────────

function IconMore() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12.5" cy="8" r="1.2" />
    </svg>
  )
}

function HeartIcon({ size = 10, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12"
      fill={filled ? 'var(--fav)' : 'none'}
      stroke="var(--fav)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M6 10C6 10 1.5 7 1.5 4.5a2.5 2.5 0 0 1 4.5-1.8 2.5 2.5 0 0 1 4.5 1.8C10.5 7 6 10 6 10z" />
    </svg>
  )
}

// ── Reading mode toggle icons ──────────────────────────────────────────────

function FlowIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden="true">
      <rect x="1" y="2"    width="12" height="1.4" rx="0.7" />
      <rect x="1" y="4.8"  width="12" height="1.4" rx="0.7" />
      <rect x="1" y="7.6"  width="12" height="1.4" rx="0.7" />
      <rect x="1" y="10.4" width="8"  height="1.4" rx="0.7" />
    </svg>
  )
}

function VerseIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className={className} aria-hidden="true">
      <rect x="1" y="1"    width="12" height="1.4" rx="0.7" />
      <rect x="1" y="2.8"  width="9"  height="1.4" rx="0.7" />
      <rect x="1" y="5.8"  width="12" height="1.4" rx="0.7" />
      <rect x="1" y="7.6"  width="7"  height="1.4" rx="0.7" />
      <rect x="1" y="10.6" width="12" height="1.4" rx="0.7" />
      <rect x="1" y="12.4" width="10" height="1.4" rx="0.7" />
    </svg>
  )
}

function NoteIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M5 6h6M5 8.5h4" />
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function VerseList() {
  const { t }            = useTranslation()
  const verses           = useActiveVerseStore((s) => s.verses)
  const selectedVerseId   = useActiveVerseStore((s) => s.selectedVerseId)
  const selectedVerseIds  = useActiveVerseStore((s) => s.selectedVerseIds)
  const selectVerse       = useActiveVerseStore((s) => s.selectVerse)
  const openStudyPanel    = useActiveVerseStore((s) => s.openStudyPanel)
  const toggleVerseSelection = useActiveVerseStore((s) => s.toggleVerseSelection)
  const selectVerseRangeTo = useActiveVerseStore((s) => s.selectVerseRangeTo)
  const extendVerseSelection = useActiveVerseStore((s) => s.extendVerseSelection)
  const selectAllVerses  = useActiveVerseStore((s) => s.selectAllVerses)
  const navigateVerse    = useActiveVerseStore((s) => s.navigateVerse)
  const cursorVerseId    = useActiveVerseStore((s) => s.cursorVerseId)
  const setCursorVerse   = useActiveVerseStore((s) => s.setCursorVerse)
  const books            = useActiveVerseStore((s) => s.books)
  const selectedBook     = useActiveVerseStore((s) => s.selectedBook)
  const selectedChapter  = useActiveVerseStore((s) => s.selectedChapter)
  const navigateChapter  = useActiveVerseStore((s) => s.navigateChapter)
  const loadingVerses    = useActiveVerseStore((s) => s.loadingVerses)

  const fontSize       = useUIStore((s) => s.fontSize)
  const readingMode    = useActiveBiblePaneStore((s) => s.readingMode)
  const setReadingMode = useActiveBiblePaneStore((s) => s.setReadingMode)
  const addToast       = useUIStore((s) => s.addToast)
  const openAuthModal  = useUIStore((s) => s.openAuthModal)
  const mobileChromeCollapsed = useUIStore((s) => s.mobileChromeCollapsed)
  const setMobileChromeCollapsed = useUIStore((s) => s.setMobileChromeCollapsed)

  const notes      = useNoteStore((s) => s.notes)
  const notesLoading = useNoteStore((s) => s.loading)
  const loadNotes  = useNoteStore((s) => s.loadNotes)
  const highlights = useHighlightStore((s) => s.highlights)
  const loadHighlightsForChapter = useHighlightStore((s) => s.loadHighlightsForChapter)

  const bookmarkedIds  = useBookmarkStore((s) => s.bookmarkedIds)
  const toggleBookmark = useBookmarkStore((s) => s.toggle)
  const user           = useAuthStore((s) => s.user)

  const chapterId       = useActiveVerseStore((s) => s.chapterId)
  const joinChapter     = usePresenceStore((s) => s.joinChapter)
  const leaveChapter    = usePresenceStore((s) => s.leaveChapter)
  const others          = usePresenceStore((s) => s.others)
  const activityByVerse = useActivityStore((s) => s.activityByVerse)
  const friendIds       = useFriendStore((s) => s.friends.map((f) => f.id).join(','))

  const openMenu            = useContextMenuStore((s) => s.openMenu)
  const verseIdsWithRefs    = useActiveCrossRefStore((s) => s.verseIdsWithRefs)
  const loadChapterRefs     = useActiveCrossRefStore((s) => s.loadChapterRefs)
  const comparisonOpen      = useActiveCompareStore((s) => s.open)
  const comparedHoverVerse  = useActiveCompareStore((s) => s.hoveredVerseNumber)
  const setComparedHover    = useActiveCompareStore((s) => s.setHoveredVerse)

  const actions = useVerseActions()

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastScrollTop = useRef(0)
  const scrollAcc = useRef(0)
  const pointerSelection = useVersePointerSelection({
    scrollRef,
    selectVerse,
    selectVerseRangeTo,
    toggleVerseSelection,
  })

  /**
   * The roving-tabindex anchor. Same rule the verse commands use to pick their
   * target (see useVerseActions), so the row that looks focused is the row `n`,
   * `f` and `h` act on.
   */
  const tabbableVerseId = useMemo(() => {
    const stillHere = (id: string | null) => (id && verses.some((v) => v.id === id) ? id : null)
    return stillHere(selectedVerseId) ?? stillHere(cursorVerseId) ?? verses[0]?.id ?? null
  }, [cursorVerseId, selectedVerseId, verses])

  useEffect(() => {
    setMobileChromeCollapsed(false)
    lastScrollTop.current = 0
    scrollAcc.current = 0
  }, [selectedBook, selectedChapter, setMobileChromeCollapsed])

  const handleScroll = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) return
    const el = scrollRef.current
    if (!el) return
    const st = el.scrollTop
    const delta = st - lastScrollTop.current
    lastScrollTop.current = st

    const atTop = st <= 8
    // Wide near-bottom zone so chrome reappearing (which shifts layout)
    // doesn't immediately flip atBottom back to false and ping-pong.
    const nearBottom = st + el.clientHeight >= el.scrollHeight - 160

    if (atTop || nearBottom) {
      scrollAcc.current = 0
      if (mobileChromeCollapsed) setMobileChromeCollapsed(false)
      return
    }

    // Accumulate small deltas (touch scroll often fires <6px per event)
    // and reset when direction flips so a real reversal triggers quickly.
    if ((delta > 0 && scrollAcc.current < 0) || (delta < 0 && scrollAcc.current > 0)) {
      scrollAcc.current = 0
    }
    scrollAcc.current += delta

    const THRESHOLD = 24
    if (scrollAcc.current > THRESHOLD && !mobileChromeCollapsed) {
      setMobileChromeCollapsed(true)
      scrollAcc.current = 0
    } else if (scrollAcc.current < -THRESHOLD && mobileChromeCollapsed) {
      setMobileChromeCollapsed(false)
      scrollAcc.current = 0
    }
  }

  useEffect(() => {
    return () => setMobileChromeCollapsed(false)
  }, [setMobileChromeCollapsed])

  useEffect(() => {
    if (verses.length) loadHighlightsForChapter(verses.map((v) => v.apiId))
  }, [verses])

  useEffect(() => {
    if (!user || !verses.length) return
    const missingVerseIds = verses
      .map((verse) => verse.apiId)
      .filter((verseApiId) => notes[verseApiId] == null && !notesLoading[verseApiId])

    void Promise.all(missingVerseIds.map((verseApiId) => loadNotes(verseApiId)))
  }, [user?.id, verses, notes, notesLoading, loadNotes])

  useEffect(() => {
    if (chapterId) loadChapterRefs(chapterId)
  }, [chapterId])

  /**
   * The keyboard cursor. `selectedVerseId` is the model; this moves real DOM
   * focus to match it, which is what makes j/k reachable by screen readers and
   * what lets `.`/Menu open the actions menu on the right row.
   *
   * Focus only moves when it's idle or already inside the list, so it never
   * yanks the caret out of a note the user is writing.
   */
  useEffect(() => {
    if (!selectedVerseId) return
    const el = document.querySelector<HTMLElement>(`[data-verse-id="${selectedVerseId}"]`)
    if (!el) return

    const shouldFocus = isFocusIdle(scrollRef.current)
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      if (shouldFocus && document.activeElement !== el) el.focus({ preventScroll: true })
    })
  }, [selectedVerseId, verses.length, readingMode])

  useEffect(() => {
    const bookNumber = books.find((b) => b.slug === selectedBook)?.number
    if (!user || !bookNumber) return
    joinChapter(bookNumber, selectedChapter, String(user.id))
    return () => leaveChapter()
  }, [user?.id, books, selectedBook, selectedChapter, friendIds, joinChapter, leaveChapter])

  const bookName    = books.find((b) => b.slug === selectedBook)?.name ?? selectedBook
  const currentBook = books.find((b) => b.slug === selectedBook)
  const bookIdx     = books.findIndex((b) => b.slug === selectedBook)
  const prevDisabled = loadingVerses || (selectedChapter === 1 && bookIdx === 0)
  const nextDisabled = loadingVerses || (!!currentBook && selectedChapter === currentBook.chapters && bookIdx === books.length - 1)

  const textSizeClass =
    fontSize === 'sm' ? 'text-[13px] leading-[20px]' :
    fontSize === 'lg' ? 'text-[18px] leading-[26px]' :
    'text-[15px] leading-[22px]'

  // ── Menu plumbing ────────────────────────────────────────────────────────

  /** Menu targets: the multi-selection when the verse is part of it, else itself. */
  const menuVersesFor = useCallback(
    (verse: Verse): Verse[] =>
      selectedVerseIds.includes(verse.id) && selectedVerseIds.length > 1
        ? verses.filter((v) => selectedVerseIds.includes(v.id))
        : [verse],
    [selectedVerseIds, verses],
  )

  function handleContextMenu(e: React.MouseEvent, verse: Verse) {
    e.preventDefault()
    e.stopPropagation()
    const targets = menuVersesFor(verse)
    if (targets.length === 1) selectVerse(verse.id)
    openMenu(e.clientX, e.clientY, actions.buildMenu(targets))
  }

  function openVerseMenuFromButton(target: HTMLElement, verse: Verse) {
    const rect = target.getBoundingClientRect()
    openMenu(rect.right - 12, rect.bottom + 8, actions.buildMenu(menuVersesFor(verse)))
  }

  /** Anchor the menu on the focused row — the keyboard path to verse actions. */
  const openMenuAtCursor = useCallback(() => {
    const targets = actions.targetVerses
    if (targets.length === 0) return false

    const anchorId = selectedVerseId ?? targets[0].id
    const el = document.querySelector<HTMLElement>(`[data-verse-id="${anchorId}"]`)
    const rect = el?.getBoundingClientRect()
    const x = rect ? Math.min(rect.left + 24, window.innerWidth - 220) : window.innerWidth / 2
    const y = rect ? rect.bottom + 4 : window.innerHeight / 2

    openMenu(x, y, actions.buildMenu(targets))
  }, [actions, selectedVerseId, openMenu])

  // ── Keyboard commands ────────────────────────────────────────────────────

  const inSidebar = () =>
    (document.activeElement as HTMLElement | null)?.closest('[data-region="sidebar"]') != null

  /**
   * Runs a verse command against the current target, or explains why it can't.
   * A verse shortcut that silently does nothing is worse than one that says
   * there's nothing to act on.
   */
  const onTarget = (run: (targets: Verse[]) => void) => () => {
    const targets = actions.targetVerses
    if (targets.length === 0) {
      addToast(t('toolbar.selectVerseFirst'), 'info')
      return
    }
    run(targets)
  }

  useCommands({
    'reader.nextVerse': () => navigateVerse('next'),
    'reader.prevVerse': () => navigateVerse('prev'),
    'reader.nextChapter': () => (inSidebar() ? false : navigateChapter('next')),
    'reader.prevChapter': () => (inSidebar() ? false : navigateChapter('prev')),

    'reader.extendSelectionNext': () => extendVerseSelection('next'),
    'reader.extendSelectionPrev': () => extendVerseSelection('prev'),
    'reader.selectAll': () => selectAllVerses(),

    'reader.toggleSelection': () => {
      // Only when the row itself holds focus — otherwise Enter/Space belong to
      // whatever button is focused inside it.
      const active = document.activeElement as HTMLElement | null
      const verseId = active?.getAttribute?.('data-verse-id')
      if (!verseId) return false
      toggleVerseSelection(verseId)
    },
    'reader.clearSelection': () => {
      if (selectedVerseIds.length === 0) return false
      selectVerse(null)
    },

    'reader.openActions': () => openMenuAtCursor(),
    'reader.addNote': onTarget((targets) => actions.addNote(targets)),
    'reader.toggleHighlight': onTarget((targets) => actions.toggleHighlight(targets)),
    'reader.highlightColor': (e) => {
      const swatch = HIGHLIGHT_SWATCHES[Number(e.key) - 1]
      if (!swatch) return false
      onTarget((targets) => actions.highlight(targets, swatch.color))()
    },
    'reader.toggleFavorite': onTarget((targets) => actions.toggleFavorite(targets)),
    'reader.copyText': onTarget((targets) => actions.copyText(targets)),
    'reader.copyReference': onTarget((targets) => actions.copyReference(targets)),
    'reader.shareVerses': onTarget((targets) => actions.share(targets)),
    'reader.similarVerses': onTarget((targets) => actions.openSimilar(targets)),
    'reader.crossReferences': onTarget((targets) => {
      const withRefs = targets.filter((v) => verseIdsWithRefs.has(v.apiId))
      if (withRefs.length === 0) {
        addToast(t('toolbar.noCrossReferences'), 'info')
        return
      }
      actions.openCrossRefs(withRefs)
    }),
    'reader.compareVersions': onTarget((targets) => void actions.compareVersions(targets)),
  })

  function getMyNoteBodies(verseApiId: number): string[] {
    if (!user) return []

    return (notes[verseApiId] ?? [])
      .filter((note) => note.user?.id === user.id)
      .map((note) => note.body)
  }

  /**
   * Shared props that make a verse a real, focusable listbox option.
   *
   * The list is a single tab stop (roving tabindex): exactly one row is
   * tabbable and j/k move between them. The controls *inside* a row are
   * deliberately not tab stops — 40 verses would otherwise mean ~120 stops,
   * most of them on icons that are invisible until hover. They stay reachable
   * by keyboard through their own commands: `.` for the actions menu, `N` for
   * notes, `F` for favorite.
   */
  function verseOptionProps(verse: Verse, isSelected: boolean) {
    return {
      'data-verse-id': verse.id,
      'data-reader-verse': verse.verse,
      'data-selectable-verse-id': verse.id,
      role: 'option',
      'aria-selected': isSelected,
      tabIndex: verse.id === tabbableVerseId ? 0 : -1,
      // Standard list semantics: plain click replaces the selection, Cmd/Ctrl
      // adds or removes one verse, Shift takes everything back to the anchor.
      onMouseDown: (e: React.MouseEvent) => {
        // Stops the browser from painting a text selection across the range.
        if (e.shiftKey) e.preventDefault()
      },
      onClick: (e: React.MouseEvent) => {
        pointerSelection.onVerseClick(e, verse.id)
      },
      onFocus: () => {
        // Focus can arrive on pointer-down, before the matching click. Keep it
        // as a keyboard cursor only; selection is committed by onClick on both
        // the reader and comparison rows.
        setCursorVerse(verse.id)
      },
      onContextMenu: (e: React.MouseEvent) => handleContextMenu(e, verse),
      onMouseEnter: () => {
        if (comparisonOpen) setComparedHover(verse.verse)
      },
      onMouseLeave: () => {
        if (comparisonOpen) setComparedHover(null)
      },
    }
  }

  // ── Verse number pill ────────────────────────────────────────────────────

  function VerseNum({ n, isSelected, hasActivity, hasFriendActivity, hasCrossRefs }: {
    n: number
    isSelected: boolean
    hasActivity: boolean
    hasFriendActivity: boolean
    hasCrossRefs: boolean
  }) {
    return (
      <span className="relative inline-block">
        <span className={cn(
          'font-sans text-[9px] font-bold align-super leading-none select-none mr-[2px]',
          isSelected ? 'text-accent' : 'text-accent/60',
        )}>
          {n}
        </span>
        {hasCrossRefs && (
          <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 font-sans text-[7px] leading-none text-accent/40 select-none" aria-hidden="true">†</span>
        )}
        {hasActivity && (
          <span className="absolute -top-px -right-[1px] w-[4px] h-[4px] rounded-full bg-accent/50" aria-hidden="true" />
        )}
        {hasFriendActivity && (
          <span className="absolute -top-px -right-[6px] w-[4px] h-[4px] rounded-full bg-accent animate-pulse" aria-hidden="true" />
        )}
      </span>
    )
  }

  return (
    <div className="bg-bg-secondary flex h-full flex-col relative">
      <SEOMeta />
      {/* Floating chapter navigation */}
      <div className="workspace-reader-chapter-nav pointer-events-none absolute inset-x-0 top-16 bottom-0 z-20 hidden md:flex items-center">
        <div className="w-full max-w-[684px] mx-auto flex justify-between px-0">
        <Tooltip label={bookIdx === 0 && selectedChapter === 1 ? '' : t('verse.previousChapter')} side="top">
          <button
            onClick={() => navigateChapter('prev')}
            disabled={prevDisabled}
            aria-label={t('verse.previousChapter')}
            className={cn(
              'pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150',
              'bg-bg-tertiary shadow-sm',
              prevDisabled
                ? 'opacity-0 pointer-events-none'
                : 'border-border-subtle text-accent/70 hover:text-accent hover:border-accent/40 hover:bg-bg-tertiary active:scale-95',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7.5 2L3.5 6L7.5 10" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label={nextDisabled ? '' : t('verse.nextChapter')} side="top">
          <button
            onClick={() => navigateChapter('next')}
            disabled={nextDisabled}
            aria-label={t('verse.nextChapter')}
            className={cn(
              'pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150',
              'bg-bg-tertiary shadow-sm',
              nextDisabled
                ? 'opacity-0 pointer-events-none'
                : 'border-border-subtle text-accent/70 hover:text-accent hover:border-accent/40 hover:bg-bg-tertiary active:scale-95',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 2L8.5 6L4.5 10" />
            </svg>
          </button>
        </Tooltip>
        </div>
      </div>

      {verses.length === 0 ? (
        <EmptyState message={t('verse.empty')} />
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={pointerSelection.onPointerDown}
          onClick={pointerSelection.onBackgroundClick}
          className="flex-1 overflow-y-auto no-scrollbar relative"
          data-reader-scroll
        >

          {/* Mobile keeps navigation/display primary; study tools appear after selecting a verse. */}
          <div
            className={cn(
              'sticky top-0 z-10 bg-bg-secondary pointer-events-none transition-[transform,opacity,max-height] duration-300 ease-out origin-top md:!translate-y-0 md:!opacity-100 md:!max-h-[unset]',
              mobileChromeCollapsed && 'max-h-0 -translate-y-full opacity-0 overflow-hidden',
            )}
          >
            <div className="workspace-reader-toolbar flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-3 py-2 md:border-b-0 md:bg-transparent md:px-4 md:py-2">
              <div className="workspace-reader-presence hidden md:block pointer-events-auto">
                <PresenceAvatars users={others} />
              </div>
              <div className="flex gap-2 items-center ml-auto">
                <div className="workspace-reader-toolbar-wide hidden md:block">
                  <ReadingToolbar />
                </div>
                <div className="workspace-reader-toolbar-compact md:hidden">
                  <ReadingToolbar showVerseActions={false} />
                </div>
                <div
                  role="group"
                  aria-label={t('verse.readingModeGroup')}
                  className="flex gap-0.5 bg-bg-tertiary border border-border-subtle rounded-md p-0.5 md:p-0.5 pointer-events-auto shadow-sm"
                >
                  <Tooltip label={t('verse.verseMode')} side="bottom">
                    <button
                      onClick={() => setReadingMode('verse')}
                      aria-label={t('verse.verseMode')}
                      aria-pressed={readingMode === 'verse'}
                      className={cn(
                        'p-2.5 md:p-1.5 rounded transition-colors duration-100',
                        readingMode === 'verse' ? 'bg-bg-secondary text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary',
                      )}
                    >
                      <VerseIcon />
                    </button>
                  </Tooltip>
                  <Tooltip label={t('verse.flowMode')} side="bottom">
                    <button
                      onClick={() => setReadingMode('flow')}
                      aria-label={t('verse.flowMode')}
                      aria-pressed={readingMode === 'flow'}
                      className={cn(
                        'p-2.5 md:p-1.5 rounded transition-colors duration-100',
                        readingMode === 'flow' ? 'bg-bg-secondary text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary',
                      )}
                    >
                      <FlowIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          <div className="workspace-reader-content max-w-[660px] mx-auto px-4 md:px-10 pt-4 pb-16">

            {/* Chapter heading */}
            <div className="workspace-reader-heading mb-6 md:mb-8 text-center">
              <h1 className="workspace-reader-title font-reading text-xl md:text-2xl font-medium tracking-tight text-text-primary">{bookName}</h1>
              <p className="mt-1 text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent/70">
                {t('layout.chapter', { n: selectedChapter })}
              </p>
              <div className="mt-4 mx-auto w-8 h-px bg-accent/30" />
            </div>

            {/* ── Flow mode ── */}
            {readingMode === 'flow' && (
              <p
                role="listbox"
                aria-multiselectable="true"
                aria-label={t('a11y.verseList', { book: bookName, chapter: selectedChapter })}
                className={cn('font-reading leading-[2.2] md:leading-[2.6] tracking-wide text-text-primary select-none md:select-text', textSizeClass)}
              >
                {verses.map((verse, i) => {
                  const isSelected      = selectedVerseIds.includes(verse.id)
                  const verseHighlights = highlights[verse.apiId] ?? []
                  const hasActivity     = (notes[verse.apiId]?.length ?? 0) > 0 || verseHighlights.length > 0
                  const hasFriendActivity = (activityByVerse[verse.verse]?.length ?? 0) > 0
                  const isBookmarked    = bookmarkedIds.has(verse.apiId)
                  const hasCrossRefs    = verseIdsWithRefs.has(verse.apiId)
                  const myNoteBodies    = getMyNoteBodies(verse.apiId)

                  return (
                    <span
                      key={verse.id}
                      {...verseOptionProps(verse, isSelected)}
                      className={cn(
                        'cursor-pointer rounded-[2px] transition-[background-color] duration-150',
                        '[box-decoration-break:clone] [-webkit-box-decoration-break:clone]',
                        isSelected
                          ? 'bg-accent/[0.12]'
                          : comparedHoverVerse === verse.verse
                            ? 'bg-accent/[0.08]'
                          : isBookmarked
                            ? 'bg-[#e06c7520]'
                            : 'hover:bg-black/[0.04]',
                      )}
                    >
                      {i > 0 && ' '}
                      <VerseNum n={verse.verse} isSelected={isSelected} hasActivity={hasActivity} hasFriendActivity={hasFriendActivity} hasCrossRefs={hasCrossRefs} />
                      {isBookmarked && (
                        <span className="inline-block align-super mx-[2px]">
                          <HeartIcon size={7} />
                        </span>
                      )}
                      <VerseText inline text={verse.text} highlights={verseHighlights} />
                      {myNoteBodies.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectVerse(verse.id)
                            openStudyPanel(verse.id)
                          }}
                          tabIndex={-1}
                          className="inline-flex align-super mx-[2px] text-accent/70 hover:text-accent"
                          aria-label={t('verse.openNotes')}
                          title={t('verse.openNotes')}
                        >
                          <NoteIcon size={10} />
                        </button>
                      )}
                    </span>
                  )
                })}
              </p>
            )}

            {/* ── Verse mode ── */}
            {readingMode === 'verse' && (
              <div
                role="listbox"
                aria-multiselectable="true"
                aria-label={t('a11y.verseList', { book: bookName, chapter: selectedChapter })}
                className="space-y-4"
              >
                {verses.map((verse) => {
                  const isSelected      = selectedVerseIds.includes(verse.id)
                  const verseHighlights = highlights[verse.apiId] ?? []
                  const hasActivity     = (notes[verse.apiId]?.length ?? 0) > 0 || verseHighlights.length > 0
                  const hasFriendActivity = (activityByVerse[verse.verse]?.length ?? 0) > 0
                  const isBookmarked    = bookmarkedIds.has(verse.apiId)
                  const hasCrossRefs    = verseIdsWithRefs.has(verse.apiId)
                  const myNoteBodies    = getMyNoteBodies(verse.apiId)

                  return (
                    <div
                      key={verse.id}
                      {...verseOptionProps(verse, isSelected)}
                      className={cn(
                        'group flex gap-3 cursor-pointer rounded-md px-2 py-2 md:py-1 -mx-2 transition-all duration-150 border-l-2 border-l-transparent',
                        isSelected
                          ? 'bg-accent/[0.08] border-l-accent'
                          : comparedHoverVerse === verse.verse
                            ? 'bg-accent/[0.06] border-l-accent/40'
                            : 'hover:bg-black/[0.03]',
                      )}
                    >
                      <div className="relative shrink-0 w-6 flex items-start justify-end gap-[2px] pt-[3px]">
                        {hasCrossRefs && (
                          <span className="font-sans text-[9px] leading-none text-accent/40 select-none" aria-hidden="true">†</span>
                        )}
                        {isBookmarked && <HeartIcon size={7} />}
                        <span className={cn(
                          'font-sans text-[10px] font-bold leading-none select-none',
                          isSelected ? 'text-accent' : 'text-accent/50',
                        )}>
                          {verse.verse}
                        </span>
                        {hasActivity && (
                          <span className="absolute top-0 right-0 w-[4px] h-[4px] rounded-full bg-accent/50 translate-x-1 -translate-y-0.5" aria-hidden="true" />
                        )}
                        {hasFriendActivity && (
                          <span className="absolute top-0 right-[-9px] w-[4px] h-[4px] rounded-full bg-accent animate-pulse translate-x-1 -translate-y-0.5" aria-hidden="true" />
                        )}
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <VerseText
                          text={verse.text}
                          highlights={verseHighlights}
                          className={cn(
                            'font-reading leading-[1.85] md:leading-[1.95] text-text-primary',
                            isBookmarked && 'bg-[#e06c7520] rounded-sm',
                            textSizeClass,
                          )}
                        />
                      </div>
                      {myNoteBodies.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectVerse(verse.id)
                            openStudyPanel(verse.id)
                          }}
                          tabIndex={-1}
                          className="shrink-0 self-start mt-0.5 inline-flex h-9 w-9 md:h-6 md:w-6 items-center justify-center rounded-md text-accent/70 hover:text-accent hover:bg-bg-tertiary"
                          aria-label={t('verse.openNotes')}
                          title={t('verse.openNotes')}
                        >
                          <NoteIcon size={12} />
                        </button>
                      )}
                      {/* Desktop uses the row context menu (right click). Keep the
                          compact action affordance only where there is no context
                          menu gesture: mobile. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openVerseMenuFromButton(e.currentTarget, verse)
                        }}
                        className={cn(
                          'workspace-reader-action',
                          'shrink-0 self-start mt-0.5 flex h-10 w-10 items-center justify-center rounded-md md:hidden',
                          'text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-opacity',
                          selectedVerseIds.length > 1 && 'hidden',
                        )}
                        tabIndex={-1}
                        aria-label={t('verse.openActions', { verse: verse.verse })}
                      >
                        <IconMore />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (actions.requireLogin()) return
                          toggleBookmark(verse.apiId)
                            .catch((error) => {
                              if (isAuthError(error)) {
                                addToast(t('study.loginRequired'), 'error', {
                                  action: { label: t('auth.logIn'), onClick: openAuthModal },
                                })
                                return
                              }
                              addToast(t('toast.bookmarkFailed'), 'error')
                            })
                        }}
                        className={cn(
                          'workspace-reader-bookmark',
                          'hidden md:inline-flex shrink-0 self-start mt-0.5 h-8 w-8 items-center justify-center rounded-md transition-opacity',
                          'hover:bg-bg-tertiary',
                          isBookmarked
                            ? 'text-[var(--fav)] opacity-100'
                            : 'text-text-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:text-[var(--fav)]',
                        )}
                        tabIndex={-1}
                        aria-label={isBookmarked ? t('verse.removeFromFavorites') : t('verse.addToFavorites')}
                        aria-pressed={isBookmarked}
                        title={isBookmarked ? t('verse.removeFromFavorites') : t('verse.addToFavorites')}
                      >
                        <HeartIcon size={14} filled={isBookmarked} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
