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
  await page.getByRole('option', { name: /^NVI\s/ }).click()

  await expect(version).toContainText('NVI')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tulia_version_id'))).toBe('2')
  await expect.poll(() => settingsBody).toMatchObject({ preferred_bible_version_id: 2 })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()).toContainText('NVI')

  const remoteVersion = page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()
  await remoteVersion.click()
  await page.getByRole('option', { name: /NVI-YV.*YouVersion/i }).click()

  await expect(remoteVersion).toContainText('NVI-YV')
  await expect.poll(() => settingsBody).toMatchObject({
    preferred_bible_version_id: null,
    preferred_bible_provider: 'youversion',
    preferred_bible_provider_id: 128,
  })
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tulia_version_id')))
    .toBe('1000000128')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()).toContainText('NVI-YV')
})

for (const scenario of ['rejection', 'timeout'] as const) {
  test(`[BIBLE-VERSION-02] revierte YouVersion tras ${scenario}`, async ({ page }) => {
    await installApiMock(page, undefined, { youVersionScenario: scenario })
    await page.goto('/ajustes#biblia', { waitUntil: 'domcontentloaded' })

    const version = page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()
    await expect(version).toContainText('RVR1960')
    await version.click()
    await page.getByRole('option', { name: /NVI-YV.*YouVersion/i }).click()

    await expect(version).toContainText('RVR1960')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('tulia_version_id'))).toBe('1')
  })
}
