import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { FloatingChatDock } from '@/components/chat/FloatingChatDock'
import { cn } from '@/lib/cn'
import { useUIStore } from '@/lib/store/useUIStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useIsMobile } from '@/lib/useIsMobile'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileSearchView } from './MobileSearchView'
import { MobileHubView } from './MobileHubView'
import { WorkspaceSidePanel } from './WorkspaceSidePanel'
import { WorkspaceTabs } from './WorkspaceTabs'
import { useWorkspacePane } from './WorkspacePaneContext'
import { DesktopSidebar } from './DesktopSidebar'

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
  const { pathname } = useLocation()
  const isMobile = useIsMobile()
  const { t } = useTranslation()
  const activePanel = useUIStore((state) => state.activePanel)
  const closePanel = useUIStore((state) => state.closePanel)
  const mobileSearchOpen = useUIStore((state) => state.mobileSearchOpen)
  const mobileHub = useUIStore((state) => state.mobileHub)
  const closeMobileSearch = useUIStore((state) => state.closeMobileSearch)
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar)
  const closeMobileBookPicker = useUIStore((state) => state.closeMobileBookPicker)
  const closeMobileHub = useUIStore((state) => state.closeMobileHub)
  const workspacePane = useWorkspacePane()

  // Panels belong to the reader/workspace route. Clear any reader chrome when
  // entering a full page so a panel opened on the Bible cannot sit above (or
  // hide) the destination page after navigation.
  useEffect(() => {
    if (!isMobile) return
    closePanel()
    closeMobileSearch()
    closeMobileSidebar()
    closeMobileBookPicker()
    closeMobileHub()
  }, [isMobile, pathname, closePanel, closeMobileSearch, closeMobileSidebar, closeMobileBookPicker, closeMobileHub])

  // On a hard refresh of /perfil or /ajustes the reader never mounts, so
  // nobody loads the Bible book list the sidebar shows. Fetch it here
  // (no-op when already loaded; never fetches verses or pings activity).
  useEffect(() => {
    void useVerseStore.getState().ensureBooks()
  }, [])

  useEffect(() => {
    workspacePane?.reportTitle(title)
  }, [title, workspacePane])

  const mobilePageVisible = !activePanel && !mobileSearchOpen && !mobileHub

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
        <span className="flex-1 truncate px-2 text-[15px] font-semibold text-text-primary">{title}</span>
        <button
          type="button"
          onClick={() => useUIStore.getState().openMobileSearch()}
          data-tour="search"
          aria-label={t('layout.search')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        {mobileActions}
      </header>

      {/* Desktop sidebar */}
      <DesktopSidebar>
        <Sidebar />
      </DesktopSidebar>

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

      <div
        className={cn(
          'min-h-0 flex-1 overflow-hidden md:hidden',
          mobileHub ? 'block' : 'hidden',
        )}
      >
        <MobileHubView />
      </div>

      <div className="md:hidden shrink-0">
        <MobileBottomNav />
      </div>

      <FloatingChatDock rightPanelOpen={false} />
    </div>
  )
}
