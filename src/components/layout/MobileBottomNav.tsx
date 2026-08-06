import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Compass,
  GraduationCap,
  UserRound,
  UsersRound,
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
  dataTour?: string
}

function NavButton({ icon: Icon, label, active = false, badge, onClick, dataTour }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      data-tour={dataTour}
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors',
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
      <span className="max-w-full truncate text-[10px] font-medium leading-none min-[360px]:text-[11px]">{label}</span>
    </button>
  )
}

interface BibleButtonProps {
  label: string
  active: boolean
  onClick: () => void
  dataTour?: string
}

function BibleButton({ label, active, onClick, dataTour }: BibleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      data-tour={dataTour}
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors',
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
      <span className="max-w-full truncate text-[10px] font-medium leading-none min-[360px]:text-[11px]">{label}</span>
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
  const mobileHub = useUIStore((s) => s.mobileHub)
  const openMobileHub = useUIStore((s) => s.openMobileHub)
  const closeMobileHub = useUIStore((s) => s.closeMobileHub)
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
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
    closeMobileHub()
    closePanel()
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

  const goToHub = (hub: 'explore' | 'you') => () => {
    if (mobileHub === hub && !mobileSearchOpen && activePanel === null) {
      closeMobileHub()
      return
    }
    clearOthers()
    openMobileHub(hub)
  }

  const goToBible = () => {
    clearOthers()
    if (onPage) navigate(paths.root())
  }

  const isReader = !onPage && !mobileSearchOpen && mobileHub === null && activePanel === null
  const isExplore = mobileHub === 'explore' || (
    mobileHub === null
    && activePanel === null
    && (pathname.startsWith('/marketplace') || pathname.startsWith('/juegos') || pathname.startsWith('/mis-rutas'))
  )
  const isProfile = activePanel === null
    && !mobileSearchOpen
    && (
      mobileHub === 'you'
      || (
        mobileHub === null
        && (
          pathname.startsWith('/perfil')
          || pathname.startsWith('/ajustes')
          || pathname.startsWith('/u/')
        )
      )
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
      <BibleButton
        label={t('nav.bible')}
        active={isReader}
        onClick={goToBible}
        dataTour="bible"
      />
      <NavButton
        icon={Compass}
        label={t('nav.explore', 'Explorar')}
        active={isExplore}
        onClick={goToHub('explore')}
        dataTour="explore"
      />
      <NavButton
        icon={GraduationCap}
        label={t('nav.studies')}
        active={activePanel === 'my-studies'}
        badge={pendingInvitations}
        onClick={goToPanel('my-studies')}
        dataTour="my-studies"
      />
      <NavButton
        icon={UsersRound}
        label={t('nav.community', 'Comunidad')}
        active={activePanel === 'friends' || activePanel === 'chat'}
        badge={chatUnread + friendsUnread}
        onClick={goToPanel('friends')}
        dataTour="chats"
      />
      <NavButton
        icon={UserRound}
        label={t('nav.you', 'Tú')}
        active={isProfile}
        onClick={goToHub('you')}
        dataTour="profile"
      />
    </nav>
  )
}
