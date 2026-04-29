import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { FriendCard } from './FriendCard'
import { FriendRequestCard } from './FriendRequestCard'
import { FriendSearch } from './FriendSearch'
import type { Friend } from '@/types'

const UNDO_DURATION = 4000

export function FriendsPanel() {
  const { t } = useTranslation()

  const friends        = useFriendStore(s => s.friends)
  const received       = useFriendStore(s => s.received)
  const sent           = useFriendStore(s => s.sent)
  const load           = useFriendStore(s => s.load)
  const acceptRequest  = useFriendStore(s => s.acceptRequest)
  const declineRequest = useFriendStore(s => s.declineRequest)
  const removeFriend   = useFriendStore(s => s.removeFriend)
  const closePanel     = useUIStore(s => s.closePanel)
  const addToast       = useUIStore(s => s.addToast)
  const removeToast    = useUIStore(s => s.removeToast)

  const pendingRef = useRef<Map<number, { friend: Friend; timerId: ReturnType<typeof setTimeout> }>>(new Map())
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())

  useEffect(() => { load() }, [load])

  const handleAccept = async (id: number) => {
    try {
      await acceptRequest(id)
      addToast(t('friends.requestAccepted'), 'success')
    } catch {
      addToast(t('friends.acceptFailed'), 'error')
    }
  }

  const handleDecline = async (id: number) => {
    try {
      await declineRequest(id)
    } catch {
      addToast(t('friends.declineFailed'), 'error')
    }
  }

  const handleRemove = (friend: Friend) => {
    pendingRef.current.set(friend.id, {
      friend,
      timerId: setTimeout(async () => {
        pendingRef.current.delete(friend.id)
        setPendingIds(new Set(pendingRef.current.keys()))
        try {
          await removeFriend(friend.id)
        } catch {
          addToast(t('friends.removeFailed'), 'error')
        }
      }, UNDO_DURATION),
    })
    setPendingIds(new Set(pendingRef.current.keys()))

    const toastId = addToast(t('friends.removed', { name: friend.name }), 'info', {
      duration: UNDO_DURATION,
      action: {
        label: t('common.undo'),
        onClick: () => {
          const pending = pendingRef.current.get(friend.id)
          if (!pending) return
          clearTimeout(pending.timerId)
          pendingRef.current.delete(friend.id)
          setPendingIds(new Set(pendingRef.current.keys()))
          removeToast(toastId)
        },
      },
    })
  }

  return (
    <div className="w-full md:w-panel h-full bg-bg-primary border-r border-border-subtle flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <span className="text-sm font-medium text-text-primary">{t('friends.title')}</span>
        <button
          onClick={closePanel}
          aria-label="Close friends panel"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="pt-3 pb-2">
          <p className="text-2xs uppercase tracking-wider text-text-muted px-4 pb-2 select-none">{t('friends.addPeople')}</p>
          <FriendSearch />
        </div>

        {/* Received requests */}
        {received.length > 0 && (
          <div className="border-t border-border-subtle pt-3 pb-2">
            <p className="text-2xs uppercase tracking-wider text-text-muted px-4 pb-2 select-none">
              {t('friends.requests', { count: received.length })}
            </p>
            <div className="flex flex-col gap-1 px-2">
              {received.map((req) => (
                <FriendRequestCard
                  key={req.id}
                  request={req}
                  variant="received"
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sent requests */}
        {sent.length > 0 && (
          <div className="border-t border-border-subtle pt-3 pb-2">
            <p className="text-2xs uppercase tracking-wider text-text-muted px-4 pb-2 select-none">{t('friends.sent')}</p>
            <div className="flex flex-col gap-1 px-2">
              {sent.map((req) => (
                <FriendRequestCard
                  key={req.id}
                  request={req}
                  variant="sent"
                  onDecline={handleDecline}
                />
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="border-t border-border-subtle pt-3 pb-4">
          <p className="text-2xs uppercase tracking-wider text-text-muted px-4 pb-2 select-none">
            {friends.length > 0 ? t('friends.friendsCount', { count: friends.length }) : t('friends.title')}
          </p>
          {friends.length === 0 ? (
            <p className="text-xs text-text-muted px-4">{t('friends.empty')}</p>
          ) : (
            <div className="flex flex-col gap-0.5 px-2">
              {friends.filter(f => !pendingIds.has(f.id)).map((friend) => (
                <FriendCard key={friend.id} friend={friend} onRemove={() => handleRemove(friend)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
