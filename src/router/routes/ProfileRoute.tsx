import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Settings } from 'lucide-react'
import { AppPageLayout } from '@/components/layout/AppPageLayout'
import { ProfileView } from '@/components/profile/ProfileView'
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { profileApi } from '@/lib/profileApi'
import { friendApi } from '@/lib/friendApi'
import { paths } from '@/router/paths'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useChatStore } from '@/lib/store/useChatStore'
import type { ProfileData, ProfileMode } from '@/types'

interface ProfileRouteProps {
  mode: ProfileMode
}

export function ProfileRoute({ mode }: ProfileRouteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams<{ userId?: string }>()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const addToast = useUIStore((s) => s.addToast)
  const reloadFriends = useFriendStore((s) => s.load)

  const viewerId = user?.id
  const targetId = mode === 'self' ? viewerId : Number(params.userId)

  const [data, setData] = useState<ProfileData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [pendingAction, setPendingAction] = useState(false)

  // Auth guard — wait for init() so a deep link to /perfil doesn't bounce a
  // logged-in user while the session is still loading.
  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal()
      navigate(paths.root(), { replace: true })
    }
  }, [authLoading, user, openAuthModal, navigate])

  // Redirect /u/:me → /perfil
  useEffect(() => {
    if (mode === 'other' && user && Number(params.userId) === user.id) {
      navigate(paths.profile(), { replace: true })
    }
  }, [mode, user, params.userId, navigate])

  const load = useCallback(async () => {
    // Malformed ids (/u/abc) have no profile — fail fast instead of
    // skeleton-ing forever. Don't fetch while signed out either; the auth
    // guard will redirect.
    if (targetId != null && Number.isNaN(targetId)) {
      setStatus('notfound')
      return
    }
    if (!viewerId || targetId == null) return
    try {
      const res = await profileApi.get(targetId)
      setData(res)
      setStatus('ready')
    } catch (e) {
      const code = (e as { status?: number })?.status
      setStatus(code === 404 ? 'notfound' : 'error')
    }
  }, [targetId, viewerId])

  useEffect(() => {
    setStatus('loading')
    setData(null)
    void load()
  }, [load])

  // ── Friendship actions (optimistic-ish: act, then refetch + sync panels) ──
  const run = async (fn: () => Promise<unknown>, errKey: string) => {
    setPendingAction(true)
    try {
      await fn()
      await load()
      await reloadFriends()
    } catch {
      addToast(t(errKey as never), 'error')
    } finally {
      setPendingAction(false)
    }
  }

  // pending_sent/received always carry a friendship_id from the backend; if
  // the invariant ever breaks, surface an error instead of a dead button.
  const withFriendshipId = (fn: (id: number) => Promise<unknown>, errKey: string) => () => {
    const id = data?.friendship_id
    if (!id) {
      addToast(t(errKey as never), 'error')
      return
    }
    void run(() => fn(id), errKey)
  }

  const onAddFriend = () => { if (targetId) void run(() => friendApi.send(targetId), 'friend.error.add') }
  const onRemoveFriend = () => {
    if (!targetId) return
    void run(async () => {
      await friendApi.remove(targetId)
      addToast(t('friend.removed'), 'info')
    }, 'friend.error.remove')
  }
  const onCancelRequest = withFriendshipId((id) => friendApi.decline(id), 'friend.error.cancel')
  const onAcceptRequest = withFriendshipId((id) => friendApi.accept(id), 'friend.error.accept')
  const onDeclineRequest = withFriendshipId((id) => friendApi.decline(id), 'friend.error.decline')

  const onMessage = async () => {
    if (!targetId) return
    try {
      const conv = await useChatStore.getState().startDm(targetId)
      await useChatStore.getState().openFloating(conv.id)
      navigate(paths.root())
    } catch {
      addToast(t('friend.error.message'), 'error')
    }
  }

  const title =
    mode === 'self' ? t('perfil.title.self') : data?.user.name ?? t('perfil.title.loading')

  const mobileActions =
    mode === 'self' ? (
      <button
        type="button"
        onClick={() => navigate(paths.settings())}
        aria-label={t('settings.title')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
      >
        <Settings className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </button>
    ) : undefined

  return (
    <AppPageLayout title={title} mobileActions={mobileActions}>
      {status === 'loading' && <ProfileSkeleton />}

      {status === 'notfound' && <EmptyState className="py-20" message={t('perfil.notFound')} />}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-20">
          <EmptyState message={t('perfil.error.load')} />
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              void load()
            }}
            className="text-sm text-accent hover:underline"
          >
            {t('perfil.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && data && (
        data.friendship_status === 'blocked_by_them' ? (
          <EmptyState className="py-20" message={t('perfil.blocked')} />
        ) : (
          <>
            {mode === 'other' && (
              <div className="mx-auto hidden w-full max-w-5xl px-8 pt-6 -mb-3 md:block">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                  {t('perfil.back')}
                </button>
              </div>
            )}
            <ProfileView
              key={data.user.id}
              mode={mode}
              data={data}
              pendingAction={pendingAction}
              onAddFriend={onAddFriend}
              onCancelRequest={onCancelRequest}
              onAcceptRequest={onAcceptRequest}
              onDeclineRequest={onDeclineRequest}
              onRemoveFriend={onRemoveFriend}
              onMessage={onMessage}
            />
          </>
        )
      )}
    </AppPageLayout>
  )
}
