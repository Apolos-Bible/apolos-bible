import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/lib/store/useChatStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import type { Conversation } from '@/lib/chatApi'

interface ManageConversationDialogProps {
  conversation: Conversation
  open: boolean
  onClose: () => void
}

export function ManageConversationDialog({ conversation, open, onClose }: ManageConversationDialogProps) {
  const { t }           = useTranslation()
  const friends         = useFriendStore(s => s.friends)
  const loadFriends     = useFriendStore(s => s.load)
  const addParticipants = useChatStore(s => s.addParticipants)
  const leave           = useChatStore(s => s.leave)
  const addToast        = useUIStore(s => s.addToast)

  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void loadFriends()
    setQuery('')
    setPicked([])
  }, [open, loadFriends])

  const existingIds = useMemo(
    () => new Set(conversation.participants.map((p) => p.id)),
    [conversation.participants],
  )

  const availableFriends = useMemo(() => {
    const q = query.trim().toLowerCase()
    return friends
      .filter((f) => !existingIds.has(f.id))
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q))
  }, [friends, existingIds, query])

  if (!open) return null

  const togglePick = (id: number) => {
    setPicked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleAdd = async () => {
    if (busy || picked.length === 0) return
    setBusy(true)
    try {
      await addParticipants(conversation.id, picked)
      addToast(t('chat.participantsAdded'), 'success')
      onClose()
    } catch {
      addToast(t('chat.addParticipantsFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleLeave = async () => {
    if (busy) return
    setBusy(true)
    try {
      await leave(conversation.id)
      addToast(t('chat.leftGroup'), 'info')
      onClose()
    } catch {
      addToast(t('chat.leaveGroupFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div>
            <p className="text-sm font-medium text-text-primary">{t('chat.manageGroup')}</p>
            <p className="text-2xs text-text-muted mt-0.5">{conversation.name ?? t('chat.groupChat')}</p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-2xs uppercase tracking-wider text-text-muted mb-2">{t('chat.members')}</p>
          <div className="flex flex-wrap gap-2">
            {conversation.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-full bg-bg-primary border border-border-subtle px-2.5 py-1">
                <UserAvatar email={p.email} size="sm" />
                <span className="text-xs text-text-primary">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border-subtle">
          <p className="text-2xs uppercase tracking-wider text-text-muted mb-2">{t('chat.addFriends')}</p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.searchFriendsPlaceholder')}
            className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-hover"
          />
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {availableFriends.length === 0 ? (
            <p className="text-xs text-text-muted px-4 py-6 text-center">{t('chat.noFriendsToAdd')}</p>
          ) : (
            availableFriends.map((friend) => {
              const isPicked = picked.includes(friend.id)
              return (
                <button
                  key={friend.id}
                  onClick={() => togglePick(friend.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-2 transition-colors text-left',
                    isPicked ? 'bg-bg-tertiary' : 'hover:bg-bg-primary',
                  )}
                >
                  <UserAvatar email={friend.email} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{friend.name}</p>
                    <p className="text-2xs text-text-muted truncate">{friend.email}</p>
                  </div>
                  <span className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    isPicked ? 'bg-accent border-accent text-bg-primary' : 'border-border-subtle',
                  )}>
                    {isPicked && (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border-subtle">
          <button
            onClick={() => { void handleLeave() }}
            disabled={busy}
            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5"
          >
            {t('chat.leaveGroup')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
            >
              {t('notes.cancel')}
            </button>
            <button
              onClick={() => { void handleAdd() }}
              disabled={picked.length === 0 || busy}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                picked.length > 0 && !busy
                  ? 'bg-accent text-bg-primary hover:brightness-110'
                  : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
              )}
            >
              {t('chat.addPeople')}{picked.length > 0 ? ` (${picked.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
