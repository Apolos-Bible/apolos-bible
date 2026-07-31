import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  GitBranch,
  Highlighter,
  Link2,
  MoreHorizontal,
  Share2,
  Sparkles,
  Star,
  StickyNote,
} from 'lucide-react'
import { isMac } from '@/lib/platform'
import { cn } from '@/lib/cn'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import { useVerseActions } from '@/lib/verseActions'
import { ActionTooltip } from '@/components/ui/ActionTooltip'
import { isRemoteVerseApiId } from '@/lib/youVersion'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'

function shortcut(key: string, modifier = false) {
  if (!modifier) return key
  return `${isMac ? 'Command' : 'Control'} + ${key}`
}

export function VerseActionsToolbar() {
  const { t } = useTranslation()
  const verses = useActiveVerseStore((state) => state.verses)
  const selectedVerseIds = useActiveVerseStore((state) => state.selectedVerseIds)
  const verseIdsWithRefs = useActiveCrossRefStore((state) => state.verseIdsWithRefs)
  const actions = useVerseActions()
  const openMenu = useContextMenuStore((state) => state.openMenu)

  const selectedVerses = useMemo(
    () => selectedVerseIds
      .map((id) => verses.find((verse) => verse.id === id))
      .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse)),
    [selectedVerseIds, verses],
  )

  if (selectedVerses.length === 0) return null

  const hasCrossReferences = selectedVerses.some((verse) => verseIdsWithRefs.has(verse.apiId))
  const hasSingleVerse = selectedVerses.length === 1
  const supportsLocalActions = selectedVerses.every((verse) => !isRemoteVerseApiId(verse.apiId))
  const list = selectedVerses

  const openOverflowMenu = (target: HTMLButtonElement) => {
    const rect = target.getBoundingClientRect()
    openMenu(
      Math.max(8, rect.right - 220),
      rect.bottom + 6,
      actions.buildMenu(list),
    )
  }

  const buttonClass = (disabled = false) => cn(
    'inline-flex shrink-0 items-center justify-center rounded-md p-2.5 md:p-1.5 transition-colors',
    disabled
      ? 'cursor-not-allowed text-text-muted/40'
      : 'text-text-muted hover:bg-bg-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
  )

  return (
    <div
      className="reader-selected-actions flex min-w-0 max-w-full shrink items-center gap-0.5 rounded-md border border-border-subtle bg-bg-tertiary p-0.5 shadow-sm"
      role="group"
      aria-label={t('toolbar.selectedVerseActions')}
      data-region="selected-verse-actions"
    >
      <ActionTooltip className="reader-action-compact" label={t('toolbar.copyVerses')} shortcut={shortcut('C', true)}>
        <button
          type="button"
          onClick={() => actions.copyText(list)}
          aria-label={t('toolbar.copyVerses')}
          className={buttonClass()}
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
        </button>
      </ActionTooltip>

      <ActionTooltip className="reader-action-secondary" label={t('toolbar.copyReference')} shortcut={shortcut('Shift + C', true)}>
        <button
          type="button"
          onClick={() => actions.copyReference(list)}
          aria-label={t('toolbar.copyReference')}
          className={buttonClass()}
        >
          <Link2 className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
        </button>
      </ActionTooltip>

      <ActionTooltip className="reader-action-secondary" label={t('toolbar.shareVerses')} shortcut={shortcut('Shift + S', true)}>
        <button
          type="button"
          onClick={() => actions.share(list)}
          aria-label={t('toolbar.shareVerses')}
          className={buttonClass()}
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
        </button>
      </ActionTooltip>

      {supportsLocalActions && (
        <>
          <ActionTooltip className="reader-action-primary" label={t('toolbar.addNote')} shortcut="N">
            <button
              type="button"
              onClick={() => actions.addNote(list)}
              aria-label={t('toolbar.addNote')}
              className={buttonClass()}
            >
              <StickyNote className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
          </ActionTooltip>

          <ActionTooltip className="reader-action-primary" label={t('toolbar.highlightVerses')} shortcut="H">
            <button
              type="button"
              onClick={() => actions.toggleHighlight(list)}
              aria-label={t('toolbar.highlightVerses')}
              className={buttonClass()}
            >
              <Highlighter className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
          </ActionTooltip>

          <ActionTooltip className="reader-action-compact" label={t('toolbar.toggleFavorite')} shortcut="F">
            <button
              type="button"
              onClick={() => actions.toggleFavorite(list)}
              aria-label={t('toolbar.toggleFavorite')}
              className={buttonClass()}
            >
              <Star className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
          </ActionTooltip>

          <span className="reader-action-secondary mx-0.5 h-5 w-px shrink-0 bg-border-subtle" aria-hidden />

          <ActionTooltip
            className="reader-action-secondary"
            label={hasCrossReferences ? t('toolbar.crossReferences') : t('toolbar.noCrossReferences')}
            shortcut="X"
          >
            <button
              type="button"
              onClick={() => hasCrossReferences && actions.openCrossRefs(list)}
              aria-label={hasCrossReferences ? t('toolbar.crossReferences') : t('toolbar.noCrossReferences')}
              aria-disabled={!hasCrossReferences}
              className={buttonClass(!hasCrossReferences)}
            >
              <GitBranch className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
          </ActionTooltip>

          <ActionTooltip
            className="reader-action-secondary"
            label={hasSingleVerse ? t('toolbar.similarVerses') : t('toolbar.similarRequiresOne')}
            shortcut="S"
          >
            <button
              type="button"
              onClick={() => hasSingleVerse && actions.openSimilar(list)}
              aria-label={hasSingleVerse ? t('toolbar.similarVerses') : t('toolbar.similarRequiresOne')}
              aria-disabled={!hasSingleVerse}
              className={buttonClass(!hasSingleVerse)}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
          </ActionTooltip>
        </>
      )}

      <ActionTooltip className="reader-action-more" label={t('toolbar.moreActions')}>
        <button
          type="button"
          onClick={(event) => openOverflowMenu(event.currentTarget)}
          aria-label={t('toolbar.moreActions')}
          aria-haspopup="menu"
          className={buttonClass()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
        </button>
      </ActionTooltip>
    </div>
  )
}
