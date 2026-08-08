import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

async function seedLegacyOfflineDatabase(page: import('@playwright/test').Page) {
  await page.route('**/__offline-seed', (route) => route.fulfill({
    contentType: 'text/html',
    body: '<!doctype html><title>offline seed</title>',
  }))
  await page.goto('/__offline-seed')
  await page.evaluate(async () => {
    localStorage.setItem('offlineAutoDownload', 'off')
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase('verbum-bible')
      deletion.onsuccess = () => resolve()
      deletion.onerror = () => reject(deletion.error)
    })
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('verbum-bible', 10)
      request.onupgradeneeded = () => {
        const database = request.result
        database.createObjectStore('versions', { keyPath: 'key' })
        database.createObjectStore('books', { keyPath: 'versionId' })
        const chapters = database.createObjectStore('chapters', { keyPath: 'key' })
        chapters.createIndex('versionId', 'versionId')
        chapters.createIndex('slug', 'slug')
        database.createObjectStore('crossRefs', { keyPath: 'verseId' })
        database.createObjectStore('crossRefIds', { keyPath: 'chapterId' })
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction(['versions', 'books', 'chapters'], 'readwrite')
        transaction.objectStore('versions').put({ key: 'published:v1', data: [{ id: 1, name: 'Reina Valera 1960', abbreviation: 'RVR1960', language: 'es', provider: 'local' }] })
        transaction.objectStore('books').put({ versionId: 1, data: [{ id: 43, number: 43, name: 'Juan', slug: 'juan', chapters_count: 21 }] })
        transaction.objectStore('chapters').put({
          key: '1:juan:3', versionId: 1, slug: 'juan', chapter: 3,
          data: { book: { number: 43, name: 'Juan', slug: 'juan' }, chapter: 3, chapter_id: 43003, verses: [{ id: 43003016, number: 16, text: 'Porque de tal manera amó Dios.' }] },
        })
        transaction.oncomplete = () => { database.close(); resolve() }
        transaction.onerror = () => reject(transaction.error)
      }
    })
  })
}

test('[SETTINGS-STORAGE-01][OFFLINE-DOWNLOAD-01][OFFLINE-READ-01][OFFLINE-DELETE-01] downloads, reads offline, and safely removes one Bible', async ({ page }) => {
  const downloadRequests: string[] = []
  await installApiMock(page, (path) => {
    if (/\/versions\/\d+\/download$/.test(path)) downloadRequests.push(path)
  })
  await page.goto('/ajustes#almacenamiento', { waitUntil: 'domcontentloaded' })

  const empty = page.getByText(/No complete Bibles .*downloaded yet|Todav.a no hay Biblias completas descargadas/i)
  await expect(empty).toBeVisible()
  await page.getByRole('button', { name: /^Download$|^Descargar$/i }).click()

  await expect(page.getByRole('status')).toContainText(/Available offline|Disponible sin conexi.n/i, { timeout: 30_000 })
  expect(downloadRequests).toEqual(['/api/versions/1/download'])
  await expect(page.getByText('Reina Valera 1960', { exact: true })).toBeVisible()
  await expect(page.getByText(/71 chapters|71 cap.tulos/i)).toBeVisible()

  let blockedChapterRequests = 0
  await page.route('**/api/versions/**', async (route) => {
    if (route.request().url().includes('/chapters/')) blockedChapterRequests += 1
    await route.abort('internetdisconnected')
  })
  await page.goto('/bible/juan/5', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('listitem').filter({ hasText: /En el principio era el Verbo/ })).toBeVisible()
  await page.goto('/bible/juan/6', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('listitem').filter({ hasText: /En el principio era el Verbo/ })).toBeVisible()
  expect(blockedChapterRequests).toBe(0)

  await page.goto('/ajustes#almacenamiento', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('status')).toContainText(/Available offline|Disponible sin conexi.n/i)

  let confirmation = ''
  page.once('dialog', async (dialog) => {
    confirmation = dialog.message()
    await dialog.accept()
  })
  await page.getByRole('button', { name: /Remove download|Eliminar descarga/i }).click()

  await expect.poll(() => confirmation).toMatch(/Reina Valera 1960/)
  await expect(empty).toBeVisible()
  await expect(page.getByRole('button', { name: /^Download$|^Descargar$/i })).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(empty).toBeVisible()
})

test('[OFFLINE-MIGRATE-01] upgrades a v1 offline database without losing its chapter', async ({ page }) => {
  await seedLegacyOfflineDatabase(page)
  await installApiMock(page)
  await page.goto('/ajustes#almacenamiento', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Reina Valera 1960', { exact: true })).toBeVisible()
  await expect(page.getByText(/1 chapter|1 cap.tulo/i)).toBeVisible()

  const migrated = await page.evaluate(async () => new Promise<{ version: number; indexed: boolean; text: string }>((resolve, reject) => {
    const request = indexedDB.open('verbum-bible')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('chapters', 'readonly')
      const store = transaction.objectStore('chapters')
      const get = store.get('1:juan:3')
      get.onsuccess = () => {
        resolve({
          version: database.version,
          indexed: store.indexNames.contains('[versionId+slug+chapter]'),
          text: get.result.data.verses[0].text,
        })
        database.close()
      }
      get.onerror = () => reject(get.error)
    }
  }))

  expect(migrated).toEqual({
    version: 20,
    indexed: true,
    text: 'Porque de tal manera amó Dios.',
  })
})
