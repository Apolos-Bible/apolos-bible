import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[AI-STUDY-01] mantiene una conversación contextual de varios turnos con Apolos', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.getCanvasContext))
  await page.getByRole('button', { name: /Toggle study chat|Alternar chat del estudio/i }).click()

  const composer = page.getByPlaceholder(/Write a message|Escribe un mensaje/i)
  await composer.fill('/apolos ¿Qué enseña el prólogo?')
  await page.getByRole('button', { name: /^Send$|^Enviar$/i }).click()
  await expect(page.getByText('El prólogo presenta a Jesús como el Verbo eterno.')).toBeVisible()
  await expect(page.getByText(/Apolos mode|Modo Apolos/i)).toBeVisible()

  const apolosComposer = page.getByPlaceholder(/Ask Apolos|Pregúntale a Apolos/i)
  await apolosComposer.fill('¿Qué más afirma?')
  await page.getByRole('button', { name: /Send to Apolos|Enviar a Apolos/i }).click()
  await expect(page.getByText('También afirma que el Verbo participó en la creación.')).toBeVisible()
  await expect.poll(() => requests.filter((entry) => entry === 'POST /api/ai/study-chat').length).toBe(2)
})

test('[AI-DOC-01] extrae un PDF, lo comparte como contexto y permite retirarlo', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.getCanvasContext))
  await page.getByRole('button', { name: /Toggle study chat|Alternar chat del estudio/i }).click()

  await page.locator('input[type=file][accept*="pdf"]').setInputFiles({
    name: 'contexto.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test'),
  })
  await expect(page.getByText('contexto.pdf').first()).toBeVisible()
  await expect.poll(() => requests).toContain('POST /api/ai/extract-document')

  await page.getByRole('button', { name: /Remove document|Quitar documento/i }).click()
  await expect(page.getByRole('button', { name: /Remove document|Quitar documento/i })).toHaveCount(0)
})

test('[AI-DOC-01] explica un PDF ilegible y permite reintentar el archivo', async ({ page }) => {
  await installApiMock(page, undefined, { aiDocumentScenario: 'error-then-success' })
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.getCanvasContext))
  await page.getByRole('button', { name: /Toggle study chat|Alternar chat del estudio/i }).click()
  const input = page.locator('input[type=file][accept*="pdf"]')
  const file = { name: 'contexto.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }

  await input.setInputFiles(file)
  await expect(page.getByText(/couldn't read that PDF|No pude leer ese PDF/i)).toBeVisible()
  await input.setInputFiles(file)
  await expect(page.getByText('contexto.pdf').first()).toBeVisible()
})
