import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import { ChatThread } from './ChatThread'
import type { Conversation } from '@/lib/chatApi'

interface FloatingChatDockProps {
  rightPanelOpen: boolean
}

function conversationTitle(conversation: Conversation, selfId: number | undefined): string {
  if (conversation.type === 'group') return conversation.name ?? conversation.participants.map((p) => p.name).join(', ')
  return conversation.participants.find((p) => p.id !== selfId)?.name ?? conversation.participants[0]?.name ?? 'Chat'
}

function conversationAvatar(conversation: Conversation, selfId: number | undefined) {
  return conversation.participants.find((p) => p.id !== selfId) ?? conversation.participants[0]
}

export function FloatingChatDock({ rightPanelOpen }: FloatingChatDockProps) {
  const { t } = useTranslation()
  const conversations = useChatStore((s) => s.conversations)
  const floatingIds = useChatStore((s) => s.floatingIds)
  const minimized = useChatStore((s) => s.floatingMinimized)
  const openFloating = useChatStore((s) => s.openFloating)
  const minimizeFloating = useChatStore((s) => s.minimizeFloating)
  const closeFloating = useChatStore((s) => s.closeFloating)
  const selfId = useAuthStore((s) => s.user?.id)

  const byId = new Map(conversations.map((conversation) => [conversation.id, conversation]))
  const openConversations = floatingIds
    .filter((id) => !minimized[id])
    .map((id) => byId.get(id))
    .filter((conversation): conversation is Conversation => conversation !== undefined)
  const bubbleConversations = conversations.filter((conversation) =>
    (minimized[conversation.id] || conversation.unread_count > 0) && !openConversations.some((open) => open.id === conversation.id),
  )

  if (openConversations.length === 0 && bubbleConversations.length === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-3 md:bottom-4 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-end gap-2 transition-[right] duration-300 ease-in-out md:right-4',
        rightPanelOpen && 'md:right-[436px]',
      )}
    >
      <div className="flex min-w-0 items-end gap-3 pointer-events-none">
        {openConversations.map((conversation) => (
          <div
            key={conversation.id}
            className="pointer-events-auto flex h-[min(32rem,calc(100vh-7rem))] w-[min(22rem,calc(100vw-1.5rem))] shrink-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl"
          >
            <ChatThread
              conversation={conversation}
              onBack={() => minimizeFloating(conversation.id)}
              backLabel={t('chat.minimizeChat')}
              onClose={() => closeFloating(conversation.id)}
              closeLabel={t('chat.closeChat')}
            />
          </div>
        ))}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pointer-events-auto">
        {bubbleConversations.slice(-4).map((conversation) => {
          const avatar = conversationAvatar(conversation, selfId)
          const title = conversationTitle(conversation, selfId)
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => { void openFloating(conversation.id) }}
              aria-label={t('chat.openConversation', { title })}
              title={title}
              className="group relative rounded-full outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              {conversation.type === 'group' ? (
                conversation.avatar_url ? (
                  <UserAvatar
                    name={title}
                    src={conversation.avatar_url}
                    size="lg"
                    className="h-12 w-12 border-2 border-bg-primary text-sm shadow-lg"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-bg-primary bg-accent text-bg-primary shadow-lg">
                    <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                )
              ) : (
                <UserAvatar
                  name={avatar?.name}
                  email={avatar?.email}
                  src={avatar?.avatar_url}
                  size="lg"
                  className="h-12 w-12 border-2 border-bg-primary text-sm shadow-lg"
                />
              )}
              {conversation.unread_count > 0 && (
                <span className="absolute -right-0.5 -top-1 min-w-5 h-5 rounded-full bg-accent px-1 text-[10px] font-semibold leading-5 text-bg-primary shadow">
                  {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
