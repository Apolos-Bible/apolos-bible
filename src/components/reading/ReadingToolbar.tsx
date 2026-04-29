import { useTranslation } from 'react-i18next'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useCompareStore } from '@/lib/store/useCompareStore'
import { useCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { Tooltip } from '@/components/ui/Tooltip'
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

function IconXRef() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="7" cy="11" r="1.5" />
      <path d="M4.3 4.8C5 7 7 9.5 7 9.5M9.7 4.8C9 7 7 9.5 7 9.5" />
    </svg>
  )
}

export function ReadingToolbar() {
  const versions        = useVerseStore(s => s.versions)
  const selectedBook    = useVerseStore(s => s.selectedBook)
  const selectedChapter = useVerseStore(s => s.selectedChapter)
  const loadVersions    = useVerseStore(s => s.loadVersions)
  const selectedVerseId = useVerseStore(s => s.selectedVerseId)
  const verses          = useVerseStore(s => s.verses)

  const openCompare      = useCompareStore(s => s.openCompare)
  const compareOpen      = useCompareStore(s => s.open)
  const openXRef         = useCrossRefStore(s => s.openPanel)
  const xrefOpen         = useCrossRefStore(s => s.open)
  const commentaryOpen   = useUIStore(s => s.commentaryOpen)
  const toggleCommentary = useUIStore(s => s.toggleCommentary)

  const { t } = useTranslation()
  const selectedVerse = verses.find(v => v.id === selectedVerseId) ?? null

  const handleCompare = async () => {
    let vers = versions
    if (!vers.length) {
      await loadVersions()
      vers = useVerseStore.getState().versions
    }
    openCompare(vers, selectedBook, selectedChapter, selectedVerse?.verse)
  }

  const handleXRef = () => {
    if (!selectedVerse) return
    openXRef(selectedVerse.apiId)
  }

  const btnClass = (active: boolean) => cn(
    'p-1.5 rounded transition-colors duration-100',
    active
      ? 'bg-bg-secondary text-accent shadow-sm'
      : 'text-text-muted hover:text-text-secondary',
  )

  return (
    <div className="flex gap-0.5 bg-bg-tertiary border border-border-subtle rounded-md p-0.5 pointer-events-auto shadow-sm">
      <Tooltip label={t('toolbar.commentary')} side="bottom">
        <button onClick={toggleCommentary} className={btnClass(commentaryOpen)}>
          <IconCommentary />
        </button>
      </Tooltip>
      <Tooltip label={t('toolbar.compareVersions')} side="bottom">
        <button onClick={handleCompare} className={btnClass(compareOpen)}>
          <IconCompare />
        </button>
      </Tooltip>
      <Tooltip label={selectedVerse ? t('toolbar.crossReferences') : t('toolbar.selectVerseFirst')} side="bottom">
        <button
          onClick={handleXRef}
          disabled={!selectedVerse}
          className={cn(btnClass(xrefOpen), !selectedVerse && 'opacity-40 cursor-not-allowed')}
        >
          <IconXRef />
        </button>
      </Tooltip>
    </div>
  )
}
