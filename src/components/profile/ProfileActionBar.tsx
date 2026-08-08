import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Ban, MessageSquare, Pencil, Share2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { paths } from '@/router/paths'
import type { FriendshipStatus, ProfileMode } from '@/types'

const PRIMARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
const GHOST =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border-subtle px-4 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'

export interface ProfileActionBarProps {
  mode: ProfileMode
  status: FriendshipStatus
  busy?: boolean
  onAdd: () => void
  onCancel: () => void
  onAccept: () => void
  onDecline: () => void
  onRemove: () => void
  onMessage: () => void
  onBlock: () => void
  onUnblock: () => void
  onShare: () => void
}

export function ProfileActionBar({
  mode,
  status,
  busy,
  onAdd,
  onCancel,
  onAccept,
  onDecline,
  onRemove,
  onMessage,
  onBlock,
  onUnblock,
  onShare,
}: ProfileActionBarProps) {
  const { t } = useTranslation()

  if (mode === 'self') {
    return (
      <div className="workspace-profile-actions mt-4 flex flex-wrap justify-center md:justify-start gap-2">
        <Link to={`${paths.settings()}#cuenta`} className={PRIMARY}>
          <Pencil size={14} strokeWidth={1.5} />
          {t('perfil.editProfile')}
        </Link>
        <button type="button" onClick={onShare} className={GHOST}>
          <Share2 size={14} strokeWidth={1.5} />
          {t('perfil.share')}
        </button>
      </div>
    )
  }

  let content: React.ReactNode = null

  if (status === 'blocked') {
    return (
      <div className="workspace-profile-actions mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
        <button type="button" className={GHOST} disabled={busy} onClick={onUnblock}>
          {t('friend.unblock')}
        </button>
      </div>
    )
  }

  switch (status) {
    case 'none':
      content = (
        <button type="button" className={PRIMARY} disabled={busy} onClick={onAdd}>
          <UserPlus size={14} strokeWidth={1.5} />
          {t('friend.add')}
        </button>
      )
      break
    case 'pending_sent':
      content = (
        <button type="button" className={GHOST} disabled={busy} onClick={onCancel}>
          {t('friend.requestSent')}
          <span className="text-text-muted">· {t('friend.cancel')}</span>
        </button>
      )
      break
    case 'pending_received':
      content = (
        <>
          <button type="button" className={PRIMARY} disabled={busy} onClick={onAccept}>
            {t('friend.accept')}
          </button>
          <button type="button" className={GHOST} disabled={busy} onClick={onDecline}>
            {t('friend.decline')}
          </button>
        </>
      )
      break
    case 'accepted':
      content = (
        <>
          <button type="button" className={PRIMARY} disabled={busy} onClick={onMessage}>
            <MessageSquare size={14} strokeWidth={1.5} />
            {t('friend.message')}
          </button>
          <button
            type="button"
            className={cn(GHOST, 'hover:text-red-400 hover:border-red-400/40')}
            disabled={busy}
            onClick={onRemove}
          >
            {t('friend.remove')}
          </button>
        </>
      )
      break
    default:
      // 'blocked_by_them' / 'self' → no actions here
      content = null
  }

  if (!content) return null

  return (
    <div className="workspace-profile-actions mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
      {content}
      <button
        type="button"
        className={cn(GHOST, 'hover:border-red-400/40 hover:text-red-400')}
        disabled={busy}
        onClick={onBlock}
      >
        <Ban size={14} strokeWidth={1.5} />
        {t('friend.block')}
      </button>
    </div>
  )
}
