import { useTranslation } from 'react-i18next'
import { Plus, UsersRound } from 'lucide-react'
import i18n from '@/lib/i18n'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import type { Conversation } from '@/lib/chatApi'

interface ConversationListProps {
  onNewChat?: () => void
}

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

export function ConversationList({ onNewChat }: ConversationListProps = {}) {
  const { t }        = useTranslation()
  const conversations = useChatStore(s => s.conversations)
  const selectedId    = useChatStore(s => s.selectedId)
  const select        = useChatStore(s => s.select)
  const loading       = useChatStore(s => s.loadingList)
  const selfId        = useAuthStore(s => s.user?.id)

  if (loading && conversations.length === 0) {
    return <p className="text-sm md:text-xs text-text-muted px-4 py-6">{t('common.loading')}</p>
  }

  if (conversations.length === 0) {
    return (
      <>
        {/* Mobile: editorial empty state */}
        <div className="md:hidden flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-7 h-7" aria-hidden="true">
              <path d="M4 6.5C4 5.7 4.7 5 5.5 5h13c.8 0 1.5.7 1.5 1.5v8c0 .8-.7 1.5-1.5 1.5H10l-4 3.5v-3.5h-.5C4.7 16 4 15.3 4 14.5v-8z" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-reading italic text-xl text-text-primary mb-2">
            {t('chat.empty.headline')}
          </h2>
          <p className="text-[15px] leading-relaxed text-text-muted max-w-[18rem]">
            {t('chat.empty.body')}
          </p>
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              className="mt-8 inline-flex items-center gap-2 h-12 px-5 rounded-full bg-accent text-bg-primary text-[15px] font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              {t('chat.empty.cta')}
            </button>
          )}
        </div>
        {/* Desktop: keep existing minimal note */}
        <p className="hidden md:block text-xs text-text-muted px-4 py-6">
          {t('chat.conversationsEmpty')}
        </p>
      </>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto md:py-1">
      {conversations.map((c) => {
        const isActive = c.id === selectedId
        const title    = conversationTitle(c, selfId)
        const isGroup  = c.type === 'group'
        const last     = c.last_message
        const noPreview = !last
        const preview  = last
          ? `${last.user_id === selfId ? t('chat.youPrefix') : isGroup && last.user_name ? `${last.user_name}: ` : ''}${last.body}`
          : t('chat.noMessagesPreview')
        const isUnread = c.unread_count > 0

        return (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            className={cn(
              'group relative w-full text-left flex gap-3 md:gap-2.5 items-center md:items-start transition-colors',
              'px-4 md:px-3 py-3 md:py-2.5',
              'md:rounded-none',
              isActive
                ? 'bg-bg-tertiary'
                : isUnread
                  ? 'active:bg-bg-tertiary/60 md:hover:bg-bg-secondary'
                  : 'active:bg-bg-tertiary/40 md:hover:bg-bg-secondary',
            )}
          >
            {/* Unread accent rail (mobile only) */}
            {isUnread && (
              <span
                aria-hidden="true"
                className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-r-full bg-accent"
              />
            )}

            {/* Avatar */}
            <span className="relative shrink-0">
              {isGroup ? (
                <span className="w-14 h-14 md:w-7 md:h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <UsersRound className="w-6 h-6 md:w-3.5 md:h-3.5" strokeWidth={1.75} />
                </span>
              ) : (
                <UserAvatar
                  email={conversationAvatarEmail(c, selfId)}
                  size="md"
                  className="w-14 h-14 text-lg md:w-7 md:h-7 md:text-xs"
                />
              )}
              {/* Subtle accent ring on unread */}
              {isUnread && (
                <span
                  aria-hidden="true"
                  className="md:hidden absolute inset-0 rounded-full ring-2 ring-accent/40"
                />
              )}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn(
                  'truncate',
                  'text-[15px] md:text-sm',
                  isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-primary',
                )}>
                  {title}
                </span>
                <span className={cn(
                  'shrink-0 tabular-nums',
                  'text-xs md:text-2xs',
                  isUnread ? 'text-accent md:text-text-muted' : 'text-text-muted',
                )}>
                  {relativeTime(c.last_message_at)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1 md:mt-0.5">
                <span className={cn(
                  'truncate',
                  'text-sm md:text-xs',
                  noPreview && 'italic',
                  isUnread ? 'text-text-secondary' : 'text-text-muted',
                )}>
                  {preview}
                </span>
                {isUnread && (
                  <>
                    {/* Mobile: a single dot (or small pill for >9). Quiet but legible. */}
                    <span className="md:hidden shrink-0 inline-flex items-center justify-center">
                      {c.unread_count > 9 ? (
                        <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-accent text-bg-secondary text-[11px] font-semibold tabular-nums flex items-center justify-center">
                          9+
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-accent" />
                      )}
                    </span>
                    {/* Desktop unchanged: tiny pill */}
                    <span className="hidden md:flex min-w-[16px] h-4 px-1 rounded-full bg-accent text-bg-primary text-2xs font-medium items-center justify-center shrink-0">
                      {c.unread_count > 9 ? '9+' : c.unread_count}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
