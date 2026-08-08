import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  onMessage: vi.fn(),
  deleteToken: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  getMessaging: vi.fn(),
  requestPermission: vi.fn(),
  getRegistrations: vi.fn(),
  register: vi.fn(),
}))

vi.mock('firebase/messaging', () => ({
  getToken: mocks.getToken,
  onMessage: mocks.onMessage,
  deleteToken: mocks.deleteToken,
}))
vi.mock('@/lib/api', () => ({
  api: { post: mocks.apiPost, delete: mocks.apiDelete },
}))
vi.mock('@/lib/firebase', () => ({
  getFirebaseMessaging: mocks.getMessaging,
  VAPID_KEY: 'test-vapid-key',
}))

import { disablePush, enablePush, pushPermissionState } from './push'

function setPermission(permission: NotificationPermission) {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { permission, requestPermission: mocks.requestPermission },
  })
}

describe('push registration lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setPermission('granted')
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: mocks.getRegistrations,
        register: mocks.register,
      },
    })
    mocks.getRegistrations.mockResolvedValue([])
    mocks.register.mockResolvedValue({ scope: '/' })
    mocks.getMessaging.mockResolvedValue({ app: 'messaging' })
    mocks.getToken.mockResolvedValue('firebase-token')
    mocks.apiPost.mockResolvedValue({ id: 1 })
    mocks.apiDelete.mockResolvedValue(undefined)
    mocks.deleteToken.mockResolvedValue(true)
  })

  it('[NOTIFY-PUSH-01] reports denied permission without requesting or registering', async () => {
    setPermission('denied')

    await expect(enablePush()).resolves.toEqual({ ok: false, reason: 'denied' })
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    expect(mocks.apiPost).not.toHaveBeenCalled()
    expect(pushPermissionState()).toBe('denied')
  })

  it('[NOTIFY-PUSH-01] stops when a user rejects the browser permission prompt', async () => {
    setPermission('default')
    mocks.requestPermission.mockResolvedValue('denied')

    await expect(enablePush()).resolves.toEqual({ ok: false, reason: 'denied' })
    expect(mocks.requestPermission).toHaveBeenCalledOnce()
    expect(mocks.getMessaging).not.toHaveBeenCalled()
  })

  it('[NOTIFY-PUSH-01] registers a granted token once with its service worker', async () => {
    await expect(enablePush()).resolves.toEqual({ ok: true })
    await expect(enablePush()).resolves.toEqual({ ok: true })

    expect(mocks.register).toHaveBeenCalledWith('/firebase-messaging-sw.js')
    expect(mocks.getToken).toHaveBeenCalledWith(
      { app: 'messaging' },
      expect.objectContaining({ vapidKey: 'test-vapid-key' }),
    )
    expect(mocks.apiPost).toHaveBeenCalledOnce()
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/push/subscriptions', expect.objectContaining({
      token: 'firebase-token',
      platform: 'web',
    }))
    expect(localStorage.getItem('verbum_push_token')).toBe('firebase-token')
  })

  it('[NOTIFY-PUSH-01] retries registration after a transient API failure', async () => {
    mocks.apiPost.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 1 })

    await expect(enablePush()).rejects.toThrow('offline')
    expect(localStorage.getItem('verbum_push_token')).toBeNull()
    await expect(enablePush()).resolves.toEqual({ ok: true })
    expect(mocks.apiPost).toHaveBeenCalledTimes(2)
  })

  it('[NOTIFY-PUSH-01] unregisters the stored token locally and remotely', async () => {
    localStorage.setItem('verbum_push_token', 'firebase-token')

    await disablePush()

    expect(mocks.apiDelete).toHaveBeenCalledWith('/api/push/subscriptions/firebase-token')
    expect(mocks.deleteToken).toHaveBeenCalledWith({ app: 'messaging' })
    expect(localStorage.getItem('verbum_push_token')).toBeNull()
  })
})
