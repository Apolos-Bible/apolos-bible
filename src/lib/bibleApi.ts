import { api } from './api'
import { db } from './db'
import { getFrontendLocale } from './defaultAppLocale'
import {
  fromYouVersionClientId,
  parseYouVersionChapterHtml,
  remoteVerseApiId,
  usfmForBookSlug,
  youVersionBibleToApiVersion,
  youVersionIndexToApiBooks,
  type YouVersionCatalogResponse,
  type YouVersionIndex,
  type YouVersionPassage,
} from './youVersion'

export interface ApiVersion {
  id: number
  name: string
  abbreviation: string
  language: string
  provider?: 'local' | 'youversion'
  providerId?: number
  copyright?: string
  info?: string
  promotionalContent?: string
  publisherUrl?: string
  deepLink?: string
}

export interface ApiBook {
  id: number
  number: number
  name: string
  slug: string
  chapters_count: number
  usfm?: string
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
  provider?: 'local' | 'youversion'
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

export interface ApiSemanticResult {
  verse_id: number
  text: string
  book: string
  book_slug: string
  chapter: number
  verse: number
  score: number
}

export interface ApiSemanticResponse {
  seed_verse_id: number
  model: string
  results: ApiSemanticResult[]
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
  // Callers such as the offline downloader treat this promise as the durable
  // completion boundary. Do not report success while IndexedDB writes are
  // still racing in the background.
  if (isValid(fresh)) await write(fresh).catch(() => undefined)
  return fresh
}

const isArray = <T>(v: unknown): v is T[] => Array.isArray(v)

const chapterKey = (versionId: number, slug: string, n: number) => `${versionId}:${slug}:${n}`

export const bibleApi = {
  versions: async () => {
    const frontendLanguage = getFrontendLocale().split('-')[0]
    const local = await cacheFirst<ApiVersion[]>(
      // The API only returns published versions. Use a new cache key whenever
      // that publication contract changes so stale, formerly-visible versions
      // cannot survive indefinitely in IndexedDB.
      async () => (await db.versions.get('published:v1'))?.data,
      () => api.get<ApiVersion[]>('/api/versions'),
      (data) => db.versions.put({ key: 'published:v1', data }),
      isArray,
    )

    const languages = [...new Set([frontendLanguage, 'es', 'en'])]
    const remoteCatalogs = await Promise.all(languages.map(async (language) => {
      const remoteKey = `youversion:${language}:all:v2`

      return api.get<YouVersionCatalogResponse>(
        `/api/youversion/versions?language=${encodeURIComponent(language)}&popular=0`,
      )
        .then((response) => response.data.map(youVersionBibleToApiVersion))
        .then((data) => {
          void db.versions.put({ key: remoteKey, data }).catch(() => {})
          return data
        })
        .catch(async () => (await db.versions.get(remoteKey).catch(() => undefined))?.data ?? [])
    }))
    const remote = [...new Map(
      remoteCatalogs.flat().map((version) => [version.id, version]),
    ).values()]

    return [
      ...local.map((version) => ({ ...version, provider: version.provider ?? ('local' as const) })),
      ...remote,
    ]
  },
  books: (versionId: number) => {
    const youVersionId = fromYouVersionClientId(versionId)
    if (youVersionId !== null) {
      return cacheFirst<ApiBook[]>(
        async () => (await db.books.get(versionId))?.data,
        async () => {
          const index = await api.get<YouVersionIndex>(
            `/api/youversion/bibles/${youVersionId}/index`,
          )
          return youVersionIndexToApiBooks(index)
        },
        (data) => db.books.put({ versionId, data }),
        isArray,
      )
    }

    return cacheFirst<ApiBook[]>(
      async () => (await db.books.get(versionId))?.data,
      () => api.get<ApiBook[]>(`/api/versions/${versionId}/books`),
      (data) => db.books.put({ versionId, data }),
      isArray,
    )
  },
  chapter: async (versionId: number, slug: string, n: number) => {
    const youVersionId = fromYouVersionClientId(versionId)
    if (youVersionId !== null) {
      const book = usfmForBookSlug(slug)
      if (!book) throw Object.assign(new Error('Book not available in YouVersion'), { status: 404 })

      const passage = await api.get<YouVersionPassage>(
        `/api/youversion/bibles/${youVersionId}/passages/${book.usfm}.${n}?format=html&include_headings=0&include_notes=0`,
      )
      const verses = parseYouVersionChapterHtml(passage.content)
      if (verses.length === 0) throw new Error('YouVersion returned a chapter with no verse markers')

      return {
        book: { number: book.number, name: passage.reference.replace(/\s+\d+.*$/, ''), slug },
        chapter: n,
        chapter_id: 0,
        provider: 'youversion' as const,
        verses: verses.map((verse) => ({
          id: remoteVerseApiId(youVersionId, book.number, n, verse.number),
          number: verse.number,
          text: verse.text,
        })),
      }
    }

    return cacheFirst(
      async () => (await db.chapters.get(chapterKey(versionId, slug, n)))?.data,
      () => api.get<ApiChapterResponse>(`/api/versions/${versionId}/books/${slug}/chapters/${n}`),
      (data) => db.chapters.put({ key: chapterKey(versionId, slug, n), versionId, slug, chapter: n, data }),
    )
  },
  search: (versionId: number, q: string) => fromYouVersionClientId(versionId) !== null
    ? Promise.resolve([])
    : api.get<ApiSearchResult[]>(`/api/versions/${versionId}/search?q=${encodeURIComponent(q)}`),
  crossRefs: (verseId: number, versionId?: number) => {
    // Cache only the canonical (no version override) result; cross-version
    // mappings are cheap to recompute and we want fresh data when the user
    // switches reading version.
    if (versionId === undefined) {
      return cacheFirst<ApiCrossRef[]>(
        async () => (await db.crossRefs.get(verseId))?.data,
        () => api.get<ApiCrossRef[]>(`/api/verses/${verseId}/cross-references`),
        (data) => db.crossRefs.put({ verseId, data }),
        isArray,
      )
    }
    if (fromYouVersionClientId(versionId) !== null) return Promise.resolve([])
    return api.get<ApiCrossRef[]>(`/api/verses/${verseId}/cross-references?version_id=${versionId}`)
  },
  verseInVersion: (verseId: number, versionId: number) =>
    api.get<{
      id: number
      text: string
      verse: number
      chapter: number
      book: string
      slug: string
      version_id: number
      reference: string
    }>(`/api/verses/${verseId}/in/${versionId}`),
  semanticSimilar: (verseId: number, limit = 30, versionId?: number) => {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (versionId != null) qs.set('version_id', String(versionId))
    return api.get<ApiSemanticResponse>(`/api/verses/${verseId}/similar?${qs.toString()}`)
  },
  crossRefVerseIds: (chapterId: number) => cacheFirst<number[]>(
    async () => (await db.crossRefIds.get(chapterId))?.data,
    () => api.get<number[]>(`/api/chapters/${chapterId}/cross-ref-verse-ids`),
    (data) => db.crossRefIds.put({ chapterId, data }),
    isArray,
  ),
}
