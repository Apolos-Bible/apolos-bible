import { bibleApi, ApiBook } from './bibleApi'
import { db } from './db'

const inflight = new Set<number>()
const CONCURRENCY = 4

export async function prefetchVersion(versionId: number, books: ApiBook[]): Promise<void> {
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

    let i = 0
    const worker = async () => {
      while (i < tasks.length) {
        const idx = i++
        const t = tasks[idx]
        try {
          await bibleApi.chapter(versionId, t.slug, t.n)
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
