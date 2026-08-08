import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  downloadVersion: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
  bulkPut: vi.fn(),
  transaction: vi.fn(async (_mode, _table, callback) => callback()),
}))

vi.mock('./bibleApi', () => ({ bibleApi: { downloadVersion: mocks.downloadVersion } }))
vi.mock('./db', () => ({
  db: {
    chapters: {
      where: () => ({ equals: () => ({ delete: mocks.delete, count: mocks.count }) }),
      bulkPut: mocks.bulkPut,
    },
    transaction: mocks.transaction,
  },
}))

import { offlineAutoDownload, prefetchVersion, shouldAutoPrefetch } from './prefetchBible'

describe('offline download preference', () => {
  it('does not download a complete Bible automatically by default', () => {
    localStorage.removeItem('offlineAutoDownload')

    expect(offlineAutoDownload()).toBe('off')
    expect(shouldAutoPrefetch()).toBe(false)
  })

  it('preserves an explicit Wi-Fi preference', () => {
    localStorage.setItem('offlineAutoDownload', 'wifi')
    expect(offlineAutoDownload()).toBe('wifi')
  })
})

describe('prefetchVersion', () => {
  it('[OFFLINE-DOWNLOAD-01] makes concurrent callers await the same durable download', async () => {
    let release!: (payload: unknown) => void
    mocks.count.mockResolvedValue(0)
    mocks.downloadVersion.mockImplementation(() => new Promise((resolve) => { release = resolve }))
    const books = [{ slug: 'juan', chapters_count: 1 }]

    const automatic = prefetchVersion(91, books as never)
    let manualFinished = false
    const manual = prefetchVersion(91, books as never).then(() => { manualFinished = true })
    await Promise.resolve()

    expect(manualFinished).toBe(false)
    expect(mocks.downloadVersion).toHaveBeenCalledOnce()

    release({
      books: [{
        number: 43,
        name: 'Juan',
        slug: 'juan',
        chapters: [{ id: 123, number: 1, verses: [{ id: 456, number: 1, text: 'Texto' }] }],
      }],
    })
    await Promise.all([automatic, manual])
    expect(manualFinished).toBe(true)
    expect(mocks.bulkPut).toHaveBeenCalledWith([
      expect.objectContaining({ key: '91:juan:1', versionId: 91, chapter: 1 }),
    ])
  })
})
