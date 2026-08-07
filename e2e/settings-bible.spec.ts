import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[BIBLE-VERSION-01][SETTINGS-BIBLE-01] cambia y persiste la versión local', async ({ page }) => {
  let settingsBody: Record<string, unknown> | undefined
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/user/settings' && request.method() === 'POST') {
      settingsBody = request.postDataJSON() as Record<string, unknown>
    }
  })
  await page.goto('/ajustes#biblia', { waitUntil: 'domcontentloaded' })

  const version = page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()
  await version.click()
  await page.getByRole('option', { name: /NVI.*Nueva Versi.n Internacional/i }).click()

  await expect(version).toContainText('NVI')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tulia_version_id'))).toBe('2')
  await expect.poll(() => settingsBody).toMatchObject({ preferred_bible_version_id: 2 })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()).toContainText('NVI')
})
