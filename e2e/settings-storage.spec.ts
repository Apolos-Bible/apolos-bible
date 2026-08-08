import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SETTINGS-STORAGE-01][OFFLINE-DOWNLOAD-01][OFFLINE-READ-01][OFFLINE-DELETE-01] downloads, reads offline, and safely removes one Bible', async ({ page }) => {
  const chapterRequests: string[] = []
  await installApiMock(page, (path) => {
    if (path.includes('/chapters/')) chapterRequests.push(path)
  })
  await page.goto('/ajustes#almacenamiento', { waitUntil: 'domcontentloaded' })

  const empty = page.getByText(/No complete Bibles .*downloaded yet|Todav.a no hay Biblias completas descargadas/i)
  await expect(empty).toBeVisible()
  await page.getByRole('button', { name: /^Download$|^Descargar$/i }).click()

  await expect(page.getByRole('status')).toContainText(/Available offline|Disponible sin conexi.n/i, { timeout: 30_000 })
  expect(new Set(chapterRequests).size).toBe(71)
  await expect(page.getByText('Reina Valera 1960', { exact: true })).toBeVisible()
  await expect(page.getByText(/71 chapters|71 cap.tulos/i)).toBeVisible()

  let blockedChapterRequests = 0
  await page.route('**/api/versions/**', async (route) => {
    if (route.request().url().includes('/chapters/')) blockedChapterRequests += 1
    await route.abort('internetdisconnected')
  })
  await page.goto('/bible/juan/5', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('option', { name: /1 En el principio era el Verbo/ })).toBeVisible()
  await page.goto('/bible/juan/6', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('option', { name: /1 En el principio era el Verbo/ })).toBeVisible()
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
