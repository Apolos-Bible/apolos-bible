import { bibleApi, ApiBook } from './bibleApi'
import { db } from './db'

const inflight = new Set<number>()
const CONCURRENCY = 4

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
  if (inflight.has(versionId)) return
  inflight.add(versionId)
  try {
    const cachedKeys = new Set((await db.chapters.where('versionId').equals(versionId).primaryKeys()) as string[])
    const tasks: Array<{ slug: string; n: number }> = []
    for (const book of books) {
      for (let n = 1; n <= book.chapters_count; n++) {
        if (!cachedKeys.has(`${versionId}:${book.slug}:${n}`)) tasks.push({ slug: book.slug, n })
      }
    }
    if (!tasks.length) return
    const total = tasks.length
    let completed = 0
    onProgress?.(0, total)

    let i = 0
    const worker = async () => {
      while (i < tasks.length) {
        const idx = i++
        const t = tasks[idx]
        try {
          await bibleApi.chapter(versionId, t.slug, t.n)
          completed += 1
          onProgress?.(completed, total)
        } catch {
          // network down or rate-limited; bail this worker
          return
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  } finally {
    inflight.delete(versionId)
  }
}
