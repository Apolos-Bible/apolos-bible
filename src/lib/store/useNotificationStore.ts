import { create } from 'zustand'
import { friendApi } from '@/lib/friendApi'
import type { AppNotification } from '@/types'
import { initEcho, getEcho } from '@/lib/echo'
import i18n from '@/lib/i18n'
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
const _seenPushIds = new Set<string>()

function countsAsUnread(notification: AppNotification): boolean {
  return notification.read_at === null && (
    notification.type === 'friend_request_received'
    || notification.type === 'friend_request_accepted'
    || notification.type === 'game_invitation'
    || notification.type === 'guided_plan_moderation'
  )
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  load: async () => {
    try {
      const notifications = await friendApi.notifications()
      const unreadCount = notifications.filter(countsAsUnread).length
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
    set((s) => {
      const target = s.notifications.find((notification) => notification.id === id)
      return {
        notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
        unreadCount: target && countsAsUnread(target) ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }
    })
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
      const notificationId = typeof notif.id === 'string' ? notif.id : null
      if (notificationId && _seenPushIds.has(notificationId)) return
      if (notificationId) _seenPushIds.add(notificationId)

      const classType: string = notif.type ?? ''

      if (classType === 'App\\Notifications\\FriendRequestReceived') {
        const name: string = notif.requester_name ?? i18n.t('notification.someone')
        useUIStore.getState().addToast(i18n.t('notification.friendRequest', { name }), 'info')
        set((s) => ({ unreadCount: s.unreadCount + 1 }))
      } else if (classType === 'App\\Notifications\\FriendRequestAccepted') {
        const name: string = notif.acceptor_name ?? i18n.t('notification.someone')
        useUIStore.getState().addToast(i18n.t('notification.friendAccepted', { name }), 'success')
        set((s) => ({ unreadCount: s.unreadCount + 1 }))
      } else if (classType === 'App\\Notifications\\GameInvitationReceived') {
        const name: string = notif.inviter_name ?? i18n.t('notification.someone')
        useUIStore.getState().addToast(i18n.t('notification.gameInvitation', { name }), 'info')
        set((s) => ({ unreadCount: s.unreadCount + 1 }))
      }

      get().load()
    })
  },

  stopPush: () => {
    if (_privateChannelName) {
      getEcho()?.leave(_privateChannelName)
      _privateChannelName = null
      _seenPushIds.clear()
    }
  },
}))
