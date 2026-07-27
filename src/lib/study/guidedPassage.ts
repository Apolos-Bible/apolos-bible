import { bibleApi } from '@/lib/bibleApi'
import type { GuidedRange } from './guidedApi'

export interface GuidedVerse {
  verseId: number
  reference: string
  version_id: number
  text: string
  verse: number
}

/** A chapter-only reference would flood the canvas; keep it to an opening slice. */
const MAX_VERSES_WITHOUT_RANGE = 25

/**
 * Resolve a guided step's ranges into verses in the reader's own translation.
 * The stored slug comes from the Spanish text the study was written from; the
 * chapter endpoint falls back to the canonical book number for other versions.
 */
export async function fetchGuidedVerses(ranges: GuidedRange[], versionId: number): Promise<GuidedVerse[]> {
  const verses: GuidedVerse[] = []

  for (const range of ranges) {
    if (!range.slug) continue

    const chapter = await bibleApi.chapter(versionId, range.slug, range.chapter)
    const last = chapter.verses[chapter.verses.length - 1]?.number ?? 1
    const start = range.start ?? 1
    const end = range.end ?? Math.min(last, start + MAX_VERSES_WITHOUT_RANGE - 1)

    chapter.verses
      .filter((verse) => verse.number >= start && verse.number <= end)
      .forEach((verse) => {
        verses.push({
          verseId: verse.id,
          reference: `${chapter.book.name} ${range.chapter}:${verse.number}`,
          version_id: versionId,
          text: verse.text,
          verse: verse.number,
        })
      })
  }

  return verses
}
