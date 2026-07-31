import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Columns2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { preferredComparisonVersion } from '@/lib/bibleVersionOptions'
import { cn } from '@/lib/cn'
import { useActiveCompareStore } from '@/lib/store/useCompareStore'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import { Select } from '@/components/ui/Select'
import { useVersePointerSelection } from '@/components/verse/useVersePointerSelection'
import { isYouVersionVersion } from '@/lib/youVersion'

function proportionalScrollTop(source: HTMLElement, target: HTMLElement): number {
  const sourceRange = Math.max(0, source.scrollHeight - source.clientHeight)
  const targetRange = Math.max(0, target.scrollHeight - target.clientHeight)
  if (sourceRange === 0 || targetRange === 0) return 0
  return (source.scrollTop / sourceRange) * targetRange
}

function equivalentScrollTop(
  source: HTMLElement,
  target: HTMLElement,
  sourceVerseAttribute: 'data-reader-verse' | 'data-compare-verse',
  targetVerseAttribute: 'data-reader-verse' | 'data-compare-verse',
): number {
  const sourceRange = Math.max(0, source.scrollHeight - source.clientHeight)
  const targetRange = Math.max(0, target.scrollHeight - target.clientHeight)
  if (source.scrollTop <= 1) return 0
  if (sourceRange > 0 && source.scrollTop >= sourceRange - 1) return targetRange

  const sourceRect = source.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const visualAnchor = sourceRect.top + sourceRect.height * 0.35
  const sourceVerses = Array.from(
    source.querySelectorAll<HTMLElement>(`[${sourceVerseAttribute}]`),
  )
  let sourceVerse: HTMLElement | null = null
  let sourceVerseRect: DOMRect | null = null
  let closestDistance = Number.POSITIVE_INFINITY
  for (const element of sourceVerses) {
    const rect = element.getBoundingClientRect()
    if (rect.bottom < sourceRect.top || rect.top > sourceRect.bottom) continue
    const distance = Math.abs(rect.top - visualAnchor)
    if (distance >= closestDistance) continue
    sourceVerse = element
    sourceVerseRect = rect
    closestDistance = distance
  }
  const verseNumber = sourceVerse?.getAttribute(sourceVerseAttribute)
  const targetVerse = verseNumber
    ? target.querySelector<HTMLElement>(
        `[${targetVerseAttribute}="${verseNumber}"]`,
      )
    : null

  if (!sourceVerseRect || !targetVerse) return proportionalScrollTop(source, target)

  const sourceOffset = sourceVerseRect.top - sourceRect.top
  const targetOffset = targetVerse.getBoundingClientRect().top - targetRect.top
  return Math.min(
    targetRange,
    Math.max(0, target.scrollTop + targetOffset - sourceOffset),
  )
}

