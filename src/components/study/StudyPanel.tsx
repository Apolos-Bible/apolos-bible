import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import type { MenuItem } from '@/lib/store/useContextMenuStore'
import { PanelHeader } from '@/components/layout/PanelHeader'
import { VerseText } from '@/components/verse/VerseText'
import { VerseReference } from '@/components/verse/VerseReference'
import NoteThread from '@/components/notes/NoteThread'
import NoteInput from '@/components/notes/NoteInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { isAuthError } from '@/lib/auth'
import { cn } from '@/lib/cn'
import type { HighlightColor } from '@/types'

function ColorDot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
}

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <path d="M1 8V2a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

export function StudyPanel() {
  const { t } = useTranslation()

  const studyVerseId    = useVerseStore((s) => s.studyVerseId)
  const selectedVerseIds = useVerseStore((s) => s.selectedVerseIds)
  const verses          = useVerseStore((s) => s.verses)
  const closeStudyPanel = useVerseStore((s) => s.closeStudyPanel)

  const highlights     = useHighlightStore((s) => s.highlights)
  const loadHighlights = useHighlightStore((s) => s.loadHighlights)
  const addHighlight   = useHighlightStore((s) => s.addHighlight)

  const addToast = useUIStore((s) => s.addToast)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const showOthersNotes = useUIStore((s) => s.showOthersNotes)
  const toggleShowOthersNotes = useUIStore((s) => s.toggleShowOthersNotes)
  const openMenu = useContextMenuStore((s) => s.openMenu)
  const user = useAuthStore((s) => s.user)

  const verse = verses.find((v) => v.id === studyVerseId) ?? null
  const selectedVerses = selectedVerseIds
    .map((id) => verses.find((v) => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v))
  const panelVerses = verse && selectedVerseIds.includes(verse.id) && selectedVerses.length > 1
    ? selectedVerses
    : verse
      ? [verse]
      : []
  const isGroup = panelVerses.length > 1
  const verseHighlights = verse ? (highlights[verse.apiId] ?? []) : []

  useEffect(() => {
    panelVerses.forEach((panelVerse) => loadHighlights(panelVerse.apiId))
  }, [panelVerses.map((panelVerse) => panelVerse.apiId).join(','), loadHighlights])

  const HIGHLIGHT_COLORS: { label: string; value: HighlightColor; hex: string }[] = [
    { label: t('study.colorYellow'), value: 'yellow', hex: '#e5c07b' },
    { label: t('study.colorBlue'),   value: 'blue',   hex: '#61afef' },
    { label: t('study.colorGreen'),  value: 'green',  hex: '#98c379' },
  ]

  function handleVerseTextContextMenu(e: React.MouseEvent) {
    if (!verse) return
    e.preventDefault()

    const items: MenuItem[] = []

    const requireLogin = () => {
      if (user) return false
      addToast(t('study.loginRequired'), 'error', {
        action: { label: t('auth.logIn'), onClick: openAuthModal },
      })
      openAuthModal()
      return true
    }

    items.push({
      type: 'action',
      label: t('study.copyVerseText'),
      icon: <IconCopy />,
      onClick: () => { navigator.clipboard.writeText(verse.text); addToast(t('toast.copied'), 'success') },
    })
    items.push({ type: 'separator' })
    items.push({ type: 'label', text: t('study.highlightEntireVerse') })
    for (const { label, value, hex } of HIGHLIGHT_COLORS) {
      items.push({
        type: 'action',
        label,
        icon: <ColorDot color={hex} />,
        onClick: () => {
          if (requireLogin()) return
          addHighlight(verse.apiId, 0, verse.text.length, value)
            .then(() => addToast(t('toast.highlightAdded'), 'success'))
            .catch((error) => {
              if (isAuthError(error)) {
                addToast(t('study.loginRequired'), 'error', {
                  action: { label: t('auth.logIn'), onClick: openAuthModal },
                })
                return
              }
              addToast(t('toast.highlightFailed'), 'error')
            })
        },
      })
    }

    openMenu(e.clientX, e.clientY, items)
  }

  return (
    <div className="w-full md:w-panel bg-bg-secondary border-l border-border-subtle h-full flex flex-col">
      {/* Header */}
      <PanelHeader
        title={
          verse
            ? isGroup
              ? t('study.selectedVersesTitle', { count: panelVerses.length })
              : `${verse.book.charAt(0).toUpperCase()}${verse.book.slice(1)} ${verse.chapter}:${verse.verse}`
            : t('study.title')
        }
        actions={
          verse ? (
            <button
              type="button"
              onClick={closeStudyPanel}
              aria-label={t('study.closePanel')}
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-100"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : undefined
        }
      />

      {/* Body */}
      {panelVerses.length === 0 ? (
        <EmptyState message={t('study.empty')} />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Verse text card */}
            <div
              className="bg-bg-tertiary rounded-lg mx-4 my-3 p-4"
              onContextMenu={isGroup ? undefined : handleVerseTextContextMenu}
            >
              {panelVerses.map((panelVerse) => (
                <div key={panelVerse.id} className={cn(isGroup && 'mb-3 last:mb-0')}>
                  {isGroup && (
                    <VerseReference
                      book={panelVerse.book}
                      chapter={panelVerse.chapter}
                      verse={panelVerse.verse}
                    />
                  )}
                  <VerseText text={panelVerse.text} highlights={highlights[panelVerse.apiId] ?? []} />
                </div>
              ))}
            </div>

            {/* Notes thread */}
            {isGroup ? (
              <p className="px-4 pb-3 text-xs text-text-muted">{t('study.groupNotesHint')}</p>
            ) : (
              <>
                <div className="px-4 py-2 flex items-center gap-2">
                  <span className="text-[11px] text-text-muted">{t('notes.showOthers')}</span>
                  <button
                    type="button"
                    onClick={toggleShowOthersNotes}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                      showOthersNotes ? 'bg-accent' : 'bg-bg-tertiary border-border-subtle',
                    )}
                    role="switch"
                    aria-checked={showOthersNotes}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-3.5 w-3.5 translate-y-0 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                        showOthersNotes ? 'translate-x-4' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>
                <NoteThread verseApiId={panelVerses[0].apiId} />
              </>
            )}
          </div>

          <NoteInput verseApiIds={panelVerses.map((panelVerse) => panelVerse.apiId)} />
        </div>
      )}
    </div>
  )
}
