import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, GraduationCap } from 'lucide-react'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { cn } from '@/lib/cn'

interface NavButtonProps {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick: () => void
}

function NavButton({ icon, label, active = false, badge, onClick }: NavButtonProps) {
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
        {icon}
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[22px] w-[22px]">
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[22px] w-[22px]">
      <path d="M2.5 4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H6.5l-3 2.5v-2.5H4a1.5 1.5 0 0 1-1.5-1.5z" strokeLinejoin="round" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-[22px] w-[22px]">
      <circle cx="8" cy="6" r="2.5" />
      <path d="M2 13c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round" />
    </svg>
  )
}

export function MobileBottomNav() {
  const { t } = useTranslation()
  const togglePanel = useUIStore((s) => s.togglePanel)
  const closePanel = useUIStore((s) => s.closePanel)
  const activePanel = useUIStore((s) => s.activePanel)
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar)
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
    if (activePanel === panel && !mobileSearchOpen && !mobileSidebarOpen) {
      closePanel()
      return
    }
    clearOthers()
    togglePanel(panel)
  }

  const goToProfile = () => {
    if (mobileSidebarOpen) {
      closeMobileSidebar()
      return
    }
    clearOthers()
    openMobileSidebar()
  }

  const goToBible = () => {
    clearOthers()
  }

  const isReader = !mobileSearchOpen && !mobileSidebarOpen && activePanel === null
  const hidden = collapsed && isReader

  return (
    <nav
      className={cn(
        'flex shrink-0 items-stretch border-t border-border-subtle bg-bg-secondary overflow-hidden transition-[height,border-width] duration-300 ease-out',
        hidden ? 'h-0 border-t-0' : 'h-[68px]',
      )}
      aria-label={t('layout.library')}
      aria-hidden={hidden}
    >
      <NavButton
        icon={<SearchIcon />}
        label={t('layout.search')}
        active={mobileSearchOpen}
        onClick={goToSearch}
      />
      <NavButton
        icon={<GraduationCap className="h-[22px] w-[22px]" strokeWidth={1.6} />}
        label={t('nav.studies')}
        active={!isReader && activePanel === 'my-studies'}
        badge={pendingInvitations}
        onClick={goToPanel('my-studies')}
      />
      <BibleButton
        label={t('nav.bible')}
        active={isReader}
        onClick={goToBible}
      />
      <NavButton
        icon={<ChatIcon />}
        label={t('nav.chat')}
        active={!isReader && activePanel === 'chat'}
        badge={chatUnread}
        onClick={goToPanel('chat')}
      />
      <NavButton
        icon={<ProfileIcon />}
        label={t('nav.profile')}
        active={mobileSidebarOpen}
        badge={friendsUnread}
        onClick={goToProfile}
      />
    </nav>
  )
}
