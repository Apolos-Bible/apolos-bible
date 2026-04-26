import { useEffect, useRef } from 'react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { MessageItem } from './MessageItem'
import { MessageInput } from './MessageInput'
import { TypingDots } from './TypingDots'
import type { Conversation, ChatMessage } from '@/lib/chatApi'

interface ChatThreadProps {
  conversation: Conversation
  onBack: () => void
}

function conversationTitle(c: Conversation, selfId: number | undefined): string {
  if (c.type === 'group') return c.name ?? c.participants.map(p => p.name).join(', ')
  const other = c.participants.find(p => p.id !== selfId)
  return other?.name ?? 'Direct message'
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today))     return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}

export function ChatThread({ conversation, onBack }: ChatThreadProps) {
  const messages       = useChatStore(s => s.messages[conversation.id] ?? [])
  const loading        = useChatStore(s => s.loadingThread[conversation.id])
  const loadMessages   = useChatStore(s => s.loadMessages)
  const loadOlder      = useChatStore(s => s.loadOlder)
  const typingEntries  = useChatStore(s => s.typing[conversation.id] ?? [])
  const selfId         = useAuthStore(s => s.user?.id)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  useEffect(() => {
    if (!messages.length && !loading) loadMessages(conversation.id)
  }, [conversation.id, loadMessages, messages.length, loading])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (messages.length > lastCountRef.current) {
      el.scrollTop = el.scrollHeight
    }
    lastCountRef.current = messages.length
  }, [messages.length])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop < 80 && messages.length > 0) {
      loadOlder(conversation.id)
    }
  }

  // Group messages: insert a date separator when the day changes; collapse
  // consecutive messages from the same author within ~5 min.
  const rendered: { node: React.ReactNode; key: string }[] = []
  let prev: ChatMessage | null = null
  let lastDayKey: string | null = null

  messages.forEach((m, idx) => {
    const day = new Date(m.created_at).toDateString()
    if (day !== lastDayKey) {
      rendered.push({
        key: `day-${day}`,
        node: (
          <div className="flex items-center gap-2 px-2 my-3" key={`day-${day}-${idx}`}>
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-2xs uppercase tracking-wider text-text-muted">{dayLabel(m.created_at)}</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        ),
      })
      lastDayKey = day
    }

    const sameAuthor = prev?.user_id === m.user_id
    const closeInTime = prev ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000 : false
    const compact = sameAuthor && closeInTime

    // read receipts: only on the LAST message from self in DM, or always-last in group
    const isLast = idx === messages.length - 1
    const showReceipt = isLast && m.user_id === selfId

    rendered.push({
      key: `m-${m.id}`,
      node: (
        <MessageItem
          key={`m-${m.id}`}
          message={m}
          isMine={m.user_id === selfId}
          compact={compact}
          showReceipt={showReceipt}
          conversation={conversation}
        />
      ),
    })

    prev = m
  })

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle shrink-0">
        <button
          onClick={onBack}
          className="md:hidden p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
          aria-label="Back to conversations"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
            <path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{conversationTitle(conversation, selfId)}</p>
          {conversation.type === 'group' && (
            <p className="text-2xs text-text-muted truncate">
              {conversation.participants.length} {conversation.participants.length === 1 ? 'member' : 'members'}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col"
      >
        {loading && messages.length === 0 && (
          <p className="text-xs text-text-muted text-center py-6">Loading messages…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-text-muted text-center py-6">No messages yet — say hi.</p>
        )}
        {rendered.map(r => r.node)}

        {typingEntries.length > 0 && (
          <div className="px-2 mt-1">
            <TypingDots names={typingEntries.map(t => t.userName)} />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={conversation.id} />
    </>
  )
}
