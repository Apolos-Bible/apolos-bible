import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, UserPlus, X } from 'lucide-react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { ConversationAvatar } from '@/components/chat/ConversationAvatar'
import { cn } from '@/lib/cn'
import { paths } from '@/router/paths'
import { ChatThread } from './ChatThread'
import type { Conversation } from '@/lib/chatApi'

interface FloatingChatDockProps {
  rightPanelOpen: boolean
}

function conversationTitle(conversation: Conversation, selfId: number | undefined): string {
  if (conversation.type === 'group') return conversation.name ?? conversation.participants.map((p) => p.name).join(', ')
  return conversation.participants.find((p) => p.id !== selfId)?.name ?? conversation.participants[0]?.name ?? 'Chat'
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
  const friendRequests = useFriendStore((s) => s.received)
  const acceptRequest = useFriendStore((s) => s.acceptRequest)
  const declineRequest = useFriendStore((s) => s.declineRequest)
  const addToast = useUIStore((s) => s.addToast)
  const [openRequestId, setOpenRequestId] = useState<number | null>(null)
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null)

  const byId = new Map(conversations.map((conversation) => [conversation.id, conversation]))
  const openConversations = floatingIds
    .filter((id) => !minimized[id])
    .map((id) => byId.get(id))
    .filter((conversation): conversation is Conversation => conversation !== undefined)
  const bubbleConversations = conversations.filter((conversation) =>
    conversation.archived_at === null
      && (minimized[conversation.id] || conversation.unread_count > 0)
      && !openConversations.some((open) => open.id === conversation.id),
  )
  const openRequest = friendRequests.find((request) => request.id === openRequestId)
  const bubbleRequests = friendRequests
    .filter((request) => request.user && request.id !== openRequestId)
    .slice(0, 4)

  if (openConversations.length === 0 && bubbleConversations.length === 0 && friendRequests.length === 0) return null

  const handleAcceptRequest = async (requestId: number) => {
    setBusyRequestId(requestId)
    try {
      await acceptRequest(requestId)
      addToast(t('friends.requestAccepted'), 'success')
      setOpenRequestId(null)
    } catch {
      addToast(t('friends.acceptFailed'), 'error')
    } finally {
      setBusyRequestId(null)
    }
  }

  const handleDeclineRequest = async (requestId: number) => {
    setBusyRequestId(requestId)
    try {
      await declineRequest(requestId)
      setOpenRequestId(null)
    } catch {
      addToast(t('friends.declineFailed'), 'error')
    } finally {
      setBusyRequestId(null)
    }
  }

  return (
    <div
      className={cn(
        'mobile-floating-stack fixed bottom-3 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-end gap-2 transition-[right] duration-300 ease-in-out md:bottom-4 md:right-4',
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

        {openRequest?.user && (
          <div className="pointer-events-auto w-[min(19rem,calc(100vw-5rem))] shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
              <Link
                to={paths.userProfile(openRequest.user.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <UserAvatar
                  name={openRequest.user.name}
                  email={openRequest.user.email}
                  src={openRequest.user.avatar_url}
                  size="lg"
                  className="h-10 w-10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{openRequest.user.name}</p>
                  <p className="truncate text-2xs text-text-muted">{openRequest.user.email}</p>
                </div>
              </Link>
              <button
                type="button"
                disabled={busyRequestId !== null}
                onClick={() => setOpenRequestId(null)}
                aria-label={t('friends.closeRequest')}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="px-4 py-3">
              <p className="text-xs leading-relaxed text-text-secondary">
                {t('notification.friendRequest', { name: openRequest.user.name })}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyRequestId !== null}
                  onClick={() => { void handleAcceptRequest(openRequest.id) }}
                  aria-label={t('friends.acceptAria', { name: openRequest.user.name })}
                  className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-bg-primary transition-opacity hover:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                  {t('friends.accept')}
                </button>
                <button
                  type="button"
                  disabled={busyRequestId !== null}
                  onClick={() => { void handleDeclineRequest(openRequest.id) }}
                  aria-label={t('friends.declineAria', { name: openRequest.user.name })}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border-subtle px-3 text-xs font-medium text-text-secondary transition-colors hover:border-red-400/40 hover:text-red-400 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                >
                  {t('friends.decline')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pointer-events-auto">
        {bubbleRequests.map((request) => {
          const person = request.user!
          return (
            <button
              key={`friend-request-${request.id}`}
              type="button"
              onClick={() => setOpenRequestId(request.id)}
              aria-label={t('friends.openRequest', { name: person.name })}
              title={t('notification.friendRequest', { name: person.name })}
              className="group relative rounded-full outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <UserAvatar
                name={person.name}
                email={person.email}
                src={person.avatar_url}
                size="lg"
                className="h-12 w-12 border-2 border-accent text-sm shadow-lg"
              />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-bg-primary shadow">
                <UserPlus aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
              </span>
            </button>
          )
        })}

        {bubbleConversations.slice(-4).map((conversation) => {
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
              <ConversationAvatar
                conversation={conversation}
                selfId={selfId}
                className="h-12 w-12 border-2 border-bg-primary text-sm shadow-lg"
              />
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
