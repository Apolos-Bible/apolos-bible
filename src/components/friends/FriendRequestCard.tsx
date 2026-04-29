import { useTranslation } from 'react-i18next'
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
    <div className="flex items-center gap-2.5 px-3 py-2 rounded bg-bg-secondary border border-border-subtle">
      <div className="w-7 h-7 rounded-full bg-bg-tertiary border border-border-subtle flex items-center justify-center shrink-0 text-2xs text-text-secondary font-medium select-none">
        {(person.name.charAt(0) || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary truncate">{person.name}</p>
        <p className="text-2xs text-text-muted truncate">{person.email}</p>
      </div>
      {variant === 'received' && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onAccept(request.id)}
            className="text-2xs px-2 py-0.5 rounded bg-accent text-bg-primary hover:opacity-80 transition-opacity font-medium"
          >
            {t('friends.accept')}
          </button>
          <button
            onClick={() => onDecline(request.id)}
            className="text-2xs px-2 py-0.5 rounded border border-border-subtle text-text-muted hover:text-text-primary transition-colors"
          >
            {t('friends.decline')}
          </button>
        </div>
      )}
      {variant === 'sent' && (
        <span className="text-2xs text-text-muted italic shrink-0">{t('friends.pending')}</span>
      )}
    </div>
  )
}
