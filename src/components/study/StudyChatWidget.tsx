import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { chatApi, type ChatMessage, type Conversation } from '@/lib/chatApi'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { ChatThread } from '@/components/chat/ChatThread'

const EMPTY_MESSAGES: ChatMessage[] = []

interface StudyChatWidgetProps {
  conversationId: number
}

/**
 * Floating Messenger-style chat for the study page. Anchored to the
 * bottom-right corner of the canvas. Reuses ChatThread for the message
 * surface so threading, typing, receipts, and history all come for free.
 */
export function StudyChatWidget({ conversationId }: StudyChatWidgetProps) {
  const { t } = useTranslation()
  const userId = useAuthStore(s => s.user?.id)

  const conversations = useChatStore(s => s.conversations)
  const messages = useChatStore(s => s.messages[conversationId] ?? EMPTY_MESSAGES)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [open, setOpen] = useState(false)
  const [unreadFromOpen, setUnreadFromOpen] = useState(0)
  // Bumped each time a new message from someone else lands while the panel
  // is closed; used as a key to retrigger the bounce + ring animation.
  const [pingKey, setPingKey] = useState(0)

  // Track the last message id we considered "read" so we can compute unread
  // count locally without depending on the server's unread_count refresh
  // cadence (which is per conversation list reload).
  const lastReadMessageIdRef = useRef<number | null>(null)

  // Resolve the conversation: prefer the global store (it gets populated by
  // ChatPanel and stays subscribed), fall back to a one-off fetch.
  useEffect(() => {
    const fromStore = conversations.find(c => c.id === conversationId)
    if (fromStore) {
      setConversation(fromStore)
      return
    }
    let cancelled = false
    chatApi.show(conversationId).then(c => {
      if (!cancelled) setConversation(c)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [conversationId, conversations])

  // Server-side unread (last list refresh) + locally tracked since open.
  const unread = useMemo(() => {
    if (open) return 0
    const fromServer = conversation?.unread_count ?? 0
    return Math.max(fromServer, unreadFromOpen)
  }, [open, conversation?.unread_count, unreadFromOpen])

  // Local unread tracking based on the realtime stream from the chat store.
  useEffect(() => {
    if (open) {
      lastReadMessageIdRef.current = messages.length > 0 ? messages[messages.length - 1].id : null
      setUnreadFromOpen(0)
      return
    }
    const lastRead = lastReadMessageIdRef.current
    if (lastRead == null) {
      // Haven't opened yet — don't count history as unread, only new ones.
      lastReadMessageIdRef.current = messages.length > 0 ? messages[messages.length - 1].id : null
      return
    }
    const newer = messages.filter(m => m.id > lastRead && m.user_id !== userId)
    setUnreadFromOpen(prev => {
      // Trigger the bounce + ring whenever a new external message arrives.
      if (newer.length > prev) setPingKey(k => k + 1)
      return newer.length
    })
  }, [open, messages, userId])

  if (!conversation) {
    // Render nothing while we resolve. The bubble will appear once we have
    // the conversation, avoiding a flash of an empty chat.
    return null
  }

  return (
    <>
      {/* Bubble */}
      <div className="fixed bottom-5 right-5 z-40">
        {/* Expanding ring on new message; remounts via pingKey so the
            keyframe replays for each ping. */}
        {pingKey > 0 && !open && (
          <span key={pingKey} className="study-chat-ring" aria-hidden="true" />
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          key={`bubble-${pingKey}`}
          className={cn(
            'relative cursor-pointer',
            'flex items-center justify-center w-12 h-12 rounded-full',
            'bg-accent text-bg-primary shadow-lg hover:shadow-xl',
            'transition-all hover:-translate-y-0.5',
            open && 'scale-95',
            !open && pingKey > 0 && 'study-chat-bouncing',
          )}
          aria-label={t('study.chat.toggle', 'Toggle chat')}
          title={t('study.chat.toggle', 'Toggle chat')}
        >
          <MessageSquare className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-2xs font-medium flex items-center justify-center border-2 border-bg-primary">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            'fixed bottom-20 right-5 z-40',
            'w-[360px] h-[520px] max-h-[calc(100vh-7rem)]',
            'bg-surface border border-border rounded-xl shadow-2xl',
            'flex flex-col overflow-hidden',
          )}
        >
          {/* ChatThread's back arrow already calls onBack and the bubble
              click toggles the panel — no extra close icon needed. */}
          <ChatThread
            conversation={conversation}
            onBack={() => setOpen(false)}
          />
        </div>
      )}
    </>
  )
}
