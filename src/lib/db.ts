import Dexie, { Table } from 'dexie'
import type {
  ApiVersion,
  ApiBook,
  ApiChapterResponse,
  ApiCrossRef,
  ApiSemanticResponse,
} from './bibleApi'

interface VersionsRow {
  key: string
  data: ApiVersion[]
}

interface BooksRow {
  versionId: number
  data: ApiBook[]
}

interface ChapterRow {
  key: string // `${versionId}:${slug}:${chapter}`
  versionId: number
  slug: string
  chapter: number
  data: ApiChapterResponse
}

interface CrossRefRow {
  verseId: number
  data: ApiCrossRef[]
}

interface CrossRefIdsRow {
  chapterId: number
  data: number[]
}

interface SimilarityRow {
  key: string // `${verseId}:${versionId ?? 'canonical'}:${limit}`
  cachedAt: number
  dataset: string
  data: ApiSemanticResponse
}

class BibleDb extends Dexie {
  versions!: Table<VersionsRow, string>
  books!: Table<BooksRow, number>
  chapters!: Table<ChapterRow, string>
  crossRefs!: Table<CrossRefRow, number>
  crossRefIds!: Table<CrossRefIdsRow, number>
  similarities!: Table<SimilarityRow, string>

  constructor() {
    super('verbum-bible')
    this.version(1).stores({
      versions: 'key',
      books: 'versionId',
      chapters: 'key, versionId, slug',
      crossRefs: 'verseId',
      crossRefIds: 'chapterId',
    })
    // v2 adds queryable chapter coordinates. Dexie upgrades the indexes in
    // place, preserving every downloaded row from the original v1 schema.
    this.version(2).stores({
      versions: 'key',
      books: 'versionId',
      chapters: 'key, versionId, slug, chapter, [versionId+slug+chapter]',
      crossRefs: 'verseId',
      crossRefIds: 'chapterId',
    })
    // v3 keeps semantic results locally. They are bounded by a TTL in bibleApi;
    // the backend dataset token records which materialized generation produced them.
    this.version(3).stores({
      versions: 'key',
      books: 'versionId',
      chapters: 'key, versionId, slug, chapter, [versionId+slug+chapter]',
      crossRefs: 'verseId',
      crossRefIds: 'chapterId',
      similarities: 'key, cachedAt, dataset',
    })
  }
}

export const db = new BibleDb()
