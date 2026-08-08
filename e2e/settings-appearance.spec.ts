import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SETTINGS-APPEAR-01][A11Y-MOTION-01] persiste apariencia y preferencias de lectura', async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = []
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/user/settings' && request.method() === 'POST') {
      payloads.push(request.postDataJSON() as Record<string, unknown>)
    }
  })
  await page.goto('/ajustes#apariencia', { waitUntil: 'domcontentloaded' })

  await page.getByRole('radiogroup', { name: /Theme|Tema/i }).getByRole('radio', { name: /Light|Claro/i }).click()
  await page.getByRole('radiogroup', { name: /Reading mode|Modo de lectura/i }).getByRole('radio', { name: /Flow|Fluido/i }).click()
  await page.getByRole('radiogroup', { name: /Reading font|Fuente de lectura/i }).getByRole('radio', { name: /Sans/i }).click()
  await page.getByRole('radiogroup', { name: /Line spacing|Interlineado/i }).getByRole('radio', { name: /Relaxed|Amplio|Relajado/i }).click()
  await page.getByRole('button', { name: 'L', exact: true }).click()
  await page.getByRole('switch', { name: /Reduce motion|Reducir movimiento/i }).click()
  await page.getByRole('switch', { name: /Higher contrast|Alto contraste/i }).click()

  await expect.poll(() => page.evaluate(() => ({
    theme: localStorage.getItem('theme'),
    fontSize: localStorage.getItem('fontSize'),
    readingMode: localStorage.getItem('readingMode'),
    readerFont: localStorage.getItem('readerFont'),
    lineHeight: localStorage.getItem('lineHeight'),
    reduceMotion: localStorage.getItem('reduceMotion'),
    highContrast: localStorage.getItem('highContrast'),
  }))).toEqual({
    theme: 'light', fontSize: 'lg', readingMode: 'flow', readerFont: 'sans',
    lineHeight: 'relaxed', reduceMotion: 'true', highContrast: 'true',
  })
  await expect.poll(() => payloads).toEqual(expect.arrayContaining([
    { _method: 'PATCH', theme: 'light' },
    { _method: 'PATCH', reading_mode: 'flow' },
    { _method: 'PATCH', reader_font: 'sans' },
    { _method: 'PATCH', line_height: 'relaxed' },
    { _method: 'PATCH', font_size: 'lg' },
    { _method: 'PATCH', reduce_motion: true },
    { _method: 'PATCH', high_contrast: true },
  ]))

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveAttribute('data-reader-font', 'sans')
  await expect(page.locator('html')).toHaveAttribute('data-line-height', 'relaxed')
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true')
})
