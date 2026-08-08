import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  getCurrent: vi.fn<() => Promise<string[] | null>>(),
  onOpenUrl: vi.fn(),
  unlisten: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({ isTauri: mocks.isTauri }))
vi.mock('@tauri-apps/plugin-deep-link', () => ({
  getCurrent: mocks.getCurrent,
  onOpenUrl: mocks.onOpenUrl,
}))

import { registerAuthDeepLink } from './deepLink'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isTauri.mockReturnValue(true)
  mocks.getCurrent.mockResolvedValue(null)
  mocks.onOpenUrl.mockResolvedValue(mocks.unlisten)
})

describe('[AUTH-DEEPLINK-01][NATIVE-DEEPLINK-01][LANDING-BRIDGE-01] Tauri deep-link adapter', () => {
  it('forwards a cold-start OAuth URL to the token-consuming SPA route', async () => {
    mocks.getCurrent.mockResolvedValue([
      'tulia://auth/finish?provider=google&token=secret-token',
    ])
    const navigate = vi.fn()

    registerAuthDeepLink(navigate)
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(
      '/auth/google/finish#token=secret-token',
      { replace: true },
    ))
  })

  it('forwards a live deep link and ignores unsupported paths', async () => {
    let listener: ((urls: string[]) => void) | undefined
    mocks.onOpenUrl.mockImplementation(async (callback: (urls: string[]) => void) => {
      listener = callback
      return mocks.unlisten
    })
    const navigate = vi.fn()
    registerAuthDeepLink(navigate)
    await vi.waitFor(() => expect(listener).toBeDefined())

    listener?.(['tulia://settings/profile?token=must-not-leak'])
    listener?.(['tulia://auth/finish?provider=youversion&data_exchange=connected'])

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith(
      '/auth/youversion/finish?data_exchange=connected',
      { replace: true },
    )
  })

  it('deduplicates the same URL delivered by cold-start and live APIs', async () => {
    const url = 'tulia://auth/finish?provider=google&token=one-use'
    let listener: ((urls: string[]) => void) | undefined
    mocks.getCurrent.mockResolvedValue([url])
    mocks.onOpenUrl.mockImplementation(async (callback: (urls: string[]) => void) => {
      listener = callback
      return mocks.unlisten
    })
    const navigate = vi.fn()
    registerAuthDeepLink(navigate)
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    listener?.([url])
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('unregisters even if disposal wins the async listener-registration race', async () => {
    let resolveListener: ((unlisten: () => void) => void) | undefined
    mocks.onOpenUrl.mockReturnValue(new Promise((resolve) => { resolveListener = resolve }))
    const dispose = registerAuthDeepLink(vi.fn())
    dispose()
    resolveListener?.(mocks.unlisten)
    await vi.waitFor(() => expect(mocks.unlisten).toHaveBeenCalledTimes(1))
  })

  it('does not load native APIs in the web build', () => {
    mocks.isTauri.mockReturnValue(false)
    const dispose = registerAuthDeepLink(vi.fn())
    dispose()
    expect(mocks.getCurrent).not.toHaveBeenCalled()
    expect(mocks.onOpenUrl).not.toHaveBeenCalled()
  })
})
