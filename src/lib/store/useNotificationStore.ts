import { create } from 'zustand'
import { friendApi } from '@/lib/friendApi'
import type { AppNotification } from '@/types'
import { initEcho, getEcho } from '@/lib/echo'
import { useUIStore } from './useUIStore'

type NotificationStore = {
  notifications: AppNotification[]
  unreadCount: number

  load: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  listenForPush: (userId: string) => void
  stopPush: () => void
}

let _pollInterval: ReturnType<typeof setInterval> | null = null
let _privateChannelName: string | null = null

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  load: async () => {
    try {
      const notifications = await friendApi.notifications()
      const unreadCount = notifications.filter(
        (n) => n.read_at === null &&
          (n.type === 'friend_request_received' || n.type === 'friend_request_accepted'),
      ).length
      set({ notifications, unreadCount })
    } catch {
      // silently fail — user may not be logged in
    }
  },

  startPolling: () => {
    if (_pollInterval) return
    get().load()
    _pollInterval = setInterval(() => get().load(), 30_000)
  },

  stopPolling: () => {
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
  },

  markRead: async (id) => {
    await friendApi.markRead(id)
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  markAllRead: async () => {
    await friendApi.markAllRead()
    set((s) => ({
      notifications: s.notifications.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    }))
  },

  listenForPush: (userId) => {
    if (_privateChannelName) return

    const echo = initEcho()
    if (!echo) return

    _privateChannelName = `App.Models.User.${userId}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    echo.private(_privateChannelName).notification((notif: any) => {
      const classType: string = notif.type ?? ''

      if (classType === 'App\\Notifications\\FriendRequestReceived') {
        const name: string = notif.requester_name ?? 'Someone'
        useUIStore.getState().addToast(`${name} sent you a friend request`, 'info')
        set((s) => ({ unreadCount: s.unreadCount + 1 }))
      } else if (classType === 'App\\Notifications\\FriendRequestAccepted') {
        const name: string = notif.acceptor_name ?? 'Someone'
        useUIStore.getState().addToast(`${name} accepted your friend request`, 'success')
        set((s) => ({ unreadCount: s.unreadCount + 1 }))
      }

      get().load()
    })
  },

  stopPush: () => {
    if (_privateChannelName) {
      getEcho()?.leave(_privateChannelName)
      _privateChannelName = null
    }
  },
}))
