import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-EXPORT-01] copia un export seguro sin capacidades privadas', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => sessionStorage.setItem('e2e_study_export', text) },
    })
  })
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.addFileNode))
  await page.evaluate(() => {
    const actions = (window as any).__studyCanvasActions
    actions.addStickyNote()
    actions.addFileNode({
      kind: 'upload', fileId: 'private-file', name: 'privado.txt', mimeType: 'text/plain',
      size: 120, contentUrl: 'https://signed.example.test/private-capability-token',
    })
  })

  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: /More|Más/i }).click()
  }
  await page.getByRole('button', { name: /Export as text|Exportar como texto/i }).click()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('e2e_study_export'))).not.toBeNull()
  const text = await page.evaluate(() => sessionStorage.getItem('e2e_study_export') ?? '')
  expect(text).toContain('# Estudio: Estudio canvas')
  expect(text).toContain('privado.txt')
  expect(text).not.toContain('private-capability-token')
})
