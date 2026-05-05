import { api } from './api'
import { db } from './db'

export interface ApiVersion {
  id: number
  name: string
  abbreviation: string
  language: string
}

export interface ApiBook {
  id: number
  number: number
  name: string
  slug: string
  chapters_count: number
}

export interface ApiVerse {
  id: number
  number: number
  text: string
}

export interface ApiChapterResponse {
  book: { number: number; name: string; slug: string }
  chapter: number
  chapter_id: number
  verses: ApiVerse[]
}

export interface ApiSearchResult {
  id: number
  book: string
  slug: string
  chapter: number
  verse: number
  text: string
  chapterGroup?: string
}

export interface ApiCrossRef {
  id: number
  book: string
  slug: string
  chapter: number
  verse: number
  text: string
}

async function cacheFirst<T>(
  read: () => Promise<T | undefined>,
  fetcher: () => Promise<T>,
  write: (v: T) => Promise<unknown>,
  isValid: (v: unknown) => v is T = (v): v is T => v != null,
): Promise<T> {
  const cached = await read().catch(() => undefined)
  if (cached !== undefined && isValid(cached)) return cached
  const fresh = await fetcher().catch(async (e) => {
    const fallback = await read().catch(() => undefined)
    if (fallback !== undefined && isValid(fallback)) return fallback
    throw e
  })
  if (isValid(fresh)) write(fresh).catch(() => {})
  return fresh
}

const isArray = <T>(v: unknown): v is T[] => Array.isArray(v)

const chapterKey = (versionId: number, slug: string, n: number) => `${versionId}:${slug}:${n}`

export const bibleApi = {
  versions: () => cacheFirst<ApiVersion[]>(
    async () => (await db.versions.get('all'))?.data,
    () => api.get<ApiVersion[]>('/api/versions'),
    (data) => db.versions.put({ key: 'all', data }),
    isArray,
  ),
  books: (versionId: number) => cacheFirst<ApiBook[]>(
    async () => (await db.books.get(versionId))?.data,
    () => api.get<ApiBook[]>(`/api/versions/${versionId}/books`),
    (data) => db.books.put({ versionId, data }),
    isArray,
  ),
  chapter: (versionId: number, slug: string, n: number) => cacheFirst(
    async () => (await db.chapters.get(chapterKey(versionId, slug, n)))?.data,
    () => api.get<ApiChapterResponse>(`/api/versions/${versionId}/books/${slug}/chapters/${n}`),
    (data) => db.chapters.put({ key: chapterKey(versionId, slug, n), versionId, slug, chapter: n, data }),
  ),
  search: (versionId: number, q: string) => api.get<ApiSearchResult[]>(`/api/versions/${versionId}/search?q=${encodeURIComponent(q)}`),
  crossRefs: (verseId: number) => cacheFirst<ApiCrossRef[]>(
    async () => (await db.crossRefs.get(verseId))?.data,
    () => api.get<ApiCrossRef[]>(`/api/verses/${verseId}/cross-references`),
    (data) => db.crossRefs.put({ verseId, data }),
    isArray,
  ),
  crossRefVerseIds: (chapterId: number) => cacheFirst<number[]>(
    async () => (await db.crossRefIds.get(chapterId))?.data,
    () => api.get<number[]>(`/api/chapters/${chapterId}/cross-ref-verse-ids`),
    (data) => db.crossRefIds.put({ chapterId, data }),
    isArray,
  ),
}
