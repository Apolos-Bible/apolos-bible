import { beforeEach, describe, expect, it, vi } from 'vitest'

const isPermissionGranted = vi.fn()
const requestPermission = vi.fn()
const sendNotification = vi.fn()

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted,
  requestPermission,
  sendNotification,
}))

function setPlatform(userAgent: string, tauri = true) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  if (tauri) {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} })
  } else {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  }
}

describe('desktop chat notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    setPlatform('Mozilla/5.0 Macintosh Intel Mac OS X')
    isPermissionGranted.mockResolvedValue(true)
  })

  it('requests permission and stops when it is denied', async () => {
    isPermissionGranted.mockResolvedValue(false)
    requestPermission.mockResolvedValue('denied')
    const { notifyChatMessage } = await import('./desktopNotify')

    await notifyChatMessage(1, 'Ana', 'Hola')

    expect(requestPermission).toHaveBeenCalledOnce()
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('shows one message and groups subsequent messages per conversation', async () => {
    const { notifyChatMessage } = await import('./desktopNotify')

    await notifyChatMessage(7, 'Ana', 'Primero')
    await notifyChatMessage(7, 'Luis', 'Segundo')

    expect(sendNotification).toHaveBeenNthCalledWith(1, { title: 'Ana', body: 'Primero' })
    expect(sendNotification).toHaveBeenNthCalledWith(2, {
      title: 'Ana y Luis',
      body: '2 mensajes nuevos',
    })
  })

  it('clears grouping state when a conversation is opened', async () => {
    const { clearChatNotifications, notifyChatMessage } = await import('./desktopNotify')
    await notifyChatMessage(7, 'Ana', 'Primero')

    clearChatNotifications(7)
    await notifyChatMessage(7, 'Luis', 'Nuevo')

    expect(sendNotification).toHaveBeenLastCalledWith({ title: 'Luis', body: 'Nuevo' })
  })

  it.each([
    ['web', 'Mozilla/5.0 Windows NT 10.0', false],
    ['Android', 'Mozilla/5.0 Android 15', true],
    ['iOS', 'Mozilla/5.0 iPad OS 18_0', true],
  ])('does not invoke the desktop plugin on %s', async (_name, userAgent, tauri) => {
    setPlatform(userAgent, tauri)
    const { notifyChatMessage } = await import('./desktopNotify')

    await notifyChatMessage(1, 'Ana', 'Hola')

    expect(isPermissionGranted).not.toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })
})
