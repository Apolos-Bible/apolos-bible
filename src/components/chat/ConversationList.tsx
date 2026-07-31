import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import i18n from '@/lib/i18n'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { ConversationAvatar } from '@/components/chat/ConversationAvatar'
import { cn } from '@/lib/cn'
import type { Conversation } from '@/lib/chatApi'

interface ConversationListProps {
  onNewChat?: () => void
  onSelect?: (conversation: Conversation) => void
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

export function ConversationList({ onNewChat, onSelect }: ConversationListProps = {}) {
  const { t }        = useTranslation()
  const conversations = useChatStore(s => s.conversations)
  const selectedId    = useChatStore(s => s.selectedId)
  const select        = useChatStore(s => s.select)
  const loading       = useChatStore(s => s.loadingList)
  const selfId        = useAuthStore(s => s.user?.id)

  if (loading && conversations.length === 0) {
    return <p className="workspace-chat-loading text-sm md:text-xs text-text-muted px-4 py-6">{t('common.loading')}</p>
  }

  if (conversations.length === 0) {
    return (
      <>
        {/* Mobile: editorial empty state */}
        <div className="workspace-chat-empty-rich md:hidden flex-1 flex flex-col items-center justify-center px-8 text-center">
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
        <p className="workspace-chat-empty-compact hidden md:block text-xs text-text-muted px-4 py-6">
          {t('chat.conversationsEmpty')}
        </p>
      </>
    )
  }

  return (
    <div className="workspace-conversation-list flex-1 space-y-1 overflow-y-auto p-2">
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
            onClick={() => onSelect ? onSelect(c) : select(c.id)}
            className={cn(
              'workspace-conversation-row',
              'group relative w-full text-left flex gap-3 md:gap-2.5 items-center transition-colors',
              'rounded-xl border border-transparent border-l-2 px-3 py-3 md:rounded-lg md:py-2.5',
              isActive
                ? 'border-border-subtle border-l-accent bg-bg-tertiary shadow-sm'
                : isUnread
                  ? 'bg-accent/[0.04] active:bg-accent/[0.08] md:hover:bg-accent/[0.07]'
                  : 'active:bg-bg-tertiary/60 md:hover:bg-bg-tertiary/70',
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
              <ConversationAvatar
                conversation={c}
                selfId={selfId}
                className="workspace-conversation-list-avatar h-14 w-14 text-lg md:h-9 md:w-9 md:text-xs"
              />
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
                  'workspace-conversation-list-title',
                  'truncate',
                  'text-[15px] md:text-sm',
                  isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-primary',
                )}>
                  {title}
                </span>
                <span className={cn(
                  'workspace-conversation-time',
                  'shrink-0 tabular-nums',
                  'text-xs md:text-2xs',
                  isUnread ? 'text-accent md:text-text-muted' : 'text-text-muted',
                )}>
                  {relativeTime(c.last_message_at)}
                </span>
              </div>
              <div className="workspace-conversation-preview-row flex items-center justify-between gap-2 mt-1 md:mt-0.5">
                <span className={cn(
                  'workspace-conversation-preview',
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
