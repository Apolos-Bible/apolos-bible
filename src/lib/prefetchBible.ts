import { bibleApi, type ApiBook } from './bibleApi'
import { db } from './db'

const inflight = new Map<number, Promise<void>>()

export type OfflineAutoDownload = 'off' | 'wifi' | 'always'

export function offlineAutoDownload(): OfflineAutoDownload {
  const value = localStorage.getItem('offlineAutoDownload')
  return value === 'off' || value === 'always' ? value : 'wifi'
}

export function shouldAutoPrefetch(): boolean {
  const preference = offlineAutoDownload()
  if (preference === 'off') return false
  if (preference === 'always') return true
  const connection = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean } }).connection
  if (connection?.saveData) return false
  return !connection?.type || connection.type === 'wifi' || connection.type === 'ethernet'
}

export async function prefetchVersion(
  versionId: number,
  books: ApiBook[],
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const existing = inflight.get(versionId)
  if (existing) {
    await existing
    return
  }

  const download = (async () => {
    const expectedChapters = books.reduce((total, book) => total + book.chapters_count, 0)
    const cachedChapters = await db.chapters.where('versionId').equals(versionId).count()
    if (expectedChapters > 0 && cachedChapters === expectedChapters) return

    const payload = await bibleApi.downloadVersion(versionId)
    const rows = payload.books.flatMap((book) => book.chapters.map((chapter) => ({
      key: `${versionId}:${book.slug}:${chapter.number}`,
      versionId,
      slug: book.slug,
      chapter: chapter.number,
      data: {
        book: { number: book.number, name: book.name, slug: book.slug },
        chapter: chapter.number,
        chapter_id: chapter.id,
        verses: chapter.verses,
        provider: 'local' as const,
      },
    })))
    if (rows.length === 0) throw new Error('The downloaded Bible contains no chapters')

    const total = rows.length
    onProgress?.(0, total)
    await db.transaction('rw', db.chapters, async () => {
      await db.chapters.where('versionId').equals(versionId).delete()
      await db.chapters.bulkPut(rows)
    })
    onProgress?.(total, total)
  })()

  inflight.set(versionId, download)
  try {
    await download
  } finally {
    if (inflight.get(versionId) === download) inflight.delete(versionId)
  }
}
