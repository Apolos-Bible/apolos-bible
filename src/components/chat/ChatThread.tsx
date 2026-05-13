import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UsersRound } from 'lucide-react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { MessageItem } from './MessageItem'
import { MessageInput } from './MessageInput'
import { TypingDots } from './TypingDots'
import { ManageConversationDialog } from './ManageConversationDialog'
import { PanelHeader, PanelHeaderButton } from '@/components/layout/PanelHeader'
import type { Conversation, ChatMessage } from '@/lib/chatApi'

const EMPTY_MESSAGES: ChatMessage[] = []
const EMPTY_TYPING: { userId: number; userName: string; expiresAt: number }[] = []

interface ChatThreadProps {
  conversation: Conversation
  onBack: () => void
}

function conversationTitle(c: Conversation, selfId: number | undefined, fallback: string): string {
  if (c.type === 'group') return c.name ?? c.participants.map(p => p.name).join(', ')
  const other = c.participants.find(p => p.id !== selfId)
  return other?.name ?? fallback
}

export function ChatThread({ conversation, onBack }: ChatThreadProps) {
  const { t }          = useTranslation()
  const messages       = useChatStore(s => s.messages[conversation.id] ?? EMPTY_MESSAGES)
  const messagesLoaded = useChatStore(s => s.messages[conversation.id] !== undefined)
  const loading        = useChatStore(s => s.loadingThread[conversation.id])
  const loadMessages   = useChatStore(s => s.loadMessages)
  const loadOlder      = useChatStore(s => s.loadOlder)
  const typingEntries  = useChatStore(s => s.typing[conversation.id] ?? EMPTY_TYPING)
  const selfId         = useAuthStore(s => s.user?.id)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)
  const [manageOpen, setManageOpen] = useState(false)

  const dayLabel = (iso: string): string => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
    if (sameDay(d, today))     return t('chat.today')
    if (sameDay(d, yesterday)) return t('time.yesterday')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
  }

  useEffect(() => {
    if (!messagesLoaded) loadMessages(conversation.id)
  }, [conversation.id, messagesLoaded, loadMessages])

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
          <div className="flex items-center justify-center my-4 md:my-3" key={`day-${day}-${idx}`}>
            {/* Mobile: centered pill, more editorial */}
            <span className="md:hidden inline-flex items-center px-3 h-6 rounded-full bg-bg-tertiary text-[11px] font-medium tracking-wide text-text-muted">
              {dayLabel(m.created_at)}
            </span>
            {/* Desktop: original separator unchanged */}
            <div className="hidden md:flex items-center gap-2 px-2 w-full">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-2xs uppercase tracking-wider text-text-muted">{dayLabel(m.created_at)}</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>
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

  const isGroup = conversation.type === 'group'
  const otherEmail = conversation.participants.find(p => p.id !== selfId)?.email
    ?? conversation.participants[0]?.email
    ?? '?'
  const headerTitle = conversationTitle(conversation, selfId, t('chat.directMessage'))

  return (
    <>
      <PanelHeader
        leading={
          <div className="flex items-center gap-1.5">
            <PanelHeaderButton onClick={onBack} aria-label={t('chat.backToConversations')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 md:h-4 md:w-4">
                <path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </PanelHeaderButton>
            {/* Mobile-only: avatar anchors the header so you feel inside a conversation */}
            <span className="md:hidden ml-1 shrink-0">
              {isGroup ? (
                <span className="w-9 h-9 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <UsersRound className="w-4 h-4" strokeWidth={1.75} />
                </span>
              ) : (
                <UserAvatar email={otherEmail} size="md" className="w-9 h-9 text-sm" />
              )}
            </span>
          </div>
        }
        title={headerTitle}
        description={isGroup ? t('chat.member', { count: conversation.participants.length }) : undefined}
        actions={
          isGroup && !conversation.study_session_id ? (
            <PanelHeaderButton onClick={() => setManageOpen(true)} aria-label={t('chat.manageGroup')} title={t('chat.manageGroup')}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 md:h-4 md:w-4">
                <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
              </svg>
            </PanelHeaderButton>
          ) : undefined
        }
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-3 py-3 flex flex-col"
      >
        {loading && messages.length === 0 && (
          <p className="text-xs text-text-muted text-center py-6">{t('chat.loadingMessages')}</p>
        )}
        {!loading && messages.length === 0 && (
          <>
            {/* Mobile: editorial empty thread */}
            <div className="md:hidden flex-1 flex flex-col items-center justify-center text-center px-6">
              <h2 className="font-reading italic text-xl text-text-primary mb-2">
                {t('chat.thread.empty.headline')}
              </h2>
              <p className="text-[15px] leading-relaxed text-text-muted max-w-[16rem]">
                {t('chat.thread.empty.body')}
              </p>
            </div>
            <p className="hidden md:block text-xs text-text-muted text-center py-6">
              {t('chat.noMessagesYet')}
            </p>
          </>
        )}
        {rendered.map(r => r.node)}

        {typingEntries.length > 0 && (
          <div className="px-2 mt-1">
            <TypingDots names={typingEntries.map(e => e.userName)} />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput conversationId={conversation.id} />
      <ManageConversationDialog
        conversation={conversation}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </>
  )
}
