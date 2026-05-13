import { useTranslation } from 'react-i18next'
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
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function MessageItem({ message, isMine, compact, showReceipt, conversation }: MessageItemProps) {
  const { t } = useTranslation()
  const selfId = useAuthStore(s => s.user?.id)
  const isGroup = conversation.type === 'group'

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
        {!compact && !isMine && message.user && (
          <UserAvatar email={message.user.email || message.user.name} size="md" className="w-8 h-8 md:w-7 md:h-7 text-sm md:text-xs" />
        )}
      </div>

      <div className={cn('flex flex-col min-w-0 max-w-[82%] md:max-w-[75%]', isMine ? 'items-end' : 'items-start')}>
        {!compact && !isMine && isGroup && message.user && (
          <span className="text-xs md:text-2xs text-text-muted mb-0.5 px-1">{message.user.name}</span>
        )}

        <div
          className={cn(
            'relative leading-snug rounded-2xl break-words [overflow-wrap:anywhere] whitespace-pre-wrap shadow-sm md:shadow-none',
            'text-[15px] md:text-sm',
            'px-3.5 md:px-3 py-2 md:py-1.5',
            isMine
              ? 'bg-accent text-bg-primary rounded-br-md'
              : 'bg-bg-tertiary md:bg-bg-secondary border-0 md:border md:border-border-subtle text-text-primary rounded-bl-md',
          )}
          title={new Date(message.created_at).toLocaleString()}
        >
          <MessageBody text={message.body} isMine={isMine} />
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
