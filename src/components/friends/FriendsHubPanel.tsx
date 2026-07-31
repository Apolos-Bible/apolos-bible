import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/router/paths'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { PanelHeader } from '@/components/layout/PanelHeader'
import { FriendSearch } from './FriendSearch'
import { FriendRequestCard } from './FriendRequestCard'
import { FriendCard } from './FriendCard'

export function FriendsHubPanel() {
  const { t } = useTranslation()
  const closePanel = useUIStore((s) => s.closePanel)
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
    try { await sendRequest(id); addToast(t('friends.requestSentTo', { name }), 'success') }
    catch { addToast(t('friends.requestFailed'), 'error') }
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-secondary">
      <PanelHeader
        title={t('nav.friends')}
        description={t('friends.hubDescription')}
        onClose={closePanel}
        closeLabel={t('friends.closePanel')}
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
            <div className="flex flex-col gap-1">
              {recommendations.map((friend) => (
                <div key={friend.id} className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-bg-tertiary">
                  <Link to={paths.userProfile(friend.id)} className="flex min-w-0 flex-1 items-center gap-2.5">
                    <UserAvatar name={friend.name} email={friend.email} src={friend.avatar_url} size="sm" />
                    <span className="min-w-0 truncate text-xs text-text-primary">{friend.name}</span>
                  </Link>
                  <button type="button" onClick={() => void invite(friend.id, friend.name)} className="shrink-0 rounded border border-border-subtle px-2 py-1 text-2xs text-text-secondary hover:border-accent hover:text-accent">
                    {t('friends.add')}
                  </button>
                </div>
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
