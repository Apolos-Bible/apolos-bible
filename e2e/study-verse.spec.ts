import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-VERSE-01] inserta por búsqueda y desde el panel bíblico', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox')).toHaveValue('Estudio canvas')

  await page.keyboard.press('i')
  const dialog = page.getByRole('dialog', { name: /Insert Verse|Insertar versículo/i })
  await dialog.getByPlaceholder(/Search verses|Buscar versículos/i).fill('boda')
  await dialog.getByRole('button', { name: /Juan 2:1/i }).last().click()
  const nodes = page.locator('.react-flow__node')
  await expect(nodes).toHaveCount(1)
  await expect(nodes.first()).toContainText(/bodas en Caná/i)

  await page.keyboard.press('b')
  const verseRow = page.locator('[data-verse="1"]').first()
  await expect(verseRow).toBeVisible()
  if (testInfo.project.name === 'mobile-chromium') {
    await verseRow.getByRole('button', { name: /Add this verse|Añadir este versículo/i }).click()
  } else {
    await verseRow.dragTo(page.locator('.react-flow__pane'), { targetPosition: { x: 700, y: 400 } })
  }
  await expect(nodes).toHaveCount(2)
})
