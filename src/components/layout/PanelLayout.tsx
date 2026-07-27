import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { useVerseActions } from '@/lib/verseActions'
import { KeyboardScope, useCommands } from '@/lib/keyboard'
import { MobileTopBar } from './MobileTopBar'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileSearchView } from './MobileSearchView'
import { BookSelector } from '@/components/sidebar/BookSelector'

interface PanelLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  panel: ReactNode | null
  leftPanel?: ReactNode
}

/**
 * The reader shell. It owns the `reader` keyboard scope, so every shortcut
 * registered by the reader and its panels is automatically inert on the
 * profile/settings routes — no pathname checks needed.
 */
export function PanelLayout(props: PanelLayoutProps) {
  return (
    <KeyboardScope scope="reader">
      <PanelLayoutSurface {...props} />
    </KeyboardScope>
  )
}

function PanelLayoutSurface({ sidebar, main, panel, leftPanel }: PanelLayoutProps) {
  const { t } = useTranslation()
  const studyVerseId = useVerseStore((s) => s.studyVerseId)
  const closeStudyPanel = useVerseStore((s) => s.closeStudyPanel)
  const commentaryOpen = useUIStore((s) => s.commentaryOpen)
  const toggleCommentary = useUIStore((s) => s.toggleCommentary)
  const mobileBookPickerOpen = useUIStore((s) => s.mobileBookPickerOpen)
  const openMobileBookPicker = useUIStore((s) => s.openMobileBookPicker)
  const closeMobileBookPicker = useUIStore((s) => s.closeMobileBookPicker)
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const readingMode = useUIStore((s) => s.readingMode)
  const setReadingMode = useUIStore((s) => s.setReadingMode)

  const closeMobileStudyPanel = () => {
    if (commentaryOpen) {
      toggleCommentary()
    }
    if (studyVerseId) {
      closeStudyPanel()
    }
  }

  const selectedVerseIds = useVerseStore((s) => s.selectedVerseIds)
  const selectVerse = useVerseStore((s) => s.selectVerse)
  const verses = useVerseStore((s) => s.verses)
  const openMenu = useContextMenuStore((s) => s.openMenu)
  const { buildMenu } = useVerseActions()

  // View + panel shortcuts. Verse-level ones live in VerseList, next to the
  // element they act on.
  useCommands({
    'reader.toggleReadingMode': () => setReadingMode(readingMode === 'verse' ? 'flow' : 'verse'),
    'reader.toggleCommentary': () => toggleCommentary(),
    'reader.panelFavorites': () => togglePanel('favorites'),
    'reader.panelNotes': () => togglePanel('my-notes'),
    'reader.panelFriends': () => togglePanel('friends'),
    'reader.panelChat': () => togglePanel('chat'),
    'reader.panelStudies': () => togglePanel('my-studies'),
    'reader.focusBooks': () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        openMobileBookPicker()
        return
      }
      const region = document.querySelector<HTMLElement>('[data-region="sidebar"]')
      const activeBook = region?.querySelector<HTMLElement>('[data-book-id][aria-expanded="true"]')
      ;(activeBook ?? region?.querySelector<HTMLElement>('[data-book-id]') ?? region)?.focus()
    },
  })

  const multiSelectedVerses = verses.filter((v) => selectedVerseIds.includes(v.id))

  return (
    <div className="app-viewport w-full overflow-hidden bg-bg-primary">
      <div className="md:hidden flex h-full flex-col">
        {mobileSearchOpen ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <MobileSearchView />
          </div>
        ) : leftPanel ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {leftPanel}
          </div>
        ) : (
          <>
        <MobileTopBar />

        <main
          className="min-h-0 flex-1 overflow-hidden relative"
          data-region="reader"
          aria-label={t('a11y.regionReader')}
          tabIndex={-1}
        >
          {main}

          {selectedVerseIds.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
              <div className="pointer-events-auto relative inline-flex h-12 px-4 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary shadow-lg gap-2">
                <span className="text-sm font-medium tabular-nums">{selectedVerseIds.length}</span>
                {selectedVerseIds.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      openMenu(rect.left + rect.width / 2, rect.top - 8, buildMenu(multiSelectedVerses))
                    }}
                    className="flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    aria-label={t('verse.openActions', { verse: selectedVerseIds.length })}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="3.5" cy="8" r="1.2" />
                      <circle cx="8" cy="8" r="1.2" />
                      <circle cx="12.5" cy="8" r="1.2" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => selectVerse(null)}
                  className="flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                  aria-label={t('verse.clear')}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </main>
          </>
        )}

        <MobileBottomNav />

        {/* Closed drawers stay mounted for the slide transition. `inert` is what
            actually keeps them out of the tab order — opacity-0 does not. */}
        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200 md:hidden',
            mobileBookPickerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
          inert={mobileBookPickerOpen ? undefined : ''}
          aria-hidden={!mobileBookPickerOpen}
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeMobileBookPicker} />
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 top-12 rounded-t-2xl bg-bg-secondary shadow-2xl flex flex-col transition-transform duration-300',
              mobileBookPickerOpen ? 'translate-y-0' : 'translate-y-full',
            )}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 shrink-0">
              <span className="text-sm font-medium text-text-primary">{t('layout.changeChapter')}</span>
              <button
                type="button"
                onClick={closeMobileBookPicker}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                aria-label={t('layout.closeChapterPicker')}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
              <BookSelector />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 z-30 transition-opacity duration-200 md:hidden',
            panel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
          inert={panel ? undefined : ''}
          aria-hidden={!panel}
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeMobileStudyPanel} />
          <div className="absolute inset-x-0 bottom-0 top-4 rounded-t-2xl bg-bg-secondary shadow-2xl">
            <div className="h-full overflow-hidden">
              {panel}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex h-full w-full overflow-hidden">
        <aside
          className="flex-shrink-0 w-sidebar h-full overflow-hidden"
          data-region="sidebar"
          aria-label={t('a11y.regionSidebar')}
          tabIndex={-1}
        >
          {sidebar}
        </aside>

        <aside
          className={cn(
            'flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out border-r border-border-subtle',
            leftPanel != null ? 'w-panel opacity-100' : 'w-0 opacity-0 border-0',
          )}
          data-region={leftPanel != null ? 'left-panel' : undefined}
          aria-label={t('a11y.regionLeftPanel')}
          tabIndex={leftPanel != null ? -1 : undefined}
          inert={leftPanel != null ? undefined : ''}
        >
          <div className="w-panel h-full">
            {leftPanel}
          </div>
        </aside>

        <main
          className="flex-1 min-w-0 h-full overflow-hidden"
          data-tour="reading"
          data-region="reader"
          aria-label={t('a11y.regionReader')}
          tabIndex={-1}
        >
          {main}
        </main>

        <aside
          className={cn(
            'flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out',
            panel !== null ? 'w-panel opacity-100' : 'w-0 opacity-0',
          )}
          data-region={panel !== null ? 'panel' : undefined}
          aria-label={t('a11y.regionPanel')}
          tabIndex={panel !== null ? -1 : undefined}
          inert={panel !== null ? undefined : ''}
        >
          <div className="w-panel h-full">
            {panel}
          </div>
        </aside>
      </div>
    </div>
  )
}
