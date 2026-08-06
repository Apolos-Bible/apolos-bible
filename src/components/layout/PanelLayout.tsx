import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useActiveBiblePaneStore } from '@/lib/store/useBiblePaneStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { useVerseActions } from '@/lib/verseActions'
import { useActiveCompareStore } from '@/lib/store/useCompareStore'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { KeyboardScope, useCommands } from '@/lib/keyboard'
import { MobileTopBar } from './MobileTopBar'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileSearchView } from './MobileSearchView'
import { MobileHubView } from './MobileHubView'
import { BookSelector } from '@/components/sidebar/BookSelector'
import { FloatingChatDock } from '@/components/chat/FloatingChatDock'
import { WorkspaceTabs } from './WorkspaceTabs'
import { DesktopSidebar } from './DesktopSidebar'
import { useWorkspacePane } from './WorkspacePaneContext'

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
  const pane = useWorkspacePane()
  return (
    <KeyboardScope scope="reader" enabled={pane?.isActive ?? true}>
      <PanelLayoutSurface {...props} />
    </KeyboardScope>
  )
}

function PanelLayoutSurface({ sidebar, main, panel, leftPanel }: PanelLayoutProps) {
  const { t } = useTranslation()
  const workspacePane = useWorkspacePane()
  const studyVerseId = useActiveVerseStore((s) => s.studyVerseId)
  const closeStudyPanel = useActiveVerseStore((s) => s.closeStudyPanel)
  const selectedBook = useActiveVerseStore((s) => s.selectedBook)
  const selectedChapter = useActiveVerseStore((s) => s.selectedChapter)
  const books = useActiveVerseStore((s) => s.books)
  const commentaryOpen = useActiveBiblePaneStore((s) => s.commentaryOpen)
  const toggleCommentary = useActiveBiblePaneStore((s) => s.toggleCommentary)
  const comparisonOpen = useActiveCompareStore((s) => s.open)
  const closeCompare = useActiveCompareStore((s) => s.closeCompare)
  const insightsOpen = useActiveCrossRefStore((s) => s.open)
  const closeInsights = useActiveCrossRefStore((s) => s.closePanel)
  const mobileBookPickerOpen = useUIStore((s) => s.mobileBookPickerOpen)
  const openMobileBookPicker = useUIStore((s) => s.openMobileBookPicker)
  const closeMobileBookPicker = useUIStore((s) => s.closeMobileBookPicker)
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
  const mobileHub = useUIStore((s) => s.mobileHub)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const readingMode = useActiveBiblePaneStore((s) => s.readingMode)
  const setReadingMode = useActiveBiblePaneStore((s) => s.setReadingMode)

  const closeMobileStudyPanel = () => {
    if (studyVerseId) {
      closeStudyPanel()
      return
    }
    if (comparisonOpen) {
      closeCompare()
      return
    }
    if (insightsOpen) {
      closeInsights()
      return
    }
    if (commentaryOpen) {
      toggleCommentary()
    }
  }

  const selectedVerseIds = useActiveVerseStore((s) => s.selectedVerseIds)
  const selectVerse = useActiveVerseStore((s) => s.selectVerse)
  const verses = useActiveVerseStore((s) => s.verses)
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
  const activeBook = books.find((book) => book.slug === selectedBook)
  const workspaceTitle = activeBook
    ? `${activeBook.name} ${selectedChapter}`
    : t('nav.bible')

  useEffect(() => {
    workspacePane?.reportTitle(workspaceTitle)
  }, [workspacePane, workspaceTitle])

  if (workspacePane) {
    return <EmbeddedBibleWorkspace main={main} panel={panel} />
  }

  return (
    <div className="app-viewport w-full overflow-hidden bg-bg-primary">
      <div className="md:hidden flex h-full flex-col">
        {mobileSearchOpen ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <MobileSearchView />
          </div>
        ) : mobileHub ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <MobileHubView />
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
          data-tour="reading"
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
              'safe-area-fixed fixed inset-0 z-40 transition-opacity duration-200 md:hidden',
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
        <DesktopSidebar>
          {sidebar}
        </DesktopSidebar>

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
          className="flex min-w-0 flex-1 flex-col h-full overflow-hidden"
          data-tour="reading"
          data-region="reader"
          aria-label={t('a11y.regionReader')}
          tabIndex={-1}
        >
          <WorkspaceTabs title={workspaceTitle} />
          <div className="min-h-0 flex-1 overflow-hidden">
            {main}
          </div>
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

      <FloatingChatDock rightPanelOpen={panel !== null} />
    </div>
  )
}

