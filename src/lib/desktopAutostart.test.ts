import { beforeEach, describe, expect, it, vi } from 'vitest'

const isEnabled = vi.fn()
const enable = vi.fn()

vi.mock('@tauri-apps/plugin-autostart', () => ({ isEnabled, enable }))

function setPlatform(userAgent: string, tauri = true) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  if (tauri) {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} })
  } else {
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
  }
}

describe('desktop autostart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setPlatform('Mozilla/5.0 Windows NT 10.0')
  })

  it('enables launch-on-login once on desktop', async () => {
    isEnabled.mockResolvedValue(false)
    const { ensureAutostart } = await import('./desktopAutostart')

    await ensureAutostart()
    await ensureAutostart()

    expect(isEnabled).toHaveBeenCalledTimes(1)
    expect(enable).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('verbum_autostart_initialized')).toBe('1')
  })

  it('records an already-enabled installation without enabling it again', async () => {
    isEnabled.mockResolvedValue(true)
    const { ensureAutostart } = await import('./desktopAutostart')

    await ensureAutostart()

    expect(enable).not.toHaveBeenCalled()
    expect(localStorage.getItem('verbum_autostart_initialized')).toBe('1')
  })

  it.each([
    ['ordinary web', 'Mozilla/5.0 Windows NT 10.0', false],
    ['Android', 'Mozilla/5.0 Android 15', true],
    ['iOS', 'Mozilla/5.0 iPhone OS 18_0', true],
  ])('does nothing on %s', async (_name, userAgent, tauri) => {
    setPlatform(userAgent, tauri)
    const { ensureAutostart } = await import('./desktopAutostart')

    await ensureAutostart()

    expect(isEnabled).not.toHaveBeenCalled()
    expect(enable).not.toHaveBeenCalled()
  })

  it('leaves initialization retryable when the plugin fails', async () => {
    isEnabled.mockRejectedValue(new Error('plugin unavailable'))
    const { ensureAutostart } = await import('./desktopAutostart')

    await expect(ensureAutostart()).resolves.toBeUndefined()
    expect(localStorage.getItem('verbum_autostart_initialized')).toBeNull()
  })
})
