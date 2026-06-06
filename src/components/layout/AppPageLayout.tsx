import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { MobileBottomNav } from './MobileBottomNav'

interface AppPageLayoutProps {
  /** Title shown in the mobile top bar. */
  title: string
  /** Optional actions rendered on the right of the mobile top bar. */
  mobileActions?: ReactNode
  children: ReactNode
}

/**
 * Shell for full-page routes (profile, settings). Desktop keeps the persistent
 * sidebar and scrolls the page in the main column; mobile gets a thin back/title
 * bar plus the shared bottom nav. The Bible reader keeps its own PanelLayout.
 *
 * IMPORTANT: children render exactly ONCE (responsive chrome via CSS, not two
 * branches) — duplicating them would duplicate section ids, breaking anchor
 * scrolling, and double-mount data-fetching children.
 */
export function AppPageLayout({ title, mobileActions, children }: AppPageLayoutProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  // On a hard refresh of /perfil or /ajustes the reader never mounts, so
  // nobody loads the Bible book list the sidebar shows. Fetch it here
  // (no-op when already loaded; never fetches verses or pings activity).
  useEffect(() => {
    void useVerseStore.getState().ensureBooks()
  }, [])

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="app-viewport w-full overflow-hidden bg-bg-primary flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex h-12 shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-secondary px-2">
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

      {/* Single shared content instance — same surface as the reader
          (bg-secondary = white in light mode) */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:h-full bg-bg-secondary">
        {children}
      </main>

      <div className="md:hidden shrink-0">
        <MobileBottomNav />
      </div>
    </div>
  )
}
