import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/lib/api', () => ({ api: { post: mocks.post } }))

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 8, 23, 45, 0))
  localStorage.clear()
  mocks.post.mockReset().mockResolvedValue({ ok: true })
})

describe('pingReadingActivity', () => {
  it('does not publish reading telemetry without an authenticated session', async () => {
    const { pingReadingActivity } = await import('./readingActivity')
    pingReadingActivity({ book_name: 'Juan', book_slug: 'juan', chapter: 1, verse: 1, version: 'RVR1960' })
    await vi.advanceTimersByTimeAsync(3000)
    expect(mocks.post).not.toHaveBeenCalled()
  })

  it('coalesces rapid navigation and publishes the latest position with the local calendar date', async () => {
    localStorage.setItem('verbum_token', 'test-token')
    const { pingReadingActivity } = await import('./readingActivity')
    pingReadingActivity({ book_name: 'Juan', book_slug: 'juan', chapter: 1, verse: 1, version: 'RVR1960' })
    pingReadingActivity({ book_name: 'Juan', book_slug: 'juan', chapter: 2, verse: 1, version: 'RVR1960' })
    pingReadingActivity({ book_name: 'Juan', book_slug: 'juan', chapter: 3, verse: 1, version: 'RVR1960' })

    await vi.advanceTimersByTimeAsync(2499)
    expect(mocks.post).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.post).toHaveBeenCalledTimes(1)
    expect(mocks.post).toHaveBeenCalledWith('/api/user/reading-activity', {
      book_name: 'Juan',
      book_slug: 'juan',
      chapter: 3,
      verse: 1,
      version: 'RVR1960',
      local_date: '2026-08-08',
    })
  })
})
