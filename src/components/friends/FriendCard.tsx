import { useTranslation } from 'react-i18next'
import type { Friend } from '@/types'

interface FriendCardProps {
  friend: Friend
  onRemove: () => void
}

export function FriendCard({ friend, onRemove }: FriendCardProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 md:gap-2.5 px-3 py-3 md:py-2 rounded hover:bg-bg-tertiary group transition-colors">
      <div className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0 text-sm md:text-2xs text-text-secondary font-medium select-none">
        {(friend.name.charAt(0) || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] md:text-xs text-text-primary truncate">{friend.name}</p>
        <p className="text-xs md:text-2xs text-text-muted truncate">{friend.email}</p>
      </div>
      <button
        onClick={onRemove}
        aria-label={t('friends.removeAria', { name: friend.name })}
        title={t('friends.removeTitle')}
        className="inline-flex h-10 w-10 md:h-auto md:w-auto items-center justify-center md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity text-text-muted hover:text-red-400 focus-visible:text-red-400 md:p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 md:w-3.5 md:h-3.5">
          <path d="M3 8h10" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
