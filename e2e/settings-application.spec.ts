import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SETTINGS-APP-01] persists locale and keep-awake behavior across reloads', async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = []
  await page.addInitScript(() => localStorage.setItem('locale', 'en'))
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/user/settings' && request.method() === 'POST') {
      payloads.push(request.postDataJSON() as Record<string, unknown>)
    }
  })

  await page.goto('/ajustes#apariencia', { waitUntil: 'domcontentloaded' })
  const language = page.getByRole('radiogroup', { name: /Language|Idioma/i })
  await language.getByRole('radio', { name: 'ES', exact: true }).click()

  await expect.poll(() => page.evaluate(() => localStorage.getItem('locale'))).toBe('es')
  await expect.poll(() => payloads).toContainEqual({ _method: 'PATCH', locale: 'es' })
  await expect(page.getByRole('heading', { name: 'Apariencia' })).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('radiogroup', { name: /Language|Idioma/i })
    .getByRole('radio', { name: 'ES', exact: true })).toBeChecked()

  await page.goto('/ajustes#biblia', { waitUntil: 'domcontentloaded' })
  const keepAwake = page.getByRole('switch', { name: /Keep the screen awake while reading|Mantener la pantalla activa al leer/i })
  await keepAwake.click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('keepScreenAwake'))).toBe('true')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('switch', { name: /Keep the screen awake while reading|Mantener la pantalla activa al leer/i })).toBeChecked()
})
