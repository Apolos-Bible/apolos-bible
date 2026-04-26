
import { useEffect, useState } from 'react'
import { useVerseStore } from '@/lib/store/useVerseStore'
import type { Verse } from '@/lib/store/useVerseStore'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { usePresenceStore } from '@/lib/store/usePresenceStore'
import { useActivityStore } from '@/lib/store/useActivityStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { useCrossRefStore } from '@/lib/store/useCrossRefStore'
import { modKey } from '@/lib/platform'
import type { MenuItem } from '@/lib/store/useContextMenuStore'
import { BreadcrumbBar } from '@/components/layout/BreadcrumbBar'
import { ReadingToolbar } from '@/components/reading/ReadingToolbar'
import { Tooltip } from '@/components/ui/Tooltip'
import { VerseText } from '@/components/verse/VerseText'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'

// ── Icons ──────────────────────────────────────────────────────────────────

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <path d="M1 8V2a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

function IconNote() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h8v7H7l-1 1.5L5 9H2V2z" />
      <path d="M4 5h4M4 7h2" />
    </svg>
  )
}

function IconStar({ filled }: { filled?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <polygon points="6,1 7.2,4.3 10.8,4.5 8.0,6.6 8.9,10.0 6,8.1 3.1,10.0 4.0,6.6 1.2,4.5 4.8,4.3" />
    </svg>
  )
}

function IconXRef() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="7" cy="11" r="1.5" />
      <path d="M4.3 4.8C5 7 7 9.5 7 9.5M9.7 4.8C9 7 7 9.5 7 9.5" />
    </svg>
  )
}

function IconMore() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="12.5" cy="8" r="1.2" />
    </svg>
  )
}

function ColorDot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className={className}>
      <rect x="1" y="2"    width="12" height="1.4" rx="0.7" />
      <rect x="1" y="4.8"  width="12" height="1.4" rx="0.7" />
      <rect x="1" y="7.6"  width="12" height="1.4" rx="0.7" />
      <rect x="1" y="10.4" width="8"  height="1.4" rx="0.7" />
    </svg>
  )
}

function VerseIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className={className}>
      <rect x="1" y="1"    width="12" height="1.4" rx="0.7" />
      <rect x="1" y="2.8"  width="9"  height="1.4" rx="0.7" />
      <rect x="1" y="5.8"  width="12" height="1.4" rx="0.7" />
      <rect x="1" y="7.6"  width="7"  height="1.4" rx="0.7" />
      <rect x="1" y="10.6" width="12" height="1.4" rx="0.7" />
      <rect x="1" y="12.4" width="10" height="1.4" rx="0.7" />
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function VerseList() {
  const verses           = useVerseStore((s) => s.verses)
  const selectedVerseId  = useVerseStore((s) => s.selectedVerseId)
  const selectVerse      = useVerseStore((s) => s.selectVerse)
  const books            = useVerseStore((s) => s.books)
  const selectedBook     = useVerseStore((s) => s.selectedBook)
  const selectedChapter  = useVerseStore((s) => s.selectedChapter)
  const navigateChapter  = useVerseStore((s) => s.navigateChapter)
  const loadingVerses    = useVerseStore((s) => s.loadingVerses)

  const fontSize       = useUIStore((s) => s.fontSize)
  const readingMode    = useUIStore((s) => s.readingMode)
  const setReadingMode = useUIStore((s) => s.setReadingMode)
  const addToast       = useUIStore((s) => s.addToast)

  const notes      = useNoteStore((s) => s.notes)
  const highlights = useHighlightStore((s) => s.highlights)
  const addHighlight = useHighlightStore((s) => s.addHighlight)
  const loadHighlightsForChapter = useHighlightStore((s) => s.loadHighlightsForChapter)

  const bookmarkedIds  = useBookmarkStore((s) => s.bookmarkedIds)
  const toggleBookmark = useBookmarkStore((s) => s.toggle)
  const user           = useAuthStore((s) => s.user)

  const chapterId       = useVerseStore((s) => s.chapterId)
  const joinChapter     = usePresenceStore((s) => s.joinChapter)
  const leaveChapter    = usePresenceStore((s) => s.leaveChapter)
  const activityByVerse = useActivityStore((s) => s.activityByVerse)
  const friendIds       = useFriendStore((s) => s.friends.map((f) => f.id).join(','))

  const openMenu            = useContextMenuStore((s) => s.openMenu)
  const verseIdsWithRefs    = useCrossRefStore((s) => s.verseIdsWithRefs)
  const loadChapterRefs     = useCrossRefStore((s) => s.loadChapterRefs)
  const openCrossRefs       = useCrossRefStore((s) => s.openPanel)

  // Tracks which verse is currently playing the burst animation
  const [burstId, setBurstId] = useState<number | null>(null)

  useEffect(() => {
    if (verses.length) loadHighlightsForChapter(verses.map((v) => v.apiId))
  }, [verses])

  useEffect(() => {
    if (chapterId) loadChapterRefs(chapterId)
  }, [chapterId])

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
    fontSize === 'sm' ? 'text-sm' :
    fontSize === 'lg' ? 'text-lg' :
    'text-[15px]'

  // ── Context menu builder ─────────────────────────────────────────────────

  function buildVerseMenu(verse: Verse): MenuItem[] {
    const bookmarked   = bookmarkedIds.has(verse.apiId)
    const hasCrossRefs = verseIdsWithRefs.has(verse.apiId)

    const items: MenuItem[] = [
      {
        type: 'action',
        label: 'Copy verse text',
        icon: <IconCopy />,
        shortcut: `${modKey}C`,
        onClick: () => { navigator.clipboard.writeText(verse.text); addToast('Copied', 'success') },
      },
      {
        type: 'action',
        label: `Copy reference`,
        icon: <IconCopy />,
        onClick: () => {
          navigator.clipboard.writeText(`${bookName} ${verse.chapter}:${verse.verse} — ${verse.text}`)
          addToast(`Copied ${bookName} ${verse.chapter}:${verse.verse}`, 'success')
        },
      },
      { type: 'separator' },
      { type: 'label', text: 'Highlight verse' },
      {
        type: 'action', label: 'Yellow', icon: <ColorDot color="#e5c07b" />,
        onClick: () => addHighlight(verse.apiId, 0, verse.text.length, 'yellow').catch(() => addToast('Could not save highlight', 'error')),
      },
      {
        type: 'action', label: 'Blue', icon: <ColorDot color="#61afef" />,
        onClick: () => addHighlight(verse.apiId, 0, verse.text.length, 'blue').catch(() => addToast('Could not save highlight', 'error')),
      },
      {
        type: 'action', label: 'Green', icon: <ColorDot color="#98c379" />,
        onClick: () => addHighlight(verse.apiId, 0, verse.text.length, 'green').catch(() => addToast('Could not save highlight', 'error')),
      },
      { type: 'separator' },
      {
        type: 'action',
        label: 'Add note',
        icon: <IconNote />,
        onClick: () => selectVerse(verse.id),
      },
      ...(hasCrossRefs ? [{ type: 'separator' as const }, {
        type: 'action' as const,
        label: 'Cross-references',
        icon: <IconXRef />,
        onClick: () => openCrossRefs(verse.apiId),
      }] : []),
    ]

    if (user) {
      items.push({
        type: 'action',
        label: bookmarked ? 'Remove from favorites' : 'Add to favorites',
        icon: <IconStar filled={bookmarked} />,
        onClick: () => {
          toggleBookmark(verse.apiId)
          if (!bookmarked) {
            setBurstId(verse.apiId)
            setTimeout(() => setBurstId(null), 900)
          }
        },
      })
    }

    return items
  }

  function handleContextMenu(e: React.MouseEvent, verse: Verse) {
    e.preventDefault()
    e.stopPropagation()
    openMenu(e.clientX, e.clientY, buildVerseMenu(verse))
  }

  function openVerseMenuFromButton(target: HTMLElement, verse: Verse) {
    const rect = target.getBoundingClientRect()
    openMenu(rect.right - 12, rect.bottom + 8, buildVerseMenu(verse))
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
    <div className="bg-bg-secondary flex flex-col h-full md:h-screen relative">
      <BreadcrumbBar />

      {/* Floating chapter navigation */}
      <div className="pointer-events-none absolute inset-x-0 top-16 bottom-0 z-20 hidden md:flex items-center">
        <div className="w-full max-w-[684px] mx-auto flex justify-between px-0">
        <Tooltip label={bookIdx === 0 && selectedChapter === 1 ? '' : 'Previous chapter'} side="top">
          <button
            onClick={() => navigateChapter('prev')}
            disabled={prevDisabled}
            aria-label="Previous chapter"
            className={cn(
              'pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150',
              'bg-bg-tertiary/80 backdrop-blur-sm shadow-sm',
              prevDisabled
                ? 'opacity-0 pointer-events-none'
                : 'border-border-subtle text-accent/70 hover:text-accent hover:border-accent/40 hover:bg-bg-tertiary active:scale-95',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 2L3.5 6L7.5 10" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label={nextDisabled ? '' : 'Next chapter'} side="top">
          <button
            onClick={() => navigateChapter('next')}
            disabled={nextDisabled}
            aria-label="Next chapter"
            className={cn(
              'pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full border transition-all duration-150',
              'bg-bg-tertiary/80 backdrop-blur-sm shadow-sm',
              nextDisabled
                ? 'opacity-0 pointer-events-none'
                : 'border-border-subtle text-accent/70 hover:text-accent hover:border-accent/40 hover:bg-bg-tertiary active:scale-95',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 2L8.5 6L4.5 10" />
            </svg>
          </button>
        </Tooltip>
        </div>
      </div>

      {verses.length === 0 ? (
        <EmptyState message="No verses available for this chapter" />
      ) : (
        <div className="flex-1 overflow-y-auto relative">

          {/* Reading mode toggle + toolbar */}
          <div className="sticky top-0 z-10 border-b border-border-subtle/60 bg-bg-secondary/95 backdrop-blur-sm px-3 py-2 md:border-b-0 md:bg-transparent md:px-4 md:py-2 pointer-events-none">
            <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
              <div className="flex items-center gap-2 pointer-events-auto md:hidden">
                <button
                  onClick={() => navigateChapter('prev')}
                  disabled={prevDisabled}
                  aria-label="Previous chapter"
                  className={cn(
                    'h-9 min-w-9 rounded-md border px-2 text-xs transition-colors',
                    prevDisabled
                      ? 'opacity-40 border-border-subtle text-text-muted'
                      : 'border-border-subtle bg-bg-tertiary text-text-secondary',
                  )}
                >
                  Prev
                </button>
                <button
                  onClick={() => navigateChapter('next')}
                  disabled={nextDisabled}
                  aria-label="Next chapter"
                  className={cn(
                    'h-9 min-w-9 rounded-md border px-2 text-xs transition-colors',
                    nextDisabled
                      ? 'opacity-40 border-border-subtle text-text-muted'
                      : 'border-border-subtle bg-bg-tertiary text-text-secondary',
                  )}
                >
                  Next
                </button>
              </div>
              <div className="flex gap-2 items-center">
            <ReadingToolbar />
            <div className="flex gap-0.5 bg-bg-tertiary border border-border-subtle rounded-md p-0.5 pointer-events-auto shadow-sm">
              <Tooltip label="Verse mode" side="bottom">
                <button
                  onClick={() => setReadingMode('verse')}
                  className={cn(
                    'p-1.5 rounded transition-colors duration-100',
                    readingMode === 'verse' ? 'bg-bg-secondary text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  <VerseIcon />
                </button>
              </Tooltip>
              <Tooltip label="Flow mode" side="bottom">
                <button
                  onClick={() => setReadingMode('flow')}
                  className={cn(
                    'p-1.5 rounded transition-colors duration-100',
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

          <div className="max-w-[660px] mx-auto px-4 md:px-10 pt-4 pb-16">

            {/* Chapter heading */}
            <div className="mb-6 md:mb-8 text-center">
              <h1 className="font-reading text-xl md:text-2xl font-medium tracking-tight text-text-primary">{bookName}</h1>
              <p className="mt-1 text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-accent/70">
                Chapter {selectedChapter}
              </p>
              <div className="mt-4 mx-auto w-8 h-px bg-accent/30" />
            </div>

            {/* ── Flow mode ── */}
            {readingMode === 'flow' && (
              <p className={cn('font-reading leading-[2.2] md:leading-[2.6] tracking-wide text-text-primary select-text', textSizeClass)}>
                {verses.map((verse, i) => {
                  const isSelected      = verse.id === selectedVerseId
                  const verseHighlights = highlights[verse.apiId] ?? []
                  const hasActivity     = (notes[verse.apiId]?.length ?? 0) > 0 || verseHighlights.length > 0
                  const hasFriendActivity = (activityByVerse[verse.verse]?.length ?? 0) > 0
                  const isBursting      = burstId === verse.apiId
                  const isBookmarked    = bookmarkedIds.has(verse.apiId)
                  const hasCrossRefs    = verseIdsWithRefs.has(verse.apiId)

                  return (
                    <span
                      key={verse.id}
                      onClick={() => selectVerse(isSelected ? null : verse.id)}
                      onContextMenu={(e) => handleContextMenu(e, verse)}
                      className={cn(
                        'cursor-pointer rounded-[2px] transition-[background-color] duration-150',
                        '[box-decoration-break:clone] [-webkit-box-decoration-break:clone]',
                        isBursting ? 'verse-burst-flow' : '',
                        isSelected
                          ? 'bg-accent/[0.12]'
                          : isBookmarked && !isBursting
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
                    </span>
                  )
                })}
              </p>
            )}

            {/* ── Verse mode ── */}
            {readingMode === 'verse' && (
              <div className="space-y-4">
                {verses.map((verse) => {
                  const isSelected      = verse.id === selectedVerseId
                  const verseHighlights = highlights[verse.apiId] ?? []
                  const hasActivity     = (notes[verse.apiId]?.length ?? 0) > 0 || verseHighlights.length > 0
                  const hasFriendActivity = (activityByVerse[verse.verse]?.length ?? 0) > 0
                  const isBursting      = burstId === verse.apiId
                  const isBookmarked    = bookmarkedIds.has(verse.apiId)
                  const hasCrossRefs    = verseIdsWithRefs.has(verse.apiId)

                  return (
                    <div
                      key={verse.id}
                      onClick={() => selectVerse(isSelected ? null : verse.id)}
                      onContextMenu={(e) => handleContextMenu(e, verse)}
                      className={cn(
                        'group flex gap-3 cursor-pointer rounded-md px-2 py-2 md:py-1 -mx-2 transition-[background-color] duration-150',
                        isBursting ? 'verse-burst-block' : '',
                        isSelected ? 'bg-accent/[0.08]' : 'hover:bg-black/[0.03]',
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openVerseMenuFromButton(e.currentTarget, verse)
                        }}
                        className="md:hidden shrink-0 self-start mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
                        aria-label={`Open actions for verse ${verse.verse}`}
                      >
                        <IconMore />
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
