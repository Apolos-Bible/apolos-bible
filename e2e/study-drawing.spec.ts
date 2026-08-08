import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-DRAW-01] dibuja y borra un trazo en el lienzo', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox')).toHaveValue('Estudio canvas')
  const pane = page.locator('.react-flow__pane')
  const box = await pane.boundingBox()
  if (!box) throw new Error('The study canvas has no drawing surface')

  await page.keyboard.press('d')
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.58, { steps: 12 })
  await page.mouse.up()
  const drawing = page.locator('.react-flow__node-drawing')
  await expect(drawing).toHaveCount(1)

  const stroke = await drawing.boundingBox()
  if (!stroke) throw new Error('The drawing has no bounding box')
  await page.keyboard.press('e')
  await page.mouse.click(stroke.x + stroke.width / 2, stroke.y + stroke.height / 2)
  await expect(drawing).toHaveCount(0)
})
