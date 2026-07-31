import { useTranslation } from 'react-i18next'
import { comparableBibleVersions, preferredComparisonVersion } from '@/lib/bibleVersionOptions'
import { useActiveVerseStore, useVerseStoreApi } from '@/lib/store/useVerseStore'
import { useActiveCompareStore } from '@/lib/store/useCompareStore'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useActiveBiblePaneStore } from '@/lib/store/useBiblePaneStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { VerseActionsToolbar } from '@/components/reading/VerseActionsToolbar'
import { cn } from '@/lib/cn'

function IconCompare() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="5" height="10" rx="1" />
      <rect x="8" y="2" width="5" height="10" rx="1" />
    </svg>
  )
}

function IconCommentary() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="12" height="9" rx="1.5" />
      <path d="M4 4h6M4 6.5h4" />
      <path d="M4 10l-2 3 3-1.5" />
    </svg>
  )
}

interface ReadingToolbarProps {
  showCommentary?: boolean
  showVerseActions?: boolean
}

export function ReadingToolbar({ showCommentary = true, showVerseActions = true }: ReadingToolbarProps) {
  const versions        = useActiveVerseStore(s => s.versions)
  const verseStore       = useVerseStoreApi()
  const selectedBook    = useActiveVerseStore(s => s.selectedBook)
  const selectedChapter = useActiveVerseStore(s => s.selectedChapter)
  const loadVersions    = useActiveVerseStore(s => s.loadVersions)
  const closeStudyPanel = useActiveVerseStore(s => s.closeStudyPanel)
  const selectedVerseId = useActiveVerseStore(s => s.selectedVerseId)
  const selectedVerseIds = useActiveVerseStore(s => s.selectedVerseIds)
  const verses          = useActiveVerseStore(s => s.verses)

  const openCompare      = useActiveCompareStore(s => s.openCompare)
  const closeCompare     = useActiveCompareStore(s => s.closeCompare)
  const compareOpen      = useActiveCompareStore(s => s.open)
  const closeInsights    = useActiveCrossRefStore(s => s.closePanel)
  const commentaryOpen   = useActiveBiblePaneStore(s => s.commentaryOpen)
  const toggleCommentary = useActiveBiblePaneStore(s => s.toggleCommentary)
  const addToast         = useUIStore(s => s.addToast)

  const { t } = useTranslation()
  const selectedVerse = verses.find(v => v.id === selectedVerseId) ?? null
  const selectedVerses = selectedVerseIds
    .map((id) => verses.find((verse) => verse.id === id))
    .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse))
  const targetVerses = selectedVerses.length > 0
    ? selectedVerses
    : selectedVerse
      ? [selectedVerse]
      : []

  const handleCompare = async () => {
    if (compareOpen) {
      closeCompare()
      return
    }
    let vers = versions
    if (!vers.length) {
      await loadVersions()
      vers = verseStore.getState().versions
    }
    const currentVersionId = verseStore.getState().versionId
    const comparisonVersion = preferredComparisonVersion(comparableBibleVersions(vers, currentVersionId))
    if (!comparisonVersion) {
      addToast(t('compareVersions.noAlternatives'), 'info')
      return
    }
    closeInsights()
    closeStudyPanel()
    void openCompare(
      comparisonVersion,
      selectedBook,
      selectedChapter,
      targetVerses.map((verse) => verse.verse),
    )
  }

  const handleCommentary = () => {
    if (!commentaryOpen) closeInsights()
    toggleCommentary()
  }

  const btnClass = (active: boolean) => cn(
    'p-2.5 md:p-1.5 rounded transition-colors duration-100',
    active
      ? 'bg-bg-secondary text-accent shadow-sm'
      : 'text-text-muted hover:text-text-secondary',
  )

  return (
    <div className="flex min-w-0 max-w-full items-center gap-2 pointer-events-auto" data-tour="toolbar">
      <VerseActionsToolbar />
      <div className="flex shrink-0 gap-0.5 rounded-md border border-border-subtle bg-bg-tertiary p-0.5 shadow-sm">
        {showCommentary && (
        <Tooltip label={t('toolbar.commentary')} side="bottom">
          <button
            onClick={handleCommentary}
            aria-label={t('toolbar.commentary')}
            aria-pressed={commentaryOpen}
            className={btnClass(commentaryOpen)}
          >
            <IconCommentary />
          </button>
        </Tooltip>
        )}
        {showVerseActions && (
          <Tooltip label={t('toolbar.compareVersions')} side="bottom">
            <button
              onClick={handleCompare}
              aria-label={t('toolbar.compareVersions')}
              aria-pressed={compareOpen}
              className={btnClass(compareOpen)}
            >
              <IconCompare />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
