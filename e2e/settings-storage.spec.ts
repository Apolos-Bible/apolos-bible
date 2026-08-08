import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SETTINGS-STORAGE-01][OFFLINE-DOWNLOAD-01][OFFLINE-DELETE-01] downloads and safely removes one offline Bible', async ({ page }) => {
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
