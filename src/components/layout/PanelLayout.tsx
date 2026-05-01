import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'

interface PanelLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  panel: ReactNode | null
  leftPanel?: ReactNode
}

export function PanelLayout({ sidebar, main, panel, leftPanel }: PanelLayoutProps) {
  const { t } = useTranslation()
  const studyVerseId = useVerseStore((s) => s.studyVerseId)
  const closeStudyPanel = useVerseStore((s) => s.closeStudyPanel)
  const commentaryOpen = useUIStore((s) => s.commentaryOpen)
  const toggleCommentary = useUIStore((s) => s.toggleCommentary)
  const closePanel = useUIStore((s) => s.closePanel)
  const openCommandPalette = useUIStore((s) => s.openCommandPalette)
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar)
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar)

  const closeMobileStudyPanel = () => {
    if (commentaryOpen) {
      toggleCommentary()
    }
    if (studyVerseId) {
      closeStudyPanel()
    }
  }

  return (
    <div className="app-viewport w-full overflow-hidden bg-bg-primary">
      <div className="md:hidden flex h-full flex-col">
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-4 md:hidden">
          <button
            type="button"
            onClick={openMobileSidebar}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary shadow-sm"
            aria-label={t('layout.openLibrary')}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <path d="M2.5 4h11M2.5 8h11M2.5 12h11" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary shadow-sm"
            aria-label={t('layout.search')}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
              <circle cx="7" cy="7" r="4.25" />
              <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <main className="min-h-0 flex-1 overflow-hidden">
          {main}
        </main>

        <div
          className={cn(
            'absolute inset-0 z-40 transition-opacity duration-200 md:hidden',
            mobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobileSidebar}
          />
          <aside
            className={cn(
              'absolute inset-y-0 left-0 w-[min(88vw,24rem)] bg-bg-secondary shadow-2xl transition-transform duration-300',
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                <span className="text-sm font-medium text-text-primary">{t('layout.library')}</span>
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted"
                  aria-label={t('layout.closeLibrary')}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                    <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {sidebar}
              </div>
            </div>
          </aside>
        </div>

        <div
          className={cn(
            'absolute inset-0 z-30 transition-opacity duration-200 md:hidden',
            leftPanel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="absolute inset-0 bg-black/60" onClick={closePanel} />
          <div className="absolute inset-x-0 bottom-0 top-4 rounded-t-2xl bg-bg-primary shadow-2xl">
            <div className="h-full overflow-hidden">
              {leftPanel}
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 z-30 transition-opacity duration-200 md:hidden',
            panel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
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
        <aside className="flex-shrink-0 w-sidebar h-full overflow-hidden">
          {sidebar}
        </aside>

        <aside
          className={cn(
            'flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out border-r border-border-subtle',
            leftPanel != null ? 'w-panel opacity-100' : 'w-0 opacity-0 border-0',
          )}
        >
          <div className="w-panel h-full">
            {leftPanel}
          </div>
        </aside>

        <main className="flex-1 min-w-0 h-full overflow-hidden">
          {main}
        </main>

        <aside
          className={cn(
            'flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out',
            panel !== null ? 'w-panel opacity-100' : 'w-0 opacity-0',
          )}
        >
          <div className="w-panel h-full">
            {panel}
          </div>
        </aside>
      </div>
    </div>
  )
}
