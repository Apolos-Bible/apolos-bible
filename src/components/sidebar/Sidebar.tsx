import { useState, useEffect, type ReactNode } from 'react'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { destroyEcho } from '@/lib/echo'
import { BookSelector } from './BookSelector'
import { ChapterGrid } from './ChapterGrid'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'

interface NavItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
}

function NavItem({ icon, label, active = false, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative flex items-center gap-2 w-full text-sm',
        'hover:text-text-primary hover:bg-bg-tertiary rounded px-3 py-1.5 transition-colors duration-100',
        active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary',
      )}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0 opacity-70">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-[16px] h-4 px-1 rounded-full bg-accent text-bg-primary text-2xs font-medium flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pt-3 pb-1 text-2xs font-semibold uppercase tracking-wider text-text-muted select-none">
      {children}
    </p>
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

function ChatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path d="M2.5 4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H6.5l-3 2.5v-2.5H4a1.5 1.5 0 0 1-1.5-1.5z" strokeLinejoin="round"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar() {
  const openCommandPalette = useUIStore(s => s.openCommandPalette)
  const togglePanel        = useUIStore(s => s.togglePanel)
  const openSettings       = useUIStore(s => s.openSettings)
  const openAuthModal      = useUIStore(s => s.openAuthModal)
  const closeMobileSidebar = useUIStore(s => s.closeMobileSidebar)
  const activePanel        = useUIStore(s => s.activePanel)
  const user               = useAuthStore(s => s.user)
  const startPolling  = useNotificationStore(s => s.startPolling)
  const stopPolling   = useNotificationStore(s => s.stopPolling)
  const unreadCount   = useNotificationStore(s => s.unreadCount)
  const listenForPush = useNotificationStore(s => s.listenForPush)
  const stopPush      = useNotificationStore(s => s.stopPush)
  const chatUnread    = useChatStore(s => s.conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0))

  const toggleSidebarPanel = (panel: Parameters<typeof togglePanel>[0]) => {
    togglePanel(panel)
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
      <div className="px-4 pt-3 pb-2 shrink-0">
        <span className="font-medium text-md">
          <span className="text-accent">tulia</span>
          <span className="text-text-muted">.study</span>
        </span>
      </div>

      <div className="px-2 pb-2">
        <button
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 rounded-md border border-border-subtle bg-bg-primary px-3 py-2 text-left text-sm text-text-muted transition-colors hover:text-text-secondary hover:bg-bg-tertiary"
        >
          <span className="w-4 h-4 flex items-center justify-center opacity-70">
            <SearchIcon />
          </span>
          <span className="flex-1">Search Bible</span>
          <kbd className="hidden font-mono text-2xs text-text-muted md:inline">
            {modKey}K
          </kbd>
        </button>
      </div>

      <SectionLabel>Library</SectionLabel>

      <BookSelector />

      <div className="shrink-0 border-t border-border-subtle">
        <ChapterGrid />
      </div>

      <div className="shrink-0 border-t border-border-subtle px-2 pb-2">
        <SectionLabel>Personal</SectionLabel>
        <NavItem icon={<StarIcon />}    label="Favorites" active={activePanel === 'favorites'} onClick={() => user ? toggleSidebarPanel('favorites') : openAuthModal()} />
        <NavItem icon={<NoteIcon />}    label="My Notes"  active={activePanel === 'my-notes'} onClick={() => user ? toggleSidebarPanel('my-notes')  : openAuthModal()} />
        <SectionLabel>Social</SectionLabel>
        <NavItem icon={<PeopleIcon />} label="Friends" active={activePanel === 'friends'} badge={unreadCount} onClick={() => user ? toggleSidebarPanel('friends') : openAuthModal()} />
        <NavItem icon={<ChatIcon />} label="Chat" active={activePanel === 'chat'} badge={chatUnread} onClick={() => user ? toggleSidebarPanel('chat') : openAuthModal()} />
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
            onClick={openAuthModal}
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
      </div>
    </div>
  )
}
