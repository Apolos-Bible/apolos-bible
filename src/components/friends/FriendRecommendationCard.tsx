import { UserMinus, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { paths } from '@/router/paths'
import type { Friend } from '@/types'

type FriendRecommendationCardProps = {
  friend: Friend
  pending?: boolean
  onAdd: () => void
  onDismiss: () => void
}

export function FriendRecommendationCard({ friend, pending = false, onAdd, onDismiss }: FriendRecommendationCardProps) {
  const { t } = useTranslation()

  return (
    <article className="group relative flex min-w-0 flex-col items-center overflow-hidden rounded-xl border border-border-subtle bg-bg-primary p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <Link
        to={paths.userProfile(friend.id)}
        aria-label={t('friends.openProfile', { name: friend.name })}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      />

      <div className="pointer-events-none flex min-w-0 flex-1 flex-col items-center">
        <UserAvatar
          name={friend.name}
          email={friend.email}
          src={friend.avatar_url}
          size="2xl"
          className="h-20 w-20 ring-2 ring-border-subtle transition group-hover:ring-accent/40"
        />
        <span className="mt-2 w-full truncate text-sm font-semibold text-text-primary">{friend.name}</span>
      </div>

      <div className="relative z-10 mt-3 grid w-full gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={onAdd}
          aria-label={t('friends.sendRequestTo', { name: friend.name })}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-accent px-2.5 py-2 text-xs font-semibold text-bg-primary transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {t('friends.add')}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDismiss}
          aria-label={t('friends.dismissRecommendationAria', { name: friend.name })}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-bg-tertiary px-2.5 py-2 text-xs font-medium text-text-secondary transition hover:bg-border-subtle hover:text-text-primary disabled:cursor-wait disabled:opacity-60"
        >
          <UserMinus className="h-3.5 w-3.5" />
          {t('friends.dismissRecommendation')}
        </button>
      </div>
    </article>
  )
}
