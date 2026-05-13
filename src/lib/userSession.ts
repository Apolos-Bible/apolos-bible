import { useFriendStore } from '@/lib/store/useFriendStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useNotificationStore } from '@/lib/store/useNotificationStore'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useActivityStore } from '@/lib/store/useActivityStore'
import { destroyEcho } from '@/lib/echo'
import { enablePush } from '@/lib/push'
import { ensureAutostart } from '@/lib/desktopAutostart'

// Pre-loads everything tied to the current account so the app feels populated
// the moment a user logs in instead of trickling data in per-screen.
export async function hydrateUserSession(): Promise<void> {
  await Promise.allSettled([
    useFriendStore.getState().load(),
    useBookmarkStore.getState().load(),
    useNotificationStore.getState().load(),
    useStudyStore.getState().loadMyStudies(),
    useStudyStore.getState().loadInvitations(),
    useChatStore.getState().load(),
  ])

  // Fire and forget — never block hydration on a permission prompt or a
  // network round-trip to FCM. enablePush is a no-op if the user has
  // previously declined or the platform doesn't support web push.
  void enablePush().catch(() => {})
  void ensureAutostart().catch(() => {})
}

// Wipes every account-scoped store so a previous user's data never leaks
// across a logout / account switch.
export function resetUserSession(): void {
  useFriendStore.setState({
    friends: [],
    received: [],
    sent: [],
    searchResults: [],
    isSearching: false,
  })
  useBookmarkStore.setState({
    bookmarks: [],
    bookmarkedIds: new Set(),
    loading: false,
  })
  useNotificationStore.setState({ notifications: [] })
  useStudyStore.getState().clearSession()
  useStudyStore.setState({ myStudies: [], pendingInvitations: [] })
  useChatStore.getState().reset()
  useNoteStore.setState({ notes: {}, loading: {} })
  useHighlightStore.setState({ highlights: {}, loading: {} })
  useActivityStore.getState().clearAll()
  // Echo's auth headers are baked in at construction; tear it down so the
  // next presence/private subscription rebuilds with the fresh bearer token.
  destroyEcho()
}
