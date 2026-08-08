import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ chapter: vi.fn(), primaryKeys: vi.fn() }))

vi.mock('./bibleApi', () => ({ bibleApi: { chapter: mocks.chapter } }))
vi.mock('./db', () => ({
  db: { chapters: { where: () => ({ equals: () => ({ primaryKeys: mocks.primaryKeys }) }) } },
}))

import { prefetchVersion } from './prefetchBible'

describe('prefetchVersion', () => {
  it('[OFFLINE-DOWNLOAD-01] makes concurrent callers await the same durable download', async () => {
    mocks.primaryKeys.mockResolvedValue([])
    let release!: () => void
    mocks.chapter.mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))
    const book = { slug: 'juan', chapters_count: 1 }

    const automatic = prefetchVersion(91, [book] as never)
    let manualFinished = false
    const manual = prefetchVersion(91, [book] as never).then(() => { manualFinished = true })
    await Promise.resolve()

    expect(manualFinished).toBe(false)
    expect(mocks.chapter).toHaveBeenCalledOnce()

    release()
    await Promise.all([automatic, manual])
    expect(manualFinished).toBe(true)
  })
})
