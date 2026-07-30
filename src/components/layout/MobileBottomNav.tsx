import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  GraduationCap,
  MessagesSquare,
  Search,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { paths, isPageRoute } from '@/router/paths'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { cn } from '@/lib/cn'

interface NavButtonProps {
  icon: LucideIcon
  label: string
  active?: boolean
  badge?: number
  onClick: () => void
}

function NavButton({ icon: Icon, label, active = false, badge, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors',
        active ? 'text-accent' : 'text-text-muted hover:text-text-primary',
      )}
    >
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        {badge != null && badge > 0 && (
          <span className="absolute -right-2 -top-1 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-bg-primary text-[10px] font-semibold leading-[16px] text-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </button>
  )
}

interface BibleButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function BibleButton({ label, active, onClick }: BibleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors',
        active ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
      )}
    >
      <span
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors -mt-0.5',
          active
            ? 'bg-accent text-bg-secondary shadow-sm'
            : 'bg-bg-tertiary text-text-secondary',
        )}
      >
        <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </button>
  )
}

export function MobileBottomNav() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const togglePanel = useUIStore((s) => s.togglePanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const activePanel = useUIStore((s) => s.activePanel)
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar)
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
  const openMobileSearch = useUIStore((s) => s.openMobileSearch)
  const closeMobileSearch = useUIStore((s) => s.closeMobileSearch)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const user = useAuthStore((s) => s.user)
  const chatUnread = useChatStore((s) =>
    s.conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0),
  )
  const friendsUnread = useNotificationStore((s) => s.unreadCount)
  const pendingInvitations = useStudyStore((s) => s.pendingInvitations.length)
  const collapsed = useUIStore((s) => s.mobileChromeCollapsed)

  const onPage = isPageRoute(pathname)

  const clearOthers = () => {
    closeMobileSearch()
    closeMobileSidebar()
    closePanel()
  }

  const goToSearch = () => {
    if (mobileSearchOpen) {
      closeMobileSearch()
      return
    }
    clearOthers()
    openMobileSearch()
  }

  const goToPanel = (panel: Parameters<typeof togglePanel>[0]) => () => {
    if (!user) {
      clearOthers()
      openAuthModal()
      return
    }
    if (activePanel === panel && !mobileSearchOpen) {
      closePanel()
      return
    }
    clearOthers()
    togglePanel(panel)
  }

  const goToProfile = () => {
    clearOthers()
    navigate(paths.profile())
  }

  const goToBible = () => {
    clearOthers()
    if (onPage) navigate(paths.root())
  }

  const isReader = !onPage && !mobileSearchOpen && activePanel === null
  const isProfile = activePanel === null
    && !mobileSearchOpen
    && (
      pathname.startsWith('/perfil')
      || pathname.startsWith('/ajustes')
      || pathname.startsWith('/u/')
    )
  const hidden = collapsed && isReader

  return (
    <nav
      className={cn(
        'flex shrink-0 items-stretch border-t border-border-subtle bg-bg-secondary overflow-hidden transition-[height,border-width] duration-300 ease-out',
        hidden ? 'h-0 border-t-0' : 'h-[68px]',
      )}
      aria-label={t('layout.library')}
      aria-hidden={hidden}
      // Collapsed to h-0 but still mounted for the transition — `inert` is what
      // keeps its buttons out of the tab order.
      inert={hidden ? '' : undefined}
    >
      <NavButton
        icon={Search}
        label={t('layout.search')}
        active={mobileSearchOpen}
        onClick={goToSearch}
      />
      <NavButton
        icon={GraduationCap}
        label={t('nav.studies')}
        active={activePanel === 'my-studies'}
        badge={pendingInvitations}
        onClick={goToPanel('my-studies')}
      />
      <BibleButton
        label={t('nav.bible')}
        active={isReader}
        onClick={goToBible}
      />
      <NavButton
        icon={MessagesSquare}
        label={t('nav.chats')}
        active={activePanel === 'friends' || activePanel === 'chat'}
        badge={chatUnread + friendsUnread}
        onClick={goToPanel('friends')}
      />
      <NavButton
        icon={UserRound}
        label={t('nav.profile')}
        active={isProfile}
        badge={friendsUnread}
        onClick={goToProfile}
      />
    </nav>
  )
}
