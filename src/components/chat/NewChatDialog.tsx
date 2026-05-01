import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChatStore } from '@/lib/store/useChatStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'

interface NewChatDialogProps {
  open: boolean
  onClose: () => void
}

export function NewChatDialog({ open, onClose }: NewChatDialogProps) {
  const { t }       = useTranslation()
  const friends     = useFriendStore(s => s.friends)
  const loadFriends = useFriendStore(s => s.load)
  const startDm     = useChatStore(s => s.startDm)
  const createGroup = useChatStore(s => s.createGroup)
  const select      = useChatStore(s => s.select)
  const addToast    = useUIStore(s => s.addToast)

  const [mode, setMode]       = useState<'dm' | 'group'>('dm')
  const [query, setQuery]     = useState('')
  const [picked, setPicked]   = useState<number[]>([])
  const [name, setName]       = useState('')
  const [busy, setBusy]       = useState(false)

  useEffect(() => {
    if (!open) return
    loadFriends()
    setMode('dm')
    setQuery('')
    setPicked([])
    setName('')
  }, [open, loadFriends])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(f => f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q))
  }, [friends, query])

  if (!open) return null

  const togglePick = (id: number) => {
    if (mode === 'dm') {
      setPicked([id])
    } else {
      setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
  }

  const submit = async () => {
    if (busy) return
    if (mode === 'dm' && picked.length !== 1) return
    if (mode === 'group' && picked.length < 2) return

    setBusy(true)
    try {
      const c = mode === 'dm'
        ? await startDm(picked[0])
        : await createGroup(name.trim() || t('chat.newGroupFallback'), picked)
      select(c.id)
      onClose()
    } catch {
      addToast(t('chat.createFailed'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = mode === 'dm' ? picked.length === 1 : picked.length >= 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-bg-secondary border border-border-subtle rounded-xl shadow-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="text-sm font-medium text-text-primary">{t('chat.newConversation')}</span>
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

        {/* Mode tabs */}
        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => { setMode('dm'); setPicked([]) }}
            className={cn(
              'flex-1 text-xs py-2 transition-colors',
              mode === 'dm' ? 'text-text-primary border-b border-accent -mb-px' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {t('chat.directMessage')}
          </button>
          <button
            onClick={() => { setMode('group'); setPicked([]) }}
            className={cn(
              'flex-1 text-xs py-2 transition-colors',
              mode === 'group' ? 'text-text-primary border-b border-accent -mb-px' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {t('chat.group')}
          </button>
        </div>

        {mode === 'group' && (
          <div className="px-4 py-3 border-b border-border-subtle">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('chat.groupNamePlaceholder')}
              className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-hover"
            />
          </div>
        )}

        <div className="px-4 py-3 border-b border-border-subtle">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.searchFriendsPlaceholder')}
            className="w-full bg-bg-primary border border-border-subtle rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-hover"
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-text-muted px-4 py-6 text-center">
              {friends.length === 0 ? t('chat.addFriendsFirst') : t('chat.noMatches')}
            </p>
          ) : (
            filtered.map((f) => {
              const isPicked = picked.includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => togglePick(f.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-2 transition-colors text-left',
                    isPicked ? 'bg-bg-tertiary' : 'hover:bg-bg-primary',
                  )}
                >
                  <UserAvatar email={f.email} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{f.name}</p>
                    <p className="text-2xs text-text-muted truncate">{f.email}</p>
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

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle">
          <button
            onClick={onClose}
            className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
          >
            {t('notes.cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className={cn(
              'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
              canSubmit && !busy
                ? 'bg-accent text-bg-primary hover:brightness-110'
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
            )}
          >
            {mode === 'dm' ? t('chat.startChat') : `${t('chat.createGroup')}${picked.length >= 2 ? ` (${picked.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
