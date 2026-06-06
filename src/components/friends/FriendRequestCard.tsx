import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { paths } from '@/router/paths'
import type { FriendRequest } from '@/types'

interface FriendRequestCardProps {
  request: FriendRequest
  variant: 'received' | 'sent'
  onAccept?: (id: number) => void
  onDecline: (id: number) => void
}

export function FriendRequestCard({ request, variant, onAccept = () => {}, onDecline }: FriendRequestCardProps) {
  const { t } = useTranslation()
  const person = variant === 'received' ? request.user : request.friend
  if (!person) return null

  return (
    <div className="flex items-center gap-3 md:gap-2.5 px-3 py-3 md:py-2 rounded bg-bg-secondary border border-border-subtle">
      <Link
        to={paths.userProfile(person.id)}
        className="flex flex-1 min-w-0 items-center gap-3 md:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded"
      >
        <UserAvatar name={person.name} email={person.email} src={person.avatar_url} size="md" className="w-10 h-10 md:w-7 md:h-7" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] md:text-xs text-text-primary truncate">{person.name}</p>
          <p className="text-xs md:text-2xs text-text-muted truncate">{person.email}</p>
        </div>
      </Link>
      {variant === 'received' && (
        <div className="flex gap-1.5 md:gap-1 shrink-0">
          <button
            onClick={() => onAccept(request.id)}
            className="text-sm md:text-2xs h-9 md:h-auto px-3 md:px-2 md:py-0.5 rounded bg-accent text-bg-primary hover:opacity-80 transition-opacity font-medium"
          >
            {t('friends.accept')}
          </button>
          <button
            onClick={() => onDecline(request.id)}
            className="text-sm md:text-2xs h-9 md:h-auto px-3 md:px-2 md:py-0.5 rounded border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
          >
            {t('friends.decline')}
          </button>
        </div>
      )}
      {variant === 'sent' && (
        <span className="text-xs md:text-2xs text-text-muted italic shrink-0">{t('friends.pending')}</span>
      )}
    </div>
  )
}
