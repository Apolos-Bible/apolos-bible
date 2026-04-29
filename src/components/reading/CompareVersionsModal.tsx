import { useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompareStore } from '@/lib/store/useCompareStore'
import { cn } from '@/lib/cn'

export function CompareVersionsModal() {
  const { t } = useTranslation()
  const { open, results, targetVerseNumber, closeCompare } = useCompareStore()
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([])
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCompare() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeCompare])

  // Sync scroll across all columns
  const handleScroll = useCallback((sourceIdx: number) => {
    if (syncingRef.current) return
    const source = scrollRefs.current[sourceIdx]
    if (!source) return
    const ratio = source.scrollTop / (source.scrollHeight - source.clientHeight || 1)
    syncingRef.current = true
    scrollRefs.current.forEach((el, i) => {
      if (i === sourceIdx || !el) return
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
    })
    requestAnimationFrame(() => { syncingRef.current = false })
  }, [])

  // Scroll to target verse once data loads
  const allLoaded = results.length > 0 && results.every(r => !r.loading)
  useEffect(() => {
    if (!allLoaded || targetVerseNumber == null) return
    // Give the DOM a tick to render verse rows
    const id = setTimeout(() => {
      scrollRefs.current.forEach(el => {
        if (!el) return
        const target = el.querySelector<HTMLElement>(`[data-verse="${targetVerseNumber}"]`)
        target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    }, 50)
    return () => clearTimeout(id)
  }, [allLoaded, targetVerseNumber])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col"
      onClick={closeCompare}
    >
      <div
        className="flex flex-col flex-1 mt-4 md:mt-16 mb-0 md:mb-4 mx-0 md:mx-4 bg-bg-secondary rounded-none md:rounded-xl border border-border-subtle shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle shrink-0">
          <h2 className="text-sm font-medium text-text-primary">{t('compareVersions.title')}</h2>
          <button
            onClick={closeCompare}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label={t('common.close')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Columns */}
        <div className="flex-1 overflow-hidden flex overflow-x-auto divide-x divide-border-subtle snap-x snap-mandatory">
          {results.map(({ version, data, loading, error, notAvailable }, idx) => (
            <div key={version.id} className="flex flex-col overflow-hidden shrink-0 w-[86vw] md:w-72 snap-start">
              <div className="px-4 py-2 border-b border-border-subtle shrink-0 bg-bg-tertiary">
                <span className="text-xs font-semibold text-accent">{version.abbreviation}</span>
                <span className="text-2xs text-text-muted ml-1.5">{version.name}</span>
              </div>
              <div
                ref={el => { scrollRefs.current[idx] = el }}
                onScroll={() => handleScroll(idx)}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
              >
                {loading && (
                  <p className="text-xs text-text-muted animate-pulse">{t('common.loading')}</p>
                )}
                {error && (
                  <p className="text-xs text-red-400">{t('compareVersions.loadFailed')}</p>
                )}
                {notAvailable && (
                  <p className="text-xs text-text-muted italic">{t('compareVersions.notAvailable')}</p>
                )}
                {!loading && !error && !notAvailable && data && data.verses.map(verse => (
                  <div
                    key={verse.id}
                    data-verse={verse.number}
                    className={cn(
                      'flex gap-2 text-sm leading-relaxed rounded px-1 -mx-1 transition-colors',
                      verse.number === targetVerseNumber && 'bg-accent/10'
                    )}
                  >
                    <span className={cn(
                      'font-sans text-[10px] font-bold pt-[3px] shrink-0 w-5 text-right',
                      verse.number === targetVerseNumber ? 'text-accent' : 'text-accent/60'
                    )}>
                      {verse.number}
                    </span>
                    <p className="font-reading text-text-primary">{verse.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
