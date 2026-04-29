import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useVerseStore } from '@/lib/store/useVerseStore'

export function CrossReferencesPanel() {
  const { t } = useTranslation()
  const { open, results, loading, closePanel } = useCrossRefStore()
  const selectBook    = useVerseStore(s => s.selectBook)
  const selectChapter = useVerseStore(s => s.selectChapter)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closePanel])

  if (!open) return null

  const navigate = (slug: string, chapter: number) => {
    selectBook(slug)
    selectChapter(chapter)
    closePanel()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-start md:justify-end"
      onClick={closePanel}
    >
      <div
        className="w-full md:w-96 bg-bg-secondary rounded-t-2xl md:rounded-xl border border-border-subtle shadow-2xl flex flex-col overflow-hidden mx-0 md:mr-4 md:mb-4 md:mt-16"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
          <h2 className="text-sm font-medium text-text-primary">{t('crossRef.title')}</h2>
          <button
            onClick={closePanel}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="text-xs text-text-muted text-center py-8 animate-pulse">{t('common.loading')}</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-xs text-text-muted text-center py-8">{t('crossRef.empty')}</p>
          )}
          {!loading && results.map(ref => (
            <button
              key={ref.id}
              onClick={() => navigate(ref.slug, ref.chapter)}
              className="w-full text-left px-4 py-3 border-b border-border-subtle hover:bg-bg-tertiary transition-colors group"
            >
              <p className="text-xs text-accent font-medium mb-1">
                {ref.book} {ref.chapter}:{ref.verse}
              </p>
              <p className="font-reading text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                {ref.text}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
