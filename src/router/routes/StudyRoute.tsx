import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { StudyMode } from '@/components/study/StudyMode'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { paths } from '@/router/paths'

export function StudyRoute() {
  const { sessionId, shareToken } = useParams<{ sessionId: string; shareToken?: string }>()
  const navigate = useNavigate()
  const activeSession = useStudyStore(s => s.activeSession)
  const wsToken = useStudyStore(s => s.wsToken)
  const authUser = useAuthStore(s => s.user)
  const authLoading = useAuthStore(s => s.loading)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load (or reuse) the requested session — wait for auth to settle first
  // so an authenticated participant doesn't fall through to guest mode.
  useEffect(() => {
    if (!sessionId) {
      navigate(paths.root(), { replace: true })
      return
    }
    if (authLoading) return

    let cancelled = false
    setError(null)

    const current = useStudyStore.getState()
    // If we're authenticated but currently in guest mode, fall through and
    // upgrade to a real participant — otherwise the WS stays on the guest token.
    const needsUpgrade = !!authUser && current.isGuest
    const alreadyLoaded =
      !needsUpgrade &&
      current.activeSession?.id === sessionId &&
      !!current.wsToken &&
      (!shareToken || current.shareToken === shareToken)

    if (alreadyLoaded) {
      setLoading(false)
      return
    }

    setLoading(true)

    void (async () => {
      try {
        // Authenticated users with access skip guest mode and join as participant.
        if (authUser) {
          try {
            await useStudyStore.getState().join(sessionId)
            if (cancelled) return
            // Drop the token from the URL — they're a participant, not a guest.
            if (shareToken) {
              navigate(paths.study({ sessionId }), { replace: true })
            }
            setLoading(false)
            return
          } catch (joinErr) {
            // Fall through to guest path if a share token is available;
            // otherwise the user genuinely has no access.
            if (!shareToken) throw joinErr
          }
        }

        if (shareToken) {
          await useStudyStore.getState().loadSharedSession(shareToken)
          if (cancelled) return
          const loadedId = useStudyStore.getState().activeSession?.id
          if (loadedId && loadedId !== sessionId) {
            navigate(paths.study({ sessionId: loadedId, shareToken }), { replace: true })
            return
          }
          setLoading(false)
          return
        }

        throw new Error('Sign in to open this study')
      } catch (err) {
        if (cancelled) return
        console.warn('[StudyRoute] failed to load study', err)
        setError(err instanceof Error ? err.message : 'Failed to load study')
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionId, shareToken, navigate, authLoading, authUser])

  // Clear local session state when leaving the route
  useEffect(() => {
    return () => {
      useStudyStore.getState().clearSession()
    }
  }, [])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-semibold">This study isn't available</h1>
          <p className="text-sm opacity-70">{error}</p>
          <button
            type="button"
            onClick={() => navigate(paths.root(), { replace: true })}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Go home
          </button>
        </div>
      </div>
    )
  }

  if (loading || !activeSession || !wsToken || activeSession.id !== sessionId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm opacity-60">Loading study…</div>
      </div>
    )
  }

  return <StudyMode />
}
