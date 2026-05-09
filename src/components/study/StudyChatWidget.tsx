import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { chatApi, type Conversation } from '@/lib/chatApi'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { ChatThread } from '@/components/chat/ChatThread'

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
  const messages = useChatStore(s => s.messages[conversationId] ?? [])

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [open, setOpen] = useState(false)
  const [unreadFromOpen, setUnreadFromOpen] = useState(0)

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
    setUnreadFromOpen(newer.length)
  }, [open, messages, userId])

  if (!conversation) {
    // Render nothing while we resolve. The bubble will appear once we have
    // the conversation, avoiding a flash of an empty chat.
    return null
  }

  return (
    <>
      {/* Bubble */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-5 right-5 z-40 cursor-pointer',
          'flex items-center justify-center w-12 h-12 rounded-full',
          'bg-accent text-bg-primary shadow-lg hover:shadow-xl',
          'transition-all hover:-translate-y-0.5',
          open && 'scale-95',
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
          <ChatThread
            conversation={conversation}
            onBack={() => setOpen(false)}
          />
          {/* Explicit close in the top-right; ChatThread's back arrow
              also calls onBack. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 cursor-pointer p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary"
            aria-label={t('study.chat.close', 'Close')}
            title={t('study.chat.close', 'Close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
