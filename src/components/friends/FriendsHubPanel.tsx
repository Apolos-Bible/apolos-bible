import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, MessagesSquare, UserRoundPlus } from 'lucide-react'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { PanelHeader, PanelHeaderButton } from '@/components/layout/PanelHeader'
import { FriendSearch } from './FriendSearch'
import { FriendRequestCard } from './FriendRequestCard'
import { FriendCard } from './FriendCard'
import { FriendRecommendationCard } from './FriendRecommendationCard'

const VISIBLE_RECOMMENDATIONS = 4

export function FriendsHubPanel() {
  const { t } = useTranslation()
  const closePanel = useUIStore((s) => s.closePanel)
  const openPanel = useUIStore((s) => s.openPanel)
  const addToast = useUIStore((s) => s.addToast)
  const load = useFriendStore((s) => s.load)
  const received = useFriendStore((s) => s.received)
  const sent = useFriendStore((s) => s.sent)
  const friends = useFriendStore((s) => s.friends)
  const recommendations = useFriendStore((s) => s.recommendations)
  const acceptRequest = useFriendStore((s) => s.acceptRequest)
  const declineRequest = useFriendStore((s) => s.declineRequest)
  const removeFriend = useFriendStore((s) => s.removeFriend)
  const sendRequest = useFriendStore((s) => s.sendRequest)
  const dismissRecommendation = useFriendStore((s) => s.dismissRecommendation)
  const unreadNotifications = useNotificationStore((s) => s.unreadCount)
  const [pendingRecommendationIds, setPendingRecommendationIds] = useState<number[]>([])

  useEffect(() => { void load() }, [load])

  const accept = async (id: number) => {
    try { await acceptRequest(id); addToast(t('friends.requestAccepted'), 'success') }
    catch { addToast(t('friends.acceptFailed'), 'error') }
  }
  const decline = async (id: number) => {
    try { await declineRequest(id) }
    catch { addToast(t('friends.declineFailed'), 'error') }
  }
  const remove = async (id: number) => {
    try { await removeFriend(id); addToast(t('friends.removed'), 'success') }
    catch { addToast(t('friends.removeFailed'), 'error') }
  }
  const invite = async (id: number, name: string) => {
    setPendingRecommendationIds((ids) => [...ids, id])
    try { await sendRequest(id); addToast(t('friends.requestSentTo', { name }), 'success') }
    catch { addToast(t('friends.requestFailed'), 'error') }
    finally { setPendingRecommendationIds((ids) => ids.filter((pendingId) => pendingId !== id)) }
  }
  const dismiss = async (id: number) => {
    setPendingRecommendationIds((ids) => [...ids, id])
    try { await dismissRecommendation(id) }
    catch { addToast(t('friends.dismissFailed'), 'error') }
    finally { setPendingRecommendationIds((ids) => ids.filter((pendingId) => pendingId !== id)) }
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-secondary">
      <PanelHeader
        title={t('nav.friends')}
        description={t('friends.hubDescription')}
        onClose={closePanel}
        closeLabel={t('friends.closePanel')}
        actions={
          <>
            <PanelHeaderButton onClick={() => openPanel('notifications')} aria-label={t('notifications.open')} title={t('notifications.open')}>
              <span className="relative">
                <Bell className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
                {unreadNotifications > 0 && <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-accent px-1 text-center text-[9px] leading-4 text-bg-primary">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </span>
            </PanelHeaderButton>
            <PanelHeaderButton className="md:hidden" onClick={() => openPanel('chat')} aria-label={t('nav.chats')} title={t('nav.chats')}>
              <MessagesSquare className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
            </PanelHeaderButton>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-border-subtle pt-3">
          <FriendSearch />
        </div>

        {received.length > 0 && (
          <section className="border-b border-border-subtle px-3 py-3">
            <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-muted">
              <span>{t('friends.requests')}</span><span>{received.length}</span>
            </h2>
            <div className="flex flex-col gap-1.5">
              {received.map((request) => <FriendRequestCard key={request.id} request={request} variant="received" onAccept={accept} onDecline={decline} />)}
            </div>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="border-b border-border-subtle px-3 py-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <UserRoundPlus className="h-3.5 w-3.5" />{t('friends.recommended')}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {recommendations.slice(0, VISIBLE_RECOMMENDATIONS).map((friend) => (
                <FriendRecommendationCard
                  key={friend.id}
                  friend={friend}
                  pending={pendingRecommendationIds.includes(friend.id)}
                  onAdd={() => void invite(friend.id, friend.name)}
                  onDismiss={() => void dismiss(friend.id)}
                />
              ))}
            </div>
          </section>
        )}

        {sent.length > 0 && (
          <section className="border-b border-border-subtle px-3 py-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">{t('friends.sent')}</h2>
            <div className="flex flex-col gap-1.5">
              {sent.map((request) => <FriendRequestCard key={request.id} request={request} variant="sent" onDecline={decline} />)}
            </div>
          </section>
        )}

        <section className="px-3 py-3">
          <h2 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-muted">
            <span>{t('friends.myFriends')}</span><span>{friends.length}</span>
          </h2>
          {friends.length === 0 ? <p className="py-4 text-center text-sm text-text-muted">{t('friends.empty')}</p> : (
            <div className="flex flex-col gap-1">
              {friends.map((friend) => <FriendCard key={friend.id} friend={friend} onRemove={() => void remove(friend.id)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
