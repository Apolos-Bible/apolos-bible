import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { paths } from '@/router/paths'
import {
  BookOpen,
  BookPlus,
  ExternalLink,
  GraduationCap,
  MessagesSquare,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Star,
  Store,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useUIStore } from '@/lib/store/useUIStore'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { destroyEcho } from '@/lib/echo'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { StartStudyModal } from '@/components/study/StartStudyModal'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'
import { Logo, LogoIcon } from '@/components/brand/Logo'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { createWorkspaceTab, useWorkspaceStore } from '@/lib/store/useWorkspaceStore'

interface NavItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
  onOpenNew?: () => void
  dataTour?: string
  compact?: boolean
}

function NavItem({ icon: Icon, label, active = false, badge, onClick, onOpenNew, dataTour, compact = false }: NavItemProps) {
  const { t } = useTranslation()
  const openMenu = useContextMenuStore((state) => state.openMenu)

  return (
    <button
      onClick={(event) => {
        if ((event.metaKey || event.ctrlKey) && onOpenNew) {
          onOpenNew()
          return
        }
        onClick?.()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const items = [
          {
            type: 'action' as const,
            label: t('sidebar.chapter.open'),
            icon: <Icon className="h-4 w-4" />,
            onClick: () => onClick?.(),
          },
        ]
        if (onOpenNew) {
          items.push({
            type: 'action' as const,
            label: t('sidebar.chapter.openNewWindow'),
            icon: <ExternalLink className="h-4 w-4" />,
            onClick: onOpenNew,
          })
        }
        openMenu(event.clientX, event.clientY, items)
      }}
      data-tour={dataTour}
      aria-pressed={active}
      aria-label={label}
      title={compact ? label : undefined}
      className={cn(
        'relative flex w-full items-center text-sm',
        'hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors duration-100',
        compact ? 'h-9 justify-center px-0' : 'gap-2 px-3 py-1.5',
        active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary',
      )}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </span>
      {!compact && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
      {badge != null && badge > 0 && (
        <span className={cn(
          'rounded-full bg-accent text-bg-primary text-2xs font-medium flex items-center justify-center',
          compact ? 'absolute right-1 top-0.5 h-2 w-2' : 'min-w-[16px] h-4 px-1',
        )}>
          {!compact && (badge > 9 ? '9+' : badge)}
        </span>
      )}
    </button>
  )
}

function SectionLabel({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  if (compact) return <div className="mx-2 my-2 h-px bg-border-subtle" aria-hidden />
  return (
    <p className="px-3 pt-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-text-muted select-none">
      {children}
    </p>
  )
}

export function Sidebar() {
  const { t }          = useTranslation()
  const navigate           = useNavigate()
  const { pathname }       = useLocation()
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openContextMenu    = useContextMenuStore(s => s.openMenu)
  const togglePanel        = useUIStore(s => s.togglePanel)
  const openAuthModal      = useUIStore(s => s.openAuthModal)
  const closeMobileSidebar = useUIStore(s => s.closeMobileSidebar)
  const activePanel        = useUIStore(s => s.activePanel)
  const openTab            = useWorkspaceStore(s => s.openTab)
  const workspaceTabs      = useWorkspaceStore(s => s.tabs)
  const user               = useAuthStore(s => s.user)
  const startPolling  = useNotificationStore(s => s.startPolling)
  const stopPolling   = useNotificationStore(s => s.stopPolling)
  const listenForPush = useNotificationStore(s => s.listenForPush)
  const stopPush      = useNotificationStore(s => s.stopPush)
  const chatUnread    = useChatStore(s => s.conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0))
  const pendingInvitations = useStudyStore(s => s.pendingInvitations.length)
  const loadInvitations = useStudyStore(s => s.loadInvitations)
  const [showStartStudy, setShowStartStudy] = useState(false)
  const locale = useUIStore(s => s.locale)
  const selectedBook = useActiveVerseStore(s => s.selectedBook)
  const selectedChapter = useActiveVerseStore(s => s.selectedChapter)
  const compact = useUIStore(s => s.desktopSidebarCollapsed)
  const toggleDesktopSidebar = useUIStore(s => s.toggleDesktopSidebar)

  const openRoute = (path: string, title: string, newWindow = false) => {
    closeMobileSidebar()
    if (newWindow) {
      const tab = createWorkspaceTab(path, path, title)
      tab.id = `${tab.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`
      openTab(tab, useWorkspaceStore.getState().activeGroupId)
    }
    navigate(path)
  }

  const openDestinationMenu = (
    event: React.MouseEvent,
    open: () => void,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    openContextMenu(event.clientX, event.clientY, [
      { type: 'action', label: t('sidebar.chapter.open'), onClick: open },
    ])
  }

  const biblePath = selectedBook
    ? paths.bible({ lang: locale, book: selectedBook, chapter: selectedChapter })
    : Object.values(workspaceTabs).find((tab) => tab.kind === 'bible')?.path
      ?? paths.bible({ lang: locale, book: 'genesis', chapter: 1 })

  const goHome = () => {
    closeMobileSidebar()
    navigate(selectedBook ? paths.bible({ lang: locale, book: selectedBook, chapter: selectedChapter }) : paths.root())
  }

  const toggleSidebarPanel = (panel: Parameters<typeof togglePanel>[0]) => {
    closeMobileSidebar()
    togglePanel(panel)
  }

  useEffect(() => {
    if (!user) {
      stopPolling()
      stopPush()
      destroyEcho()
      return
    }
    startPolling()
    listenForPush(String(user.id))
    loadInvitations()
    return () => {
      stopPolling()
      stopPush()
      destroyEcho()
    }
  }, [user, startPolling, stopPolling, listenForPush, stopPush])

  return (
    <div className="w-full h-full bg-bg-secondary border-r border-border-subtle flex flex-col overflow-hidden">
      {/* App name */}
      <div className={cn('flex shrink-0 items-center', compact ? 'h-12 justify-center' : 'px-3 pt-3 pb-2')} data-tour="logo">
        {compact ? (
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
            aria-label={t('layout.expandSidebar')}
            title={t('layout.expandSidebar')}
          >
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.6} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={goHome}
              className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              aria-label={t('nav.home')}
            >
              <Logo symbolSize={20} textSize={14} />
            </button>
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
              aria-label={t('layout.collapseSidebar')}
              title={t('layout.collapseSidebar')}
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </>
        )}
      </div>

      <div className={cn('px-2 pb-2', compact && 'px-1')} data-tour="search">
        <button
          onClick={openCommandPalette}
          aria-label={t('nav.searchBible')}
          title={compact ? t('nav.searchBible') : undefined}
          className={cn(
            'flex w-full items-center rounded-md border border-border-subtle bg-bg-primary text-left text-sm text-text-muted transition-colors hover:text-text-secondary hover:bg-bg-tertiary',
            compact ? 'h-9 justify-center px-0' : 'gap-2 px-3 py-2',
          )}
        >
          <span className="w-4 h-4 flex items-center justify-center opacity-70">
            <Search className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </span>
          {!compact && <span className="flex-1">{t('nav.searchBible')}</span>}
          <kbd className={cn('hidden font-mono text-2xs text-text-muted md:inline', compact && 'md:hidden')}>
            {modKey}K
          </kbd>
        </button>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto px-2 pb-2', compact && 'px-1')}>
        <SectionLabel compact={compact}>{t('nav.personal')}</SectionLabel>
        <NavItem
          dataTour="bible"
          icon={BookOpen}
          label={t('nav.bible')}
          active={pathname.includes('/bible/') || pathname.startsWith('/bible/')}
          onClick={() => openRoute(biblePath, t('nav.bible'))}
          onOpenNew={() => openRoute(biblePath, t('nav.bible'), true)}
          compact={compact}
        />
        <NavItem compact={compact} dataTour="favorites" icon={Star} label={t('nav.favorites')} active={activePanel === 'favorites'} onClick={() => user ? toggleSidebarPanel('favorites') : openAuthModal()} />
        <NavItem compact={compact} dataTour="my-notes" icon={NotebookPen} label={t('nav.myNotes')} active={activePanel === 'my-notes'} onClick={() => user ? toggleSidebarPanel('my-notes') : openAuthModal()} />
        <NavItem compact={compact} dataTour="my-studies" icon={GraduationCap} label={t('nav.myStudies')} active={activePanel === 'my-studies'} badge={pendingInvitations} onClick={() => user ? toggleSidebarPanel('my-studies') : openAuthModal()} />
        {/* Central destinations navigate into their own workspace tabs. */}
        <NavItem compact={compact} dataTour="new-study" icon={BookPlus} label={t('nav.newStudy')} active={false} onClick={() => user ? setShowStartStudy(true) : openAuthModal()} />
        <SectionLabel compact={compact}>{t('nav.social')}</SectionLabel>
        {/* Marketplace opens or focuses its workspace tab. */}
        <NavItem compact={compact} dataTour="marketplace" icon={Store} label={t('nav.marketplace')} active={pathname.startsWith('/marketplace')} onClick={() => user ? openRoute(paths.marketplace(), t('nav.marketplace')) : openAuthModal()} onOpenNew={() => user ? openRoute(paths.marketplace(), t('nav.marketplace'), true) : openAuthModal()} />
        <NavItem compact={compact} dataTour="friends" icon={UsersRound} label={t('nav.friends')} active={activePanel === 'friends'} onClick={() => user ? toggleSidebarPanel('friends') : openAuthModal()} />
        <NavItem compact={compact} dataTour="chats" icon={MessagesSquare} label={t('nav.chats')} active={activePanel === 'chat'} badge={chatUnread} onClick={() => user ? toggleSidebarPanel('chat') : openAuthModal()} />
      </div>

      {/* Footer */}
      <div className="mt-auto shrink-0 border-t border-border-subtle" data-tour="profile">
        {/* Profile row — opens the profile page; the gear opens settings */}
        {compact ? (
          <div className="flex flex-col items-center py-1">
            {user ? (
              <button
                type="button"
                onClick={() => navigate(paths.profile())}
                className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-bg-tertiary"
                aria-label={t('nav.profile')}
                title={t('nav.profile')}
              >
                <UserAvatar name={user.name} email={user.email} src={user.avatar_url} size="md" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-bg-tertiary"
                aria-label={t('nav.signIn')}
                title={t('nav.signIn')}
              >
                <LogoIcon size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(paths.settings())}
              className="flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-bg-tertiary hover:text-text-secondary"
              aria-label={t('settings.title')}
              title={t('settings.title')}
            >
              <Settings className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </div>
        ) : user ? (
          <div className="flex items-stretch">
            <button
              onClick={() => navigate(paths.profile())}
              onContextMenu={(event) => openDestinationMenu(
                event,
                () => openRoute(paths.profile(), t('perfil.title.self')),
              )}
              aria-current={pathname.startsWith('/perfil') ? 'page' : undefined}
              className={cn(
                'flex flex-1 min-w-0 items-center gap-2.5 px-4 py-3 transition-colors',
                pathname.startsWith('/perfil') ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary',
              )}
            >
              <UserAvatar name={user.name} email={user.email} src={user.avatar_url} size="md" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs text-text-primary truncate font-medium">{user.name}</p>
                <p className="text-2xs text-text-muted truncate">{user.email}</p>
              </div>
            </button>
            <button
              onClick={() => navigate(paths.settings())}
              onContextMenu={(event) => openDestinationMenu(
                event,
                () => openRoute(paths.settings(), t('settings.title')),
              )}
              aria-label={t('settings.title')}
              title={t('settings.title')}
              aria-current={pathname.startsWith('/ajustes') ? 'page' : undefined}
              className={cn(
                'flex w-11 shrink-0 items-center justify-center border-l border-border-subtle transition-colors',
                pathname.startsWith('/ajustes')
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:bg-bg-tertiary hover:text-text-secondary',
              )}
            >
              <Settings className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal()}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-bg-tertiary transition-colors group"
          >
            <div className="w-5 h-5 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3 text-text-muted">
                <circle cx="8" cy="6" r="2.5"/>
                <path d="M2 13c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
              {t('nav.signIn')}
            </span>
          </button>
        )}
      </div>
      <StartStudyModal open={showStartStudy} onClose={() => setShowStartStudy(false)} />
    </div>
  )
}
