import { create } from 'zustand'
import { friendApi } from '@/lib/friendApi'
import type { Friend, FriendRequest } from '@/types'
import { useNotificationStore } from './useNotificationStore'

type FriendStore = {
  friends: Friend[]
  recommendations: Friend[]
  received: FriendRequest[]
  sent: FriendRequest[]
  searchResults: Friend[]
  isSearching: boolean

  load: () => Promise<void>
  searchUsers: (q: string) => Promise<void>
  clearSearch: () => void
  sendRequest: (userId: number) => Promise<void>
  acceptRequest: (friendshipId: number) => Promise<void>
  declineRequest: (friendshipId: number) => Promise<void>
  removeFriend: (userId: number) => Promise<void>
}

export const useFriendStore = create<FriendStore>((set) => ({
  friends: [],
  recommendations: [],
  received: [],
  sent: [],
  searchResults: [],
  isSearching: false,

  load: async () => {
    try {
      const results = await Promise.allSettled([
        friendApi.friends(),
        friendApi.received(),
        friendApi.sent(),
        friendApi.recommendations?.() ?? Promise.resolve([]),
      ])
      const value = <T,>(index: number, fallback: T): T => {
        const result = results[index]
        return result?.status === 'fulfilled' ? result.value as T : fallback
      }
      set({
        friends: value(0, []),
        received: value(1, []),
        sent: value(2, []),
        recommendations: value(3, []),
      })
    } catch {
      // silently fail — user may not be logged in
    }
  },

  searchUsers: async (q) => {
    if (q.trim().length < 2) {
      set({ searchResults: [] })
      return
    }
    set({ isSearching: true })
    try {
      const results = await friendApi.search(q)
      set({ searchResults: results })
    } finally {
      set({ isSearching: false })
    }
  },

  clearSearch: () => set({ searchResults: [] }),

  sendRequest: async (userId) => {
    const req = await friendApi.send(userId)
    set((s) => ({
      sent: [...s.sent, req],
      recommendations: s.recommendations.filter((friend) => friend.id !== userId),
    }))
  },

  acceptRequest: async (friendshipId) => {
    await friendApi.accept(friendshipId)
    let requesterId: number | undefined
    set((s) => {
      const accepted = s.received.find((r) => r.id === friendshipId)
      requesterId = accepted?.user?.id
      return {
        received: s.received.filter((r) => r.id !== friendshipId),
        friends: accepted?.user ? [...s.friends, accepted.user] : s.friends,
      }
    })
    if (requesterId !== undefined) {
      const { notifications, markRead } = useNotificationStore.getState()
      const notif = notifications.find(
        (n) => n.read_at === null && Number((n.data as Record<string, unknown>).requester_id) === requesterId,
      )
      if (notif) markRead(notif.id)
    }
  },

  declineRequest: async (friendshipId) => {
    await friendApi.decline(friendshipId)
    let requesterId: number | undefined
    set((s) => {
      const declined = s.received.find((r) => r.id === friendshipId)
      requesterId = declined?.user?.id
      return {
        received: s.received.filter((r) => r.id !== friendshipId),
        sent: s.sent.filter((r) => r.id !== friendshipId),
      }
    })
    if (requesterId !== undefined) {
      const { notifications, markRead } = useNotificationStore.getState()
      const notif = notifications.find(
        (n) => n.read_at === null && Number((n.data as Record<string, unknown>).requester_id) === requesterId,
      )
      if (notif) markRead(notif.id)
    }
  },

  removeFriend: async (userId) => {
    await friendApi.remove(userId)
    set((s) => ({ friends: s.friends.filter((f) => f.id !== userId) }))
  },
}))
