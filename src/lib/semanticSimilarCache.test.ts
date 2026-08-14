import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bibleApi, type ApiSemanticResponse } from './bibleApi'
import { db } from './db'

const response: ApiSemanticResponse = {
  seed_verse_id: 100,
  model: 'test/model',
  dataset: 'dataset-7-abcdef123456',
  results: [{
    verse_id: 200,
    text: 'For God so loved the world',
    book: 'John',
    book_slug: 'john',
    chapter: 3,
    verse: 16,
    score: 0.92,
  }],
}

function successfulFetch(payload: ApiSemanticResponse = response) {
  return vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })))
}

beforeEach(async () => {
  await db.similarities.clear()
  vi.restoreAllMocks()
})

describe('semantic similarity cache', () => {
  it('[SEARCH-SEMANTIC-06] reuses a fresh IndexedDB response for the same request', async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal('fetch', fetchMock)

    const first = await bibleApi.semanticSimilar(100, 30, 7)
    const second = await bibleApi.semanticSimilar(100, 30, 7)

    expect(first).toEqual(response)
    expect(second).toEqual(response)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await db.similarities.get('100:7:30')).toMatchObject({
      dataset: response.dataset,
      data: response,
    })
  })

  it('[SEARCH-SEMANTIC-07] deduplicates simultaneous requests in one browser', async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal('fetch', fetchMock)

    const [first, second] = await Promise.all([
      bibleApi.semanticSimilar(100, 30, 7),
      bibleApi.semanticSimilar(100, 30, 7),
    ])

    expect(first).toEqual(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('[SEARCH-SEMANTIC-08] keeps versions isolated and falls back to stale data offline', async () => {
    const fetchMock = successfulFetch()
    vi.stubGlobal('fetch', fetchMock)

    await bibleApi.semanticSimilar(100, 30, 7)
    await bibleApi.semanticSimilar(100, 30, 8)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await db.similarities.update('100:7:30', { cachedAt: 0 })
    fetchMock.mockRejectedValueOnce(new Error('offline'))

    await expect(bibleApi.semanticSimilar(100, 30, 7)).resolves.toEqual(response)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
