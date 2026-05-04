import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/friendApi', () => ({
  friendApi: {
    notifications: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

const mockEchoOnNotification = vi.fn()
const mockEchoLeaveFn = vi.fn()
const mockEchoPrivateResult = {
  notification: mockEchoOnNotification,
}

const mockEcho = {
  private: vi.fn(() => mockEchoPrivateResult),
  leave: mockEchoLeaveFn,
}

vi.mock('@/lib/echo', () => ({
  initEcho: vi.fn(() => mockEcho),
  getEcho: vi.fn(() => mockEcho),
}))

vi.mock('@/lib/i18n', () => ({
  default: { t: vi.fn((k: string) => k), language: 'en' },
}))

vi.mock('../useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addToast: vi.fn(),
    })),
  },
}))

import { friendApi } from '@/lib/friendApi'
import { useNotificationStore } from '../useNotificationStore'
import type { AppNotification } from '@/types'

const mockFriendApi = friendApi as unknown as {
  notifications: ReturnType<typeof vi.fn>
  markRead: ReturnType<typeof vi.fn>
  markAllRead: ReturnType<typeof vi.fn>
}

const mockNotification: AppNotification = {
  id: 'notif-1',
  type: 'friend_request_received',
  data: { requester_id: 2, requester_name: 'Bob' },
  read_at: null,
  created_at: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  useNotificationStore.setState({
    notifications: [],
    unreadCount: 0,
  })
  // Reset module-level state from previous tests
  useNotificationStore.getState().stopPolling()
  useNotificationStore.getState().stopPush()
})

describe('useNotificationStore', () => {
  it('starts empty', () => {
    const state = useNotificationStore.getState()
    expect(state.notifications).toEqual([])
    expect(state.unreadCount).toBe(0)
  })

  it('load fetches notifications and counts unread', async () => {
    mockFriendApi.notifications.mockResolvedValueOnce([mockNotification])
    await useNotificationStore.getState().load()
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
    expect(useNotificationStore.getState().unreadCount).toBe(1)
  })

  it('load ignores read notifications in unread count', async () => {
    const readNotif = { ...mockNotification, read_at: '2024-01-01T00:00:00Z' }
    mockFriendApi.notifications.mockResolvedValueOnce([readNotif])
    await useNotificationStore.getState().load()
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('load handles errors silently', async () => {
    mockFriendApi.notifications.mockRejectedValueOnce(new Error('Fail'))
    await useNotificationStore.getState().load()
    expect(useNotificationStore.getState().notifications).toEqual([])
  })

  it('markRead marks notification as read', async () => {
    mockFriendApi.markRead.mockResolvedValueOnce({ ok: true })
    useNotificationStore.setState({
      notifications: [mockNotification],
      unreadCount: 1,
    })
    await useNotificationStore.getState().markRead('notif-1')
    expect(useNotificationStore.getState().notifications[0].read_at).not.toBeNull()
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('markAllRead marks all as read', async () => {
    mockFriendApi.markAllRead.mockResolvedValueOnce({ ok: true })
    useNotificationStore.setState({
      notifications: [mockNotification],
      unreadCount: 1,
    })
    await useNotificationStore.getState().markAllRead()
    expect(useNotificationStore.getState().unreadCount).toBe(0)
    expect(useNotificationStore.getState().notifications[0].read_at).not.toBeNull()
  })

  it('listenForPush registers echo notification listener', () => {
    useNotificationStore.getState().listenForPush('user-1')
    expect(mockEcho.private).toHaveBeenCalledWith('App.Models.User.user-1')
    expect(mockEchoOnNotification).toHaveBeenCalled()
  })

  it('listenForPush is idempotent', () => {
    useNotificationStore.getState().listenForPush('user-1')
    useNotificationStore.getState().listenForPush('user-1')
    expect(mockEcho.private).toHaveBeenCalledTimes(1)
  })

  it('stopPush leaves channel', () => {
    useNotificationStore.getState().listenForPush('user-2')
    useNotificationStore.getState().stopPush()
    expect(mockEchoLeaveFn).toHaveBeenCalledWith('App.Models.User.user-2')
  })

  it('stopPush does nothing if no channel', () => {
    useNotificationStore.getState().stopPush()
    expect(mockEchoLeaveFn).not.toHaveBeenCalled()
  })

  it('startPolling loads and sets up interval', () => {
    vi.useFakeTimers()
    useNotificationStore.getState().startPolling()
    expect(mockFriendApi.notifications).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(30_001)
    expect(mockFriendApi.notifications).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('stopPolling clears interval', () => {
    vi.useFakeTimers()
    useNotificationStore.getState().startPolling()
    expect(mockFriendApi.notifications).toHaveBeenCalledTimes(1)
    useNotificationStore.getState().stopPolling()
    vi.advanceTimersByTime(30_001)
    expect(mockFriendApi.notifications).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
