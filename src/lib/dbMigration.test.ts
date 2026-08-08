import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

const DB_NAME = 'verbum-bible'

afterEach(async () => {
  await Dexie.delete(DB_NAME)
})

describe('Bible IndexedDB migrations', () => {
  it('[OFFLINE-MIGRATE-01] upgrades the v1 schema without losing downloaded content', async () => {
    await Dexie.delete(DB_NAME)
    const legacy = new Dexie(DB_NAME)
    legacy.version(1).stores({
      versions: 'key',
      books: 'versionId',
      chapters: 'key, versionId, slug',
      crossRefs: 'verseId',
      crossRefIds: 'chapterId',
    })
    await legacy.open()
    await legacy.table('versions').put({ key: 'published:v1', data: [{ id: 1, name: 'RVR1960' }] })
    await legacy.table('books').put({ versionId: 1, data: [{ slug: 'juan', chapters_count: 21 }] })
    await legacy.table('chapters').put({
      key: '1:juan:3',
      versionId: 1,
      slug: 'juan',
      chapter: 3,
      data: { book: { name: 'Juan', slug: 'juan' }, chapter: 3, verses: [{ number: 16, text: 'Porque de tal manera amó Dios.' }] },
    })
    legacy.close()

    const { db } = await import('./db')
    await db.open()

    expect(db.verno).toBe(2)
    expect(await db.versions.get('published:v1')).toMatchObject({ data: [{ id: 1, name: 'RVR1960' }] })
    expect(await db.books.get(1)).toMatchObject({ data: [{ slug: 'juan', chapters_count: 21 }] })
    expect(await db.chapters.get('1:juan:3')).toMatchObject({
      versionId: 1,
      slug: 'juan',
      chapter: 3,
      data: { verses: [{ number: 16, text: 'Porque de tal manera amó Dios.' }] },
    })
    expect(await db.chapters.where('[versionId+slug+chapter]').equals([1, 'juan', 3]).count()).toBe(1)
    db.close()
  })
})