const BIBLE_CONTEXT_WIDTH_KEY = 'apolos_bible_context_width'

function storedBibleContextWidth(): number {
  const value = Number(localStorage.getItem(BIBLE_CONTEXT_WIDTH_KEY))
  return Number.isFinite(value) ? Math.min(640, Math.max(260, value)) : 420
}

function EmbeddedBibleWorkspace({
  main,
  panel,
}: {
  main: ReactNode
  panel: ReactNode | null
}) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState(storedBibleContextWidth)
  const libraryCollapsed = useActiveBiblePaneStore((state) => state.libraryCollapsed)
  const toggleLibrary = useActiveBiblePaneStore((state) => state.toggleLibrary)

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const move = (moveEvent: PointerEvent) => {
      const max = Math.max(260, rect.width * 0.65)
      setPanelWidth(Math.min(max, Math.max(260, rect.right - moveEvent.clientX)))
    }
    const finish = (upEvent: PointerEvent) => {
      const max = Math.max(260, rect.width * 0.65)
      const width = Math.min(max, Math.max(260, rect.right - upEvent.clientX))
      setPanelWidth(width)
      localStorage.setItem(BIBLE_CONTEXT_WIDTH_KEY, String(width))
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish)
  }

  return (
    <div ref={containerRef} className="workspace-bible-context flex h-full min-h-0 min-w-0 overflow-hidden bg-bg-secondary">
      <aside
        className={cn(
          'hidden shrink-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-secondary transition-[width] duration-200 lg:flex',
          libraryCollapsed ? 'w-9' : 'w-[220px]',
        )}
        data-region="bible-tab-selector"
        aria-label={t('nav.library')}
      >
        {libraryCollapsed ? (
          <button
            type="button"
            onClick={toggleLibrary}
            className="flex h-10 w-full items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
            aria-label={t('layout.openLibrary')}
            title={t('layout.openLibrary')}
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.6} />
          </button>
        ) : (
          <>
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-subtle pl-3 pr-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                {t('nav.library')}
              </span>
              <button
                type="button"
                onClick={toggleLibrary}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
                aria-label={t('layout.closeLibrary')}
                title={t('layout.closeLibrary')}
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
            <BookSelector />
          </>
        )}
      </aside>
      <main
        className="workspace-bible-reader min-w-0 flex-1 overflow-hidden"
        data-tour="reading"
        data-region="reader"
        aria-label={t('a11y.regionReader')}
        tabIndex={-1}
      >
        {main}
      </main>

      {panel && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('workspace.resizeBibleContext')}
            tabIndex={0}
            onPointerDown={beginResize}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              event.preventDefault()
              const delta = event.key === 'ArrowLeft' ? 16 : -16
              const width = Math.min(640, Math.max(260, panelWidth + delta))
              setPanelWidth(width)
              localStorage.setItem(BIBLE_CONTEXT_WIDTH_KEY, String(width))
            }}
            className="workspace-bible-context-separator group relative z-20 w-1 shrink-0 cursor-col-resize bg-border-subtle outline-none hover:bg-accent/50 focus-visible:bg-accent"
          >
            <span className="absolute inset-y-0 -left-1 -right-1" aria-hidden />
          </div>
          <aside
            className="workspace-bible-context-panel h-full min-w-[260px] shrink-0 overflow-hidden"
            style={{ width: `min(${panelWidth}px, 65%)` }}
            data-region="panel"
            aria-label={t('a11y.regionPanel')}
          >
            {panel}
          </aside>
        </>
      )}
    </div>
  )
}
