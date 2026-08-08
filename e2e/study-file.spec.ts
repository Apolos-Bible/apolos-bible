import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-FILE-01] sube, abre y elimina un nodo de archivo', async ({ page }) => {
  await installApiMock(page)
  await page.context().route('https://files.example.test/**', (route) => route.fulfill({
    status: 200, contentType: 'text/plain', body: 'guía segura',
  }))
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox')).toHaveValue('Estudio canvas')

  const fileTooltip = page.getByText(/^File$/).filter({ visible: true })
  await fileTooltip.locator('..').getByRole('button').click()
  const dialog = page.getByRole('dialog', { name: /Add files|Añadir archivos/i })
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'guia.txt', mimeType: 'text/plain', buffer: Buffer.from('guía segura'),
  })
  await dialog.getByRole('button', { name: /Add to canvas \(1\)|Añadir al lienzo \(1\)/i }).click()

  const node = page.locator('.react-flow__node-file')
  await expect(node).toHaveCount(1)
  await expect(node).toContainText('guia.txt')
  const popupPromise = page.waitForEvent('popup')
  await node.getByRole('button', { name: /Open|Abrir/i }).last().click()
  const popup = await popupPromise
  expect(popup.url()).toBe('https://files.example.test/guia.txt')
  await popup.close()

  const box = await node.boundingBox()
  if (!box) throw new Error('The file node has no bounding box')
  await page.mouse.click(box.x + 24, box.y + 14)
  await page.keyboard.press('Delete')
  await expect(node).toHaveCount(0)
})
