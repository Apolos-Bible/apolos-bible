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
  const selfId = useAuthStore(s => s.user?.id)
  const isGroup = conversation.type === 'group'

  // Read receipt: among other participants, who has read this message?
  let receiptLabel = ''
  if (showReceipt && isMine) {
    const others = conversation.participants.filter(p => p.id !== selfId)
    const messageTs = new Date(message.created_at).getTime()
    const readers = others.filter(p => p.last_read_at && new Date(p.last_read_at).getTime() >= messageTs)

    if (readers.length === 0) {
      receiptLabel = 'Sent'
    } else if (!isGroup) {
      receiptLabel = 'Read'
    } else if (readers.length === others.length) {
      receiptLabel = 'Read by all'
    } else {
      receiptLabel = `Read by ${readers.length}/${others.length}`
    }
  }

  return (
    <div className={cn(
      'flex gap-2 px-1',
      isMine ? 'flex-row-reverse' : 'flex-row',
      compact ? 'mt-0.5' : 'mt-2',
    )}>
      <div className="w-7 shrink-0">
        {!compact && !isMine && message.user && (
          <UserAvatar email={message.user.email || message.user.name} size="md" />
        )}
      </div>

      <div className={cn('flex flex-col min-w-0 max-w-[75%]', isMine ? 'items-end' : 'items-start')}>
        {!compact && !isMine && isGroup && message.user && (
          <span className="text-2xs text-text-muted mb-0.5 px-1">{message.user.name}</span>
        )}

        <div
          className={cn(
            'text-sm leading-snug px-3 py-1.5 rounded-2xl break-words whitespace-pre-wrap',
            isMine
              ? 'bg-accent text-bg-primary rounded-br-md'
              : 'bg-bg-secondary border border-border-subtle text-text-primary rounded-bl-md',
          )}
          title={new Date(message.created_at).toLocaleString()}
        >
          <MessageBody text={message.body} isMine={isMine} />
        </div>

        <div className={cn('flex items-center gap-1.5 px-1 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
          <span className="text-2xs text-text-muted">{formatTime(message.created_at)}</span>
          {showReceipt && receiptLabel && (
            <span className="text-2xs text-text-muted">· {receiptLabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}