export function CompareVersionPanel() {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const syncFrameRef = useRef<number | null>(null)

  const versions = useActiveVerseStore((state) => state.versions)
  const currentVersionId = useActiveVerseStore((state) => state.versionId)
  const selectedBook = useActiveVerseStore((state) => state.selectedBook)
  const selectedChapter = useActiveVerseStore((state) => state.selectedChapter)
  const mainVerses = useActiveVerseStore((state) => state.verses)
  const selectedVerseId = useActiveVerseStore((state) => state.selectedVerseId)
  const selectedVerseIds = useActiveVerseStore((state) => state.selectedVerseIds)
  const selectVerse = useActiveVerseStore((state) => state.selectVerse)
  const selectVerseRangeTo = useActiveVerseStore((state) => state.selectVerseRangeTo)
  const toggleVerseSelection = useActiveVerseStore((state) => state.toggleVerseSelection)
  const {
    open,
    result,
    bookSlug,
    chapter,
    targetVerseNumbers,
    hoveredVerseNumber,
    openCompare,
    setHoveredVerse,
    closeCompare,
  } = useActiveCompareStore()

  const options = useMemo(
    () => versions.filter((version) => version.id !== currentVersionId),
    [currentVersionId, versions],
  )
  const mainVerseByNumber = useMemo(
    () => new Map(mainVerses.map((verse) => [verse.verse, verse])),
    [mainVerses],
  )
  const pointerSelection = useVersePointerSelection({
    scrollRef,
    selectVerse,
    selectVerseRangeTo,
    toggleVerseSelection,
  })
  const optionIds = options.map((version) => version.id).join(',')
  const selectedVerseNumbers = useMemo(
    () => new Set(
      mainVerses
        .filter(
          (verse) =>
            verse.id === selectedVerseId || selectedVerseIds.includes(verse.id),
        )
        .map((verse) => verse.verse),
    ),
    [mainVerses, selectedVerseId, selectedVerseIds],
  )

  const findReaderScroller = useCallback(() => {
    const panel = panelRef.current
    const layout = panel?.closest('.workspace-bible-context')
      ?? panel?.closest('.app-viewport')
    return layout?.querySelector<HTMLElement>('[data-reader-scroll]') ?? null
  }, [])

  useEffect(() => {
    if (!open) return
    const selectedStillAvailable = result
      && options.some((version) => version.id === result.version.id)
    const version = selectedStillAvailable ? result.version : preferredComparisonVersion(options)

    if (!version) {
      closeCompare()
      return
    }
    if (
      !selectedStillAvailable
      || bookSlug !== selectedBook
      || chapter !== selectedChapter
    ) {
      void openCompare(version, selectedBook, selectedChapter)
    }
  }, [
    bookSlug,
    chapter,
    closeCompare,
    open,
    openCompare,
    optionIds,
    options,
    result,
    selectedBook,
    selectedChapter,
  ])

  useEffect(() => {
    if (!open) return
    const reader = findReaderScroller()
    const comparison = scrollRef.current
    if (!reader || !comparison) return

    const sync = (
      source: HTMLElement,
      target: HTMLElement,
      sourceVerseAttribute: 'data-reader-verse' | 'data-compare-verse',
      targetVerseAttribute: 'data-reader-verse' | 'data-compare-verse',
    ) => {
      if (syncingRef.current) return
      syncingRef.current = true
      target.scrollTop = equivalentScrollTop(
        source,
        target,
        sourceVerseAttribute,
        targetVerseAttribute,
      )
      if (syncFrameRef.current !== null) cancelAnimationFrame(syncFrameRef.current)
      syncFrameRef.current = requestAnimationFrame(() => {
        syncingRef.current = false
        syncFrameRef.current = null
      })
    }
    const syncFromReader = () =>
      sync(reader, comparison, 'data-reader-verse', 'data-compare-verse')
    const syncFromComparison = () =>
      sync(comparison, reader, 'data-compare-verse', 'data-reader-verse')

    reader.addEventListener('scroll', syncFromReader, { passive: true })
    comparison.addEventListener('scroll', syncFromComparison, { passive: true })
    syncFromReader()

    return () => {
      reader.removeEventListener('scroll', syncFromReader)
      comparison.removeEventListener('scroll', syncFromComparison)
      if (syncFrameRef.current !== null) cancelAnimationFrame(syncFrameRef.current)
      syncFrameRef.current = null
      syncingRef.current = false
    }
  }, [findReaderScroller, open, result?.data])

  useEffect(() => {
    const firstTarget = targetVerseNumbers[0]
    if (!result?.data || firstTarget == null) return
    const frame = requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector<HTMLElement>(`[data-compare-verse="${firstTarget}"]`)
        ?.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [result?.data, targetVerseNumbers])

  if (!open || !result) return null

  return (
    <div
      ref={panelRef}
      className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-bg-secondary"
      data-region="compare-version"
    >
      <header className="shrink-0 border-b border-border-subtle bg-bg-secondary p-3">
        <div className="flex items-center gap-2">
          <Columns2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.7} aria-hidden />
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
            {t('compareVersions.title')}
          </h2>
          <button
            type="button"
            onClick={closeCompare}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" strokeWidth={1.7} aria-hidden />
          </button>
        </div>

        <Select
          value={result.version.id}
          onChange={(versionId) => {
            const version = options.find((item) => item.id === versionId)
            if (version) {
              void openCompare(
                version,
                selectedBook,
                selectedChapter,
                targetVerseNumbers,
              )
            }
          }}
          options={options.map((version) => ({
            value: version.id,
            label: `${version.abbreviation} — ${version.name}`,
          }))}
          ariaLabel={t('compareVersions.selectVersion')}
          className="mt-3"
          searchable
          searchPlaceholder={t('youVersion.searchVersion')}
          buttonClassName="h-9 rounded-lg bg-bg-primary text-xs"
        />
      </header>

      <div
        ref={scrollRef}
        onPointerDown={pointerSelection.onPointerDown}
        onClick={pointerSelection.onBackgroundClick}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-12 pt-5"
      >
        {result.loading && (
          <p className="text-xs text-text-muted animate-pulse">{t('common.loading')}</p>
        )}
        {result.error && (
          <p className="text-xs text-red-400">{t('compareVersions.loadFailed')}</p>
        )}
        {result.notAvailable && (
          <p className="text-xs italic text-text-muted">{t('compareVersions.notAvailable')}</p>
        )}
        {!result.loading && !result.error && !result.notAvailable && result.data && (
          <>
            <div className="mb-6 text-center">
              <h3 className="font-reading text-lg font-medium text-text-primary">
                {result.data.book.name}
              </h3>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/70">
                {t('layout.chapter', { n: result.data.chapter })}
              </p>
              <div className="mx-auto mt-4 h-px w-8 bg-accent/30" />
            </div>

            <div className="space-y-3">
              {result.data.verses.map((verse) => {
                const selected = selectedVerseNumbers.has(verse.number)
                const hovered = hoveredVerseNumber === verse.number
                const mainVerse = mainVerseByNumber.get(verse.number)
                return (
                  <button
                    key={verse.id}
                    type="button"
                    data-compare-verse={verse.number}
                    data-selectable-verse-id={mainVerse?.id}
                    aria-pressed={selected}
                    onClick={(event) => {
                      if (mainVerse) pointerSelection.onVerseClick(event, mainVerse.id)
                    }}
                    onMouseEnter={() => setHoveredVerse(verse.number)}
                    onMouseLeave={() => setHoveredVerse(null)}
                    onFocus={() => setHoveredVerse(verse.number)}
                    onBlur={() => setHoveredVerse(null)}
                    className={cn(
                      'flex w-full gap-2 rounded border-l-2 border-l-transparent px-1 py-1 text-left text-sm leading-relaxed outline-none transition-colors',
                      selected && 'border-l-accent bg-accent/10',
                      hovered && !selected && 'bg-accent/[0.06]',
                      'hover:bg-accent/[0.06] focus-visible:ring-2 focus-visible:ring-accent/40',
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 shrink-0 pt-[3px] text-right font-sans text-[10px] font-bold',
                        selected || hovered ? 'text-accent' : 'text-accent/60',
                      )}
                    >
                      {verse.number}
                    </span>
                    <p className="min-w-0 font-reading text-text-primary">{verse.text}</p>
                  </button>
                )
              })}
            </div>

            {isYouVersionVersion(result.version) && (
              <footer className="mt-8 border-t border-border-subtle pt-4 text-[10px] leading-relaxed text-text-muted">
                {result.version.copyright && <p>{result.version.copyright}</p>}
                {result.version.info && <p className="mt-2">{result.version.info}</p>}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {result.version.publisherUrl && (
                    <a
                      href={result.version.publisherUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent/80 hover:text-accent"
                    >
                      {t('youVersion.publisher')}
                    </a>
                  )}
                  {result.version.deepLink && (
                    <a
                      href={result.version.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent/80 hover:text-accent"
                    >
                      {t('youVersion.open')}
                    </a>
                  )}
                  <span>{t('youVersion.poweredBy')}</span>
                </div>
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  )
}
