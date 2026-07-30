import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import type { ApiCrossRef, ApiSemanticResult } from '@/lib/bibleApi'

export function CrossReferencesPanel() {
  const { t } = useTranslation()
  const {
    open,
    tab,
    results,
    groups,
    loading,
    similarResults,
    similarLoading,
    similarError,
    primarySource,
    openPanel,
    openSimilar,
    closePanel,
  } = useActiveCrossRefStore()
  const currentVersionId = useActiveVerseStore((state) => state.versionId)
  const selectBook = useActiveVerseStore((state) => state.selectBook)
  const selectChapter = useActiveVerseStore((state) => state.selectChapter)
  const openVerse = useActiveVerseStore((state) => state.openVerse)

  if (!open) return null

  const source = primarySource ?? groups[0]?.source
  const sourceGroups = groups.length > 0 ? groups : source ? [{ source, results: [] }] : []

  const navigate = (slug: string, chapter: number, verse?: number) => {
    if (verse != null) {
      void openVerse(slug, chapter, verse)
    } else {
      selectBook(slug)
      selectChapter(chapter)
    }
    closePanel()
  }

  const selectTab = (next: 'cross' | 'similar') => {
    if (!source || next === tab) return
    if (next === 'cross') {
      void openPanel(sourceGroups.map((group) => group.source), currentVersionId)
    } else {
      void openSimilar(source, currentVersionId)
    }
  }

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-bg-secondary"
      data-region="verse-insights"
      aria-labelledby="verse-insights-title"
    >
      <header className="shrink-0 border-b border-border-subtle bg-bg-secondary px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 id="verse-insights-title" className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
            {tab === 'similar' ? t('toolbar.similarVerses') : t('crossRef.title')}
          </h2>
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" strokeWidth={1.7} aria-hidden />
          </button>
        </div>

        {source?.label && (
          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-text-muted">{source.label}</p>
        )}

        <div className="mt-3 flex gap-1 rounded-lg bg-bg-primary p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'cross'}
            onClick={() => selectTab('cross')}
            className={cn(
              'flex-1 rounded-md px-2 py-1.5 text-xs transition-colors',
              tab === 'cross' ? 'bg-bg-tertiary text-accent' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {t('crossRef.title')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'similar'}
            onClick={() => selectTab('similar')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
              tab === 'similar' ? 'bg-bg-tertiary text-accent' : 'text-text-muted hover:text-text-primary',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            {t('toolbar.similarVerses')}
          </button>
        </div>
      </header>

      {tab === 'cross' ? (
        <CrossReferenceResults
          results={results}
          groups={groups}
          loading={loading}
          onNavigate={navigate}
          emptyLabel={t('crossRef.empty')}
        />
      ) : (
        <SimilarResults
          results={similarResults}
          loading={similarLoading}
          error={similarError}
          errorLabel={t('crossRef.similarError')}
          emptyLabel={t('crossRef.similarEmpty')}
          onNavigate={navigate}
        />
      )}
    </div>
  )
}

function CrossReferenceResults({
  results,
  groups,
  loading,
  onNavigate,
  emptyLabel,
}: {
  results: ApiCrossRef[]
  groups: { source: { verseApiId: number; label: string }; results: ApiCrossRef[] }[]
  loading: boolean
  onNavigate: (slug: string, chapter: number, verse?: number) => void
  emptyLabel: string
}) {
  if (loading) return <LoadingState />
  if (groups.length <= 1) {
    if (results.length === 0) return <EmptyState label={emptyLabel} />
    return <div className="min-h-0 flex-1 overflow-y-auto">{results.map((ref) => <ReferenceRow key={ref.id} refItem={ref} onNavigate={onNavigate} />)}</div>
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {groups.map((group) => (
        <section key={group.source.verseApiId} className="border-b border-border-subtle">
          <h3 className="sticky top-0 z-10 border-b border-border-subtle bg-bg-primary px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {group.source.label}
          </h3>
          {group.results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-text-muted">{emptyLabel}</p>
          ) : group.results.map((ref) => (
            <ReferenceRow key={`${group.source.verseApiId}-${ref.id}`} refItem={ref} onNavigate={onNavigate} />
          ))}
        </section>
      ))}
    </div>
  )
}

function ReferenceRow({
  refItem,
  onNavigate,
}: {
  refItem: ApiCrossRef
  onNavigate: (slug: string, chapter: number, verse?: number) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(refItem.slug, refItem.chapter, refItem.verse)}
      className="group w-full border-b border-border-subtle px-4 py-3 text-left transition-colors hover:bg-bg-tertiary"
    >
      <p className="mb-1 text-xs font-medium text-accent">{refItem.book} {refItem.chapter}:{refItem.verse}</p>
      <p className="font-reading text-sm leading-relaxed text-text-secondary transition-colors group-hover:text-text-primary">{refItem.text}</p>
    </button>
  )
}

function SimilarResults({
  results,
  loading,
  error,
  errorLabel,
  emptyLabel,
  onNavigate,
}: {
  results: ApiSemanticResult[]
  loading: boolean
  error: boolean
  errorLabel: string
  emptyLabel: string
  onNavigate: (slug: string, chapter: number, verse?: number) => void
}) {
  if (loading) return <LoadingState />
  if (error) return <EmptyState label={errorLabel} />
  if (results.length === 0) return <EmptyState label={emptyLabel} />

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {results.map((result) => (
        <button
          type="button"
          key={result.verse_id}
          onClick={() => onNavigate(result.book_slug, result.chapter, result.verse)}
          className="group w-full border-b border-border-subtle px-4 py-3 text-left transition-colors hover:bg-bg-tertiary"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-accent">{result.book} {result.chapter}:{result.verse}</p>
            <span className="text-[10px] text-text-muted">{Math.round(result.score * 100)}%</span>
          </div>
          <p className="font-reading text-sm leading-relaxed text-text-secondary transition-colors group-hover:text-text-primary">{result.text}</p>
        </button>
      ))}
    </div>
  )
}

function LoadingState() {
  const { t } = useTranslation()
  return <p className="py-8 text-center text-xs text-text-muted animate-pulse">{t('crossRef.loading')}</p>
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-8 text-center text-xs text-text-muted">{label}</p>
}
