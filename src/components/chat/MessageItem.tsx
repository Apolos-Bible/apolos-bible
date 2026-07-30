import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles } from 'lucide-react'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { MessageBody } from './MessageBody'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { cn } from '@/lib/cn'
import type { ChatMessage, Conversation } from '@/lib/chatApi'

interface MessageItemProps {
  message:      ChatMessage
  isMine:       boolean
  compact:      boolean
  showReceipt:  boolean
  conversation: Conversation
  /** Present in study chats: enter "Modo Apolos" to continue this AI thread. */
  onContinueWithApolos?: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function MessageItem({ message, isMine, compact, showReceipt, conversation, onContinueWithApolos }: MessageItemProps) {
  const { t } = useTranslation()
  const selfId = useAuthStore(s => s.user?.id)
  const isGroup = conversation.type === 'group'
  const isAi = message.is_ai === true

  // Read receipt: among other participants, who has read this message?
  let receiptLabel = ''
  if (showReceipt && isMine) {
    const others = conversation.participants.filter(p => p.id !== selfId)
    const messageTs = new Date(message.created_at).getTime()
    const readers = others.filter(p => p.last_read_at && new Date(p.last_read_at).getTime() >= messageTs)

    if (readers.length === 0) {
      receiptLabel = t('chat.readReceiptSent')
    } else if (!isGroup) {
      receiptLabel = t('chat.readReceiptRead')
    } else if (readers.length === others.length) {
      receiptLabel = t('chat.readReceiptReadByAll')
    } else {
      receiptLabel = t('chat.readReceiptReadBy', { readers: readers.length, total: others.length })
    }
  }

  const timeLabel = formatTime(message.created_at)

  return (
    <div className={cn(
      'flex gap-2 px-1 chat-message-in',
      isMine ? 'flex-row-reverse' : 'flex-row',
      compact ? 'mt-0.5' : 'mt-2 md:mt-2',
    )}>
      <div className="w-9 md:w-7 shrink-0">
        {!compact && !isMine && (
          isAi ? (
            <span className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </span>
          ) : message.user && (
            <UserAvatar
              name={message.user.name}
              email={message.user.email || message.user.name}
              src={message.user.avatar_url}
              size="md"
              className="w-8 h-8 md:w-7 md:h-7 text-sm md:text-xs"
            />
          )
        )}
      </div>

      <div className={cn('flex flex-col min-w-0 max-w-[82%] md:max-w-[75%]', isMine ? 'items-end' : 'items-start')}>
        {!compact && !isMine && (isGroup || isAi) && message.user && (
          <span className="text-xs md:text-2xs text-text-muted mb-0.5 px-1">{isAi ? 'Apolos' : message.user.name}</span>
        )}

        <div
          className={cn(
            'relative leading-snug rounded-2xl break-words [overflow-wrap:anywhere] shadow-sm md:shadow-none',
            'text-[15px] md:text-sm',
            'px-3.5 md:px-3 py-2 md:py-1.5',
            !isAi && 'whitespace-pre-wrap',
            isMine
              ? 'bg-accent text-bg-primary rounded-br-md'
              : isAi
                ? 'bg-accent/5 border border-accent/20 text-text-primary rounded-bl-md'
                : 'bg-bg-tertiary md:bg-bg-secondary border-0 md:border md:border-border-subtle text-text-primary rounded-bl-md',
          )}
          title={new Date(message.created_at).toLocaleString()}
        >
          {isAi ? (
            <div className="[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_a]:underline [&_code]:text-2xs [&_code]:bg-black/10 [&_code]:px-1 [&_code]:rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.body}</ReactMarkdown>
            </div>
          ) : (
            <MessageBody text={message.body} isMine={isMine} />
          )}
          {/* Inline timestamp (mobile only) — absorbed into the bubble */}
          <span
            className={cn(
              'md:hidden inline-flex ml-2 align-baseline tabular-nums text-[10px] leading-none translate-y-[1px] select-none',
              isMine ? 'text-bg-primary/70' : 'text-text-muted/80',
            )}
            aria-hidden="true"
          >
            {timeLabel}
          </span>
        </div>

        {/* Continue this AI exchange without re-typing "/apolos" (study chats). */}
        {isAi && onContinueWithApolos && (
          <button
            type="button"
            onClick={onContinueWithApolos}
            className="group/cont mt-1 px-1 inline-flex items-center gap-1 text-2xs text-text-muted hover:text-accent transition-colors"
          >
            <Sparkles className="w-3 h-3 opacity-60 group-hover/cont:opacity-100" />
            {t('study.chat.continueApolos', 'Seguir con Apolos')}
          </button>
        )}

        {/* Receipt sits as a quiet status below — only on mobile under the last sent message */}
        {showReceipt && receiptLabel && (
          <span className="md:hidden text-[11px] text-text-muted mt-1 px-1">
            {receiptLabel}
          </span>
        )}

        {/* Desktop unchanged: time + receipt as a separate row */}
        <div className={cn('hidden md:flex items-center gap-1.5 px-1 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
          <span className="md:text-2xs text-text-muted">{timeLabel}</span>
          {showReceipt && receiptLabel && (
            <span className="md:text-2xs text-text-muted">· {receiptLabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}
