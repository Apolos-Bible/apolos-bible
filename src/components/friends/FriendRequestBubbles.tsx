import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { paths } from '@/router/paths'

export function FriendRequestBubbles() {
  const { t } = useTranslation()
  const requests = useFriendStore((s) => s.received)
  const acceptRequest = useFriendStore((s) => s.acceptRequest)
  const declineRequest = useFriendStore((s) => s.declineRequest)
  const addToast = useUIStore((s) => s.addToast)
  const [busyId, setBusyId] = useState<number | null>(null)

  if (requests.length === 0) return null

  const handleAccept = async (requestId: number) => {
    setBusyId(requestId)
    try {
      await acceptRequest(requestId)
      addToast(t('friends.requestAccepted'), 'success')
    } catch {
      addToast(t('friends.acceptFailed'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleDecline = async (requestId: number) => {
    setBusyId(requestId)
    try {
      await declineRequest(requestId)
    } catch {
      addToast(t('friends.declineFailed'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section
      aria-labelledby="friend-requests-heading"
      className="shrink-0 border-b border-border-subtle bg-bg-primary px-3 py-3"
    >
      <h2 id="friend-requests-heading" className="mb-2 px-1 text-2xs font-medium uppercase tracking-wider text-text-muted">
        {t('friends.requests', { count: requests.length })}
      </h2>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {requests.map((request) => {
          const person = request.user
          if (!person) return null
          const busy = busyId === request.id

          return (
            <div
              key={request.id}
              aria-busy={busy}
              className="flex shrink-0 items-center gap-2 rounded-full border border-border-subtle bg-bg-secondary py-1.5 pl-1.5 pr-2"
            >
              <Link
                to={paths.userProfile(person.id)}
                className="flex min-w-0 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <UserAvatar
                  name={person.name}
                  email={person.email}
                  src={person.avatar_url}
                  size="md"
                  className="h-8 w-8"
                />
                <span className="max-w-28 truncate text-xs font-medium text-text-primary">{person.name}</span>
              </Link>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => { void handleAccept(request.id) }}
                  aria-label={t('friends.acceptAria', { name: person.name })}
                  title={t('friends.accept')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-bg-primary transition-opacity hover:opacity-80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => { void handleDecline(request.id) }}
                  aria-label={t('friends.declineAria', { name: person.name })}
                  title={t('friends.decline')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
