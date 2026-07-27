import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/bibleApi', () => ({
  bibleApi: { chapter: vi.fn() },
}))

import { bibleApi } from '@/lib/bibleApi'
import { fetchGuidedVerses } from '../guidedPassage'
import type { GuidedRange } from '../guidedApi'

const mockChapter = bibleApi.chapter as unknown as ReturnType<typeof vi.fn>

const chapterOf = (name: string, count: number) => ({
  book: { number: 24, name, slug: name.toLowerCase() },
  chapter: 29,
  chapter_id: 1,
  verses: Array.from({ length: count }, (_, i) => ({
    id: 1000 + i + 1,
    number: i + 1,
    text: `texto ${i + 1}`,
  })),
})

const range = (over: Partial<GuidedRange> = {}): GuidedRange => ({
  book: 'Jeremías',
  slug: 'jeremias',
  book_number: 24,
  chapter: 29,
  start: 11,
  end: 14,
  ...over,
})

describe('fetchGuidedVerses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChapter.mockResolvedValue(chapterOf('Jeremías', 32))
  })

  it('returns only the verses the range asks for', async () => {
    const verses = await fetchGuidedVerses([range()], 28)

    expect(verses.map((v) => v.verse)).toEqual([11, 12, 13, 14])
    expect(verses[0].reference).toBe('Jeremías 29:11')
    expect(verses[0].version_id).toBe(28)
    expect(mockChapter).toHaveBeenCalledWith(28, 'jeremias', 29)
  })

  it('concatenates several ranges in order', async () => {
    const verses = await fetchGuidedVerses(
      [range({ start: 11, end: 12 }), range({ start: 20, end: 20 })],
      28,
    )

    expect(verses.map((v) => v.verse)).toEqual([11, 12, 20])
  })

  it('caps a chapter-only reference instead of flooding the canvas', async () => {
    mockChapter.mockResolvedValue(chapterOf('Salmos', 176))

    const verses = await fetchGuidedVerses([range({ start: null, end: null })], 28)

    expect(verses).toHaveLength(25)
    expect(verses[0].verse).toBe(1)
  })

  it('skips a range whose book could not be resolved', async () => {
    const verses = await fetchGuidedVerses([range({ slug: null })], 28)

    expect(verses).toEqual([])
    expect(mockChapter).not.toHaveBeenCalled()
  })
})
