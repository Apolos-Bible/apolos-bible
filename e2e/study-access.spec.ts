import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

for (const role of ['host', 'editor'] as const) {
  test(`[STUDY-ACCESS-01] ${role} puede editar según su rol`, async ({ page }) => {
    await installApiMock(page, undefined, { studyRole: role })
    await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions))
    await page.getByText(/Sticky Note \(N\)|Nota adhesiva \(N\)/i).locator('..').getByRole('button').click()
    await expect(page.locator('.react-flow__node-sticky')).toHaveCount(1)
    if (role === 'host') await expect(page.getByRole('button', { name: /Invite|Invitar/i })).toBeVisible()
    else await expect(page.getByRole('button', { name: /Invite|Invitar/i })).toHaveCount(0)
  })
}

test('[STUDY-ACCESS-01] viewer permanece en solo lectura sin pedir otro login', async ({ page }) => {
  await installApiMock(page, undefined, { studyRole: 'viewer' })
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions))
  await page.keyboard.press('n')
  await page.keyboard.press('d')
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Invite|Invitar/i })).toHaveCount(0)
  await expect(page.getByText(/Log in to edit|Inicia sesión para editar/i)).toHaveCount(0)
})

test('[STUDY-ACCESS-01] invitado por token puede ver pero no editar', async ({ page }) => {
  await installApiMock(page, undefined, { studyGuest: true })
  await page.goto('/study/study-active/share-token', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/viewing this study as a guest|viendo este estudio como invitado/i)).toBeVisible()
  await page.keyboard.press('n')
  await expect(page.locator('.react-flow__node')).toHaveCount(0)
  await expect(page.getByText(/Log in to edit|Inicia sesión para editar/i).first()).toBeVisible()
})
