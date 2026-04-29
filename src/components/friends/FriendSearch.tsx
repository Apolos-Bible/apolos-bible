import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'

export function FriendSearch() {
  const { t } = useTranslation()
  const [query, setQuery]  = useState('')
  const searchUsers        = useFriendStore(s => s.searchUsers)
  const clearSearch        = useFriendStore(s => s.clearSearch)
  const results            = useFriendStore(s => s.searchResults)
  const isSearching        = useFriendStore(s => s.isSearching)
  const sendRequest        = useFriendStore(s => s.sendRequest)
  const sent               = useFriendStore(s => s.sent)
  const friends            = useFriendStore(s => s.friends)
  const addToast           = useUIStore(s => s.addToast)
  const debounce           = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchUsers(query)
      } else {
        clearSearch()
      }
    }, 300)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [query, searchUsers, clearSearch])

  const sentIds   = useMemo(() => new Set(sent.map((r) => r.friend_id)), [sent])
  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends])

  const handleSend = async (userId: number, userName: string) => {
    try {
      await sendRequest(userId)
      addToast(t('friends.requestSentTo', { name: userName }), 'success')
    } catch {
      addToast(t('friends.requestFailed'), 'error')
    }
  }

  return (
    <div className="px-3 pb-3">
      <div className="relative">
        <svg
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none"
          aria-hidden="true"
        >
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M11 11l2.5 2.5" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('friends.searchPlaceholder')}
          aria-label={t('friends.searchAria')}
          className="w-full bg-bg-tertiary border border-border-subtle rounded px-3 py-1.5 pl-7 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {isSearching && (
        <p className="text-2xs text-text-muted mt-2 px-1">{t('friends.searching')}</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {results.map((user) => {
            const isFriend  = friendIds.has(user.id)
            const isPending = sentIds.has(user.id)
            return (
              <div key={user.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-bg-tertiary transition-colors">
                <div className="w-6 h-6 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center text-2xs text-text-secondary font-medium shrink-0 select-none">
                  {(user.name.charAt(0) || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{user.name}</p>
                  <p className="text-2xs text-text-muted truncate">{user.email}</p>
                </div>
                {isFriend ? (
                  <span className="text-2xs text-text-muted shrink-0">{t('friends.alreadyFriends')}</span>
                ) : isPending ? (
                  <span className="text-2xs text-text-muted italic shrink-0">{t('friends.requestSent')}</span>
                ) : (
                  <button
                    onClick={() => handleSend(user.id, user.name)}
                    aria-label={`Send friend request to ${user.name}`}
                    className="text-2xs px-2 py-0.5 rounded border border-border-subtle text-text-secondary hover:text-accent hover:border-accent transition-colors shrink-0"
                  >
                    {t('friends.add')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {query.trim().length >= 2 && !isSearching && results.length === 0 && (
        <p className="text-2xs text-text-muted mt-2 px-1">{t('friends.noUsersFound')}</p>
      )}
    </div>
  )
}
