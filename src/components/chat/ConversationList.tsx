import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import type { Conversation } from '@/lib/chatApi'

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)         return i18n.t('time.now_short')
  if (diff < 3600_000)       return i18n.t('time.m_short', { count: Math.floor(diff / 60_000) })
  if (diff < 86_400_000)     return i18n.t('time.h_short', { count: Math.floor(diff / 3600_000) })
  if (diff < 7 * 86_400_000) return i18n.t('time.d_short', { count: Math.floor(diff / 86_400_000) })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function conversationTitle(c: Conversation, selfId: number | undefined): string {
  if (c.type === 'group') return c.name ?? c.participants.map(p => p.name).join(', ')
  const other = c.participants.find(p => p.id !== selfId)
  return other?.name ?? i18n.t('chat.directMessage')
}

function conversationAvatarEmail(c: Conversation, selfId: number | undefined): string {
  const other = c.participants.find(p => p.id !== selfId)
  return other?.email ?? c.participants[0]?.email ?? '?'
}

export function ConversationList() {
  const { t }        = useTranslation()
  const conversations = useChatStore(s => s.conversations)
  const selectedId    = useChatStore(s => s.selectedId)
  const select        = useChatStore(s => s.select)
  const loading       = useChatStore(s => s.loadingList)
  const selfId        = useAuthStore(s => s.user?.id)

  if (loading && conversations.length === 0) {
    return <p className="text-xs text-text-muted px-4 py-6">{t('common.loading')}</p>
  }

  if (conversations.length === 0) {
    return (
      <p className="text-xs text-text-muted px-4 py-6">
        {t('chat.conversationsEmpty')}
      </p>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {conversations.map((c) => {
        const isActive = c.id === selectedId
        const title    = conversationTitle(c, selfId)
        const isGroup  = c.type === 'group'
        const last     = c.last_message
        const preview  = last
          ? `${last.user_id === selfId ? t('chat.youPrefix') : isGroup && last.user_name ? `${last.user_name}: ` : ''}${last.body}`
          : t('chat.noMessagesPreview')

        return (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            className={cn(
              'w-full text-left px-3 py-2.5 flex gap-2.5 items-start transition-colors',
              isActive
                ? 'bg-bg-tertiary'
                : 'hover:bg-bg-secondary',
            )}
          >
            {isGroup ? (
              <span className="w-7 h-7 rounded-full bg-bg-tertiary border border-border-subtle text-text-secondary text-2xs font-medium flex items-center justify-center shrink-0">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <circle cx="6" cy="6" r="2.2"/>
                  <path d="M2 13c0-2.4 1.8-3.7 4-3.7s4 1.3 4 3.7" strokeLinecap="round"/>
                  <circle cx="11.5" cy="6" r="1.5"/>
                  <path d="M11.5 9.5c1.5.2 3 1.1 3 3.5" strokeLinecap="round"/>
                </svg>
              </span>
            ) : (
              <UserAvatar email={conversationAvatarEmail(c, selfId)} size="md" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  'text-sm truncate',
                  c.unread_count > 0 ? 'font-semibold text-text-primary' : 'font-medium text-text-primary',
                )}>
                  {title}
                </span>
                <span className="text-2xs text-text-muted shrink-0">{relativeTime(c.last_message_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className={cn(
                  'text-xs truncate',
                  c.unread_count > 0 ? 'text-text-secondary' : 'text-text-muted',
                )}>
                  {preview}
                </span>
                {c.unread_count > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-accent text-bg-primary text-2xs font-medium flex items-center justify-center shrink-0">
                    {c.unread_count > 9 ? '9+' : c.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
