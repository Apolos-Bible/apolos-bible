import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-CANVAS-01] crea, selecciona, mueve, redimensiona y elimina nodos y aristas', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox')).toHaveValue('Estudio canvas')
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.addStickyNote))

  await page.evaluate(() => {
    const actions = (window as any).__studyCanvasActions
    actions.addStickyNote()
    actions.addStickyNote()
  })
  const nodes = page.locator('.react-flow__node')
  await expect(nodes).toHaveCount(2)

  const first = nodes.first()
  const initial = await first.boundingBox()
  if (!initial) throw new Error('The first canvas node has no bounding box')
  await page.mouse.move(initial.x + 24, initial.y + 14)
  await page.mouse.down()
  await page.mouse.move(initial.x + 144, initial.y + 94, { steps: 8 })
  await page.mouse.up()
  const moved = await first.boundingBox()
  expect(moved?.x).not.toBe(initial.x)

  const firstId = await first.getAttribute('data-id')
  if (!firstId) throw new Error('The first canvas node has no id')
  await page.evaluate((id) => (window as any).__studyCanvasActions.resizeNode(id, 360, 220), firstId)
  await expect.poll(async () => first.evaluate((element) => parseFloat((element as HTMLElement).style.width))).toBe(360)

  const resized = await first.boundingBox()
  if (!resized) throw new Error('The resized canvas node has no bounding box')
  await page.mouse.click(resized.x + 24, resized.y + 14)
  await page.keyboard.press('Delete')
  await expect(nodes).toHaveCount(1)

  await page.evaluate(() => (window as any).__studyCanvasActions.addVerseChain([
    { verseId: 4301001, version_id: 1, number: 1, text: 'En el principio era el Verbo.' },
    { verseId: 4301002, version_id: 1, number: 2, text: 'Este estaba en el principio con Dios.' },
  ]))
  await expect(nodes).toHaveCount(3)
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  const verseId = await nodes.filter({ hasText: 'En el principio era el Verbo.' }).getAttribute('data-id')
  if (!verseId) throw new Error('The connected verse node has no id')
  await page.evaluate((id) => (window as any).__studyCanvasActions.deleteNodes([id]), verseId)
  await expect(nodes).toHaveCount(2)
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
})
