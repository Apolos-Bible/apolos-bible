import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-CHAT-01] abre el chat compartido, envía y conserva el mensaje', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  const toggle = page.getByRole('button', { name: /Toggle study chat|Alternar chat del estudio/i })
  await expect(toggle).toBeVisible()
  await toggle.click()

  const composer = page.getByPlaceholder(/Write a message|Escribe un mensaje/i)
  await composer.fill('Compartimos esta observación.')
  await page.getByRole('button', { name: /^Send$|^Enviar$/i }).click()
  await expect.poll(() => requests).toContain('POST /api/conversations/501/messages')
  const sentMessage = page.locator('span').filter({ hasText: /^Compartimos esta observación\.$/ })
  await expect(sentMessage).toBeVisible()

  await page.getByRole('button', { name: /Back|Volver/i }).click()
  await toggle.click()
  await expect(sentMessage).toBeVisible()
})
