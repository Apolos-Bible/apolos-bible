import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-COLLAB-01] conserva una edición local durante desconexión y recuperación', async ({ page, context }) => {
  await installApiMock(page)
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.addStickyNote))
  await context.setOffline(true)
  await page.keyboard.press('n')
  const note = page.locator('.react-flow__node-sticky')
  await expect(note).toHaveCount(1)
  await note.locator('textarea').fill('Editado sin conexión')
  await context.setOffline(false)
  await expect(note.locator('textarea')).toHaveValue('Editado sin conexión')
  await expect(note).toHaveCount(1)
})
