import { useEffect } from 'react'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useUIStore } from '@/lib/store/useUIStore'

const STUDY_SHARE_RE = /^\/study\/([^/]+)\/([^/]+)$/

export function useStudyRoute() {
  useEffect(() => {
    const match = window.location.pathname.match(STUDY_SHARE_RE)
    if (!match) return

    const [, , shareToken] = match

    const load = async () => {
      try {
        const store = useStudyStore.getState()
        await store.loadSharedSession(shareToken)
        useUIStore.getState().enterStudyMode()
        window.history.replaceState(null, '', `/study/${store.activeSession?.id ?? ''}/${shareToken}`)
      } catch (err) {
        console.warn('[StudyRoute] Failed to load shared study:', err)
      }
    }

    load()
  }, [])
}
