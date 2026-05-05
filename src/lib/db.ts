import Dexie, { Table } from 'dexie'
import type {
  ApiVersion,
  ApiBook,
  ApiChapterResponse,
  ApiCrossRef,
} from './bibleApi'

interface VersionsRow {
  key: 'all'
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

class BibleDb extends Dexie {
  versions!: Table<VersionsRow, string>
  books!: Table<BooksRow, number>
  chapters!: Table<ChapterRow, string>
  crossRefs!: Table<CrossRefRow, number>
  crossRefIds!: Table<CrossRefIdsRow, number>

  constructor() {
    super('verbum-bible')
    this.version(1).stores({
      versions: 'key',
      books: 'versionId',
      chapters: 'key, versionId, slug',
      crossRefs: 'verseId',
      crossRefIds: 'chapterId',
    })
  }
}

export const db = new BibleDb()
