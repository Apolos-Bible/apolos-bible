import { useTranslation } from 'react-i18next'
import type { Friend } from '@/types'

interface FriendCardProps {
  friend: Friend
  onRemove: () => void
}

export function FriendCard({ friend, onRemove }: FriendCardProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-bg-tertiary group transition-colors">
      <div className="w-7 h-7 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0 text-2xs text-text-secondary font-medium select-none">
        {(friend.name.charAt(0) || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary truncate">{friend.name}</p>
        <p className="text-2xs text-text-muted truncate">{friend.email}</p>
      </div>
      <button
        onClick={onRemove}
        aria-label={t('friends.removeAria', { name: friend.name })}
        title={t('friends.removeTitle')}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-text-muted hover:text-red-400 focus-visible:text-red-400 p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <path d="M3 8h10" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
