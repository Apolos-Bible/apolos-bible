import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { RemoveFriendDialog } from '@/components/friends/RemoveFriendDialog'
import { MessageCircle } from 'lucide-react'
import { paths } from '@/router/paths'
import type { Friend } from '@/types'

interface FriendCardProps {
  friend: Friend
  onRemove: () => void
  onMessage?: () => void
}

export function FriendCard({ friend, onRemove, onMessage }: FriendCardProps) {
  const { t } = useTranslation()
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  return (
    <div className="flex items-center gap-3 md:gap-2.5 px-3 py-3 md:py-2 rounded hover:bg-bg-tertiary group transition-colors">
      <Link
        to={paths.userProfile(friend.id)}
        className="flex flex-1 min-w-0 items-center gap-3 md:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
      >
        <UserAvatar name={friend.name} email={friend.email} src={friend.avatar_url} size="md" className="w-10 h-10 md:w-7 md:h-7" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] md:text-xs text-text-primary truncate">{friend.name}</p>
          <p className="text-xs md:text-2xs text-text-muted truncate">{friend.email}</p>
        </div>
      </Link>
      {onMessage && (
        <button
          type="button"
          onClick={onMessage}
          aria-label={t('friends.messageAria', { name: friend.name })}
          title={t('friends.messageTitle')}
          className="inline-flex h-10 w-10 md:h-7 md:w-7 items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-bg-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <MessageCircle aria-hidden="true" className="w-5 h-5 md:w-3.5 md:h-3.5" strokeWidth={1.75} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setConfirmingRemove(true)}
        aria-label={t('friends.removeAria', { name: friend.name })}
        title={t('friends.removeTitle')}
        className="inline-flex h-10 w-10 md:h-auto md:w-auto items-center justify-center md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity text-text-muted hover:text-red-400 focus-visible:text-red-400 md:p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 md:w-3.5 md:h-3.5">
          <path d="M3 8h10" strokeLinecap="round" />
        </svg>
      </button>

      <RemoveFriendDialog
        open={confirmingRemove}
        friendName={friend.name}
        onClose={() => setConfirmingRemove(false)}
        onConfirm={() => {
          setConfirmingRemove(false)
          onRemove()
        }}
      />
    </div>
  )
}
