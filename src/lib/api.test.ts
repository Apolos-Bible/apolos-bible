import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from './api'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('impersonation API diagnostics', () => {
  it('preserves backend debug data and announces it to the support UI', async () => {
    const listener = vi.fn()
    window.addEventListener('apolos:impersonation-error', listener)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Database exploded',
      debug: {
        exception: 'RuntimeException',
        file: '/app/Service.php',
        line: 42,
        trace: '#0 ...',
      },
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })))

    const request = api.get('/api/broken')

    await expect(request).rejects.toMatchObject({
      message: 'Database exploded',
      status: 500,
      debug: {
        exception: 'RuntimeException',
        file: '/app/Service.php',
        line: 42,
        trace: '#0 ...',
      },
    } satisfies Partial<ApiError>)
    expect(listener).toHaveBeenCalledOnce()

    window.removeEventListener('apolos:impersonation-error', listener)
  })

  it('does not announce ordinary generic API failures', async () => {
    const listener = vi.fn()
    window.addEventListener('apolos:impersonation-error', listener)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Server Error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })))

    await expect(api.get('/api/broken')).rejects.toThrow('Server Error')
    expect(listener).not.toHaveBeenCalled()

    window.removeEventListener('apolos:impersonation-error', listener)
  })
})
