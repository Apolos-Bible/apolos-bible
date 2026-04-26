import { useState, useEffect, type ReactNode } from 'react'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { destroyEcho } from '@/lib/echo'
import { BookSelector } from './BookSelector'
import { ChapterGrid } from './ChapterGrid'
import { AuthModal } from '@/components/auth/AuthModal'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'

interface NavItemProps {
  icon: ReactNode
  label: string
  onClick?: () => void
}

function NavItem({ icon, label, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 w-full text-sm text-text-secondary',
        'hover:text-text-primary hover:bg-bg-tertiary rounded px-3 py-1.5 transition-colors duration-100',
      )}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.385l-3.09 1.624.59-3.44L3 5.132l3.455-.502L8 1.5z" />
    </svg>
  )
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M5 6h6M5 8.5h4" strokeLinecap="round" />
    </svg>
  )
}


function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1.5" />
      <path d="M12 9.5c1.5.2 3 1.2 3 3.5" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar() {
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const openPanel          = useUIStore(s => s.openPanel)
  const openSettings       = useUIStore(s => s.openSettings)
  const closeMobileSidebar = useUIStore(s => s.closeMobileSidebar)
  const user               = useAuthStore(s => s.user)
  const startPolling  = useNotificationStore(s => s.startPolling)
  const stopPolling   = useNotificationStore(s => s.stopPolling)
  const unreadCount   = useNotificationStore(s => s.unreadCount)
  const listenForPush = useNotificationStore(s => s.listenForPush)
  const stopPush      = useNotificationStore(s => s.stopPush)
  const [authOpen, setAuthOpen] = useState(false)

  const openSidebarPanel = (panel: Parameters<typeof openPanel>[0]) => {
    openPanel(panel)
    closeMobileSidebar()
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
    return () => {
      stopPolling()
      stopPush()
      destroyEcho()
    }
  }, [user, startPolling, stopPolling, listenForPush, stopPush])

  return (
    <div className="w-full h-full bg-bg-secondary border-r border-border-subtle flex flex-col overflow-hidden">
      {/* App name */}
      <div className="px-4 py-3 shrink-0">
        <span className="font-medium text-md">
          <span className="text-accent">tulia</span>
          <span className="text-text-muted">.study</span>
        </span>
      </div>

      {/* Library label */}
      <p className="text-2xs uppercase tracking-wider text-text-muted px-4 py-1 mt-2 shrink-0 select-none">
        Library
      </p>

      <BookSelector />

      <div className="shrink-0 border-t border-border-subtle">
        <ChapterGrid />
      </div>

      {/* Personal nav */}
      <div className="shrink-0 border-t border-border-subtle pt-1 pb-1 px-2 flex flex-col gap-0.5">
        <NavItem icon={<StarIcon />}    label="Favorites" onClick={() => user ? openSidebarPanel('favorites') : setAuthOpen(true)} />
        <NavItem icon={<NoteIcon />}    label="My Notes"  onClick={() => user ? openSidebarPanel('my-notes')  : setAuthOpen(true)} />
        <div className="relative">
          <NavItem icon={<PeopleIcon />} label="Friends" onClick={() => user ? openSidebarPanel('friends') : setAuthOpen(true)} />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[16px] h-4 px-1 rounded-full bg-accent text-bg-primary text-2xs font-medium flex items-center justify-center pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border-subtle">
        {/* Profile row — opens settings */}
        {user ? (
          <button
            onClick={openSettings}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-bg-tertiary transition-colors group"
          >
            <UserAvatar email={user.email} size="sm" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-text-primary truncate font-medium">{user.name}</p>
              <p className="text-2xs text-text-muted truncate">{user.email}</p>
            </div>
            <svg
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
              className="w-3.5 h-3.5 text-text-muted group-hover:text-text-secondary shrink-0 transition-colors"
            >
              <circle cx="8" cy="8" r="2" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" strokeLinecap="round"/>
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-bg-tertiary transition-colors group"
          >
            <div className="w-5 h-5 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3 text-text-muted">
                <circle cx="8" cy="6" r="2.5"/>
                <path d="M2 13c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">
              Sign in
            </span>
          </button>
        )}

        {/* Search hint */}
        <div className="hidden px-4 pb-3 md:block">
          <button
            onClick={openCommandPalette}
            className="text-2xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            Press{' '}
            <kbd className="font-mono bg-bg-tertiary border border-border-subtle rounded px-1 py-px text-2xs">
              {modKey}K
            </kbd>{' '}
            to search
          </button>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
