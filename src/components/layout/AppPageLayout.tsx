import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { FloatingChatDock } from '@/components/chat/FloatingChatDock'
import { cn } from '@/lib/cn'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileSearchView } from './MobileSearchView'
import { WorkspaceSidePanel } from './WorkspaceSidePanel'
import { WorkspaceTabs } from './WorkspaceTabs'
import { useWorkspacePane } from './WorkspacePaneContext'

interface AppPageLayoutProps {
  /** Title shown in the mobile top bar. */
  title: string
  /** Optional actions rendered on the right of the mobile top bar. */
  mobileActions?: ReactNode
  children: ReactNode
}

/**
 * Shell for workspace routes (profile, settings, marketplace, groups). Desktop
 * keeps the persistent sidebar, shared side panels, and tabs; mobile gets a thin
 * back/title bar plus the shared bottom nav. The Bible reader keeps PanelLayout
 * for its specialised right-hand study/commentary panel.
 *
 * IMPORTANT: children render exactly ONCE (responsive chrome via CSS, not two
 * branches) — duplicating them would duplicate section ids, breaking anchor
 * scrolling, and double-mount data-fetching children.
 */
export function AppPageLayout({ title, mobileActions, children }: AppPageLayoutProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const activePanel = useUIStore((state) => state.activePanel)
  const mobileSearchOpen = useUIStore((state) => state.mobileSearchOpen)
  const workspacePane = useWorkspacePane()

  // On a hard refresh of /perfil or /ajustes the reader never mounts, so
  // nobody loads the Bible book list the sidebar shows. Fetch it here
  // (no-op when already loaded; never fetches verses or pings activity).
  useEffect(() => {
    void useVerseStore.getState().ensureBooks()
  }, [])

  useEffect(() => {
    workspacePane?.reportTitle(title)
  }, [title, workspacePane])

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const mobilePageVisible = !activePanel && !mobileSearchOpen

  if (workspacePane) {
    return (
      <main className="workspace-page-host h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-bg-secondary">
        {children}
      </main>
    )
  }

  return (
    <div className="app-viewport relative flex w-full flex-col overflow-hidden bg-bg-primary md:flex-row">
      {/* Mobile top bar */}
      <header
        className={cn(
          'h-12 shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-secondary px-2 md:hidden',
          mobilePageVisible ? 'flex' : 'hidden',
        )}
      >
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <span className="flex-1 truncate text-[15px] font-semibold text-text-primary">{title}</span>
        {mobileActions}
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:block flex-shrink-0 w-sidebar h-full overflow-hidden">
        <Sidebar />
      </aside>

      {/* Panels are part of the workspace shell, so opening one never changes
          or unmounts the active page tab. */}
      <aside
        className={cn(
          'min-h-0 overflow-hidden bg-bg-secondary',
          activePanel
            ? 'flex flex-1 md:block md:h-full md:w-panel md:flex-none md:border-r md:border-border-subtle'
            : 'hidden md:block md:h-full md:w-0 md:flex-none',
          'md:transition-[width,opacity] md:duration-150',
        )}
        data-region={activePanel ? 'left-panel' : undefined}
        aria-label={t('a11y.regionLeftPanel')}
        inert={activePanel ? undefined : ''}
      >
        <div className="h-full w-full md:w-panel">
          <WorkspaceSidePanel panel={activePanel} />
        </div>
      </aside>

      <section
        className={cn(
          'min-h-0 flex-1 flex-col overflow-hidden bg-bg-secondary md:flex md:h-full',
          mobilePageVisible ? 'flex' : 'hidden',
        )}
      >
        <WorkspaceTabs title={title} />

        {/* Single shared content instance — responsive chrome is CSS-only so
            data-fetching children remain mounted when a panel opens. */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </section>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-hidden md:hidden',
          mobileSearchOpen ? 'block' : 'hidden',
        )}
      >
        <MobileSearchView />
      </div>

      <div className="md:hidden shrink-0">
        <MobileBottomNav />
      </div>

      <FloatingChatDock rightPanelOpen={false} />
    </div>
  )
}
