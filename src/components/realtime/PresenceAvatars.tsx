import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { PresenceUser } from '@/types'
import { cn } from '@/lib/cn'
import { useChatStore } from '@/lib/store/useChatStore'
import { useUIStore } from '@/lib/store/useUIStore'

interface PresenceAvatarsProps {
  users: PresenceUser[]
}

const MAX_VISIBLE = 3
const TOOLTIP_WIDTH = 176 // w-44
const TOOLTIP_HEIGHT = 130 // approximate
const GAP = 8

interface TooltipPos { top: number; left: number }

function UserTooltip({
  user, anchor, closing, onClose, onMouseEnter, onMouseLeave,
}: {
  user: PresenceUser
  anchor: DOMRect
  closing: boolean
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const { t }   = useTranslation()
  const startDm   = useChatStore(s => s.startDm)
  const openPanel = useUIStore(s => s.openPanel)
  const select    = useChatStore(s => s.select)

  async function handleMessage() {
    const convo = await startDm(user.id)
    openPanel('chat')
    select(convo.id)
    onClose()
  }

  const pos: TooltipPos = {
    top:  anchor.bottom + GAP,
    left: Math.min(
      Math.max(anchor.left + anchor.width / 2 - TOOLTIP_WIDTH / 2, 8),
      window.innerWidth - TOOLTIP_WIDTH - 8,
    ),
  }

  const fitsBelow = pos.top + TOOLTIP_HEIGHT < window.innerHeight
  if (!fitsBelow) {
    pos.top = anchor.top - TOOLTIP_HEIGHT - GAP
  }

  return createPortal(
    <div
      style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
      className={`fixed z-[9999] bg-bg-secondary border border-border-subtle rounded-lg shadow-lg
                 flex flex-col items-center gap-2 p-3 pointer-events-auto
                 ${closing ? 'tooltip-exit' : 'tooltip-enter'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span
        style={{ backgroundColor: user.color + '33', color: user.color, borderColor: user.color + '66' }}
        className="w-10 h-10 rounded-full text-base font-semibold flex items-center justify-center ring-1"
      >
        {user.name.charAt(0).toUpperCase()}
      </span>
      <p className="text-xs font-medium text-text-primary text-center leading-tight">{user.name}</p>
      <button
        onClick={handleMessage}
        className="w-full text-2xs py-1 px-2 rounded bg-bg-tertiary hover:bg-border-subtle
                   text-text-secondary hover:text-text-primary transition-colors"
      >
        {t('presence.message')}
      </button>
    </div>,
    document.body,
  )
}

export function PresenceAvatars({ users }: PresenceAvatarsProps) {
  const { t } = useTranslation()

  if (users.length === 0) return null

  const [hovered,  setHovered]  = useState<{ id: number; rect: DOMRect } | null>(null)
  const [closing,  setClosing]  = useState(false)
  const leaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function dismiss() {
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      setHovered(null)
      setClosing(false)
    }, 100)
  }

  // Close on scroll/resize
  useEffect(() => {
    if (!hovered) return
    const close = () => dismiss()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [hovered])

  const visible  = users.slice(0, MAX_VISIBLE)
  const overflow = users.length - MAX_VISIBLE
  const label    = users.map((u) => u.name).join(', ') + t('presence.readingChapter')

  function enterUser(id: number, e: React.MouseEvent<HTMLDivElement>) {
    if (leaveTimer.current)  clearTimeout(leaveTimer.current)
    if (closeTimer.current)  clearTimeout(closeTimer.current)
    setClosing(false)
    setHovered({ id, rect: e.currentTarget.getBoundingClientRect() })
  }

  function leaveUser() {
    leaveTimer.current = setTimeout(() => dismiss(), 350)
  }

  function keepOpen() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
  }

  return (
    <div className="flex items-center -space-x-1" aria-label={label}>
      {visible.map((user) => (
        <div
          key={user.id}
          className="relative"
          onMouseEnter={(e) => enterUser(user.id, e)}
          onMouseLeave={leaveUser}
        >
          <span
            style={{
              backgroundColor: user.color + '33',
              color:           user.color,
              borderColor:     user.color + '66',
            }}
            className={cn(
              'w-5 h-5 rounded-full text-2xs font-medium flex items-center justify-center shrink-0',
              'ring-1 ring-bg-primary border select-none cursor-default',
            )}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            'w-5 h-5 text-2xs bg-bg-tertiary text-text-muted rounded-full font-medium',
            'flex items-center justify-center shrink-0 ring-1 ring-bg-primary',
          )}
          title={t('presence.more', { count: overflow })}
        >
          +{overflow}
        </span>
      )}

      {hovered && (() => {
        const user = users.find(u => u.id === hovered.id)
        if (!user) return null
        return (
          <UserTooltip
            user={user}
            anchor={hovered.rect}
            closing={closing}
            onClose={dismiss}
            onMouseEnter={keepOpen}
            onMouseLeave={leaveUser}
          />
        )
      })()}
    </div>
  )
}
