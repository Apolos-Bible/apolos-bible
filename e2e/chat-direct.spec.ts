import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[CHAT-DIRECT-01][CHAT-MESSAGE-01][CHAT-VERSE-01] opens a unique DM, sends messages, and follows a verse link', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`), {
    profileFriendshipStatus: 'accepted',
  })

  await page.goto('/u/21')
  await page.getByRole('button', { name: 'Message' }).click()

  await expect.poll(() => requests).toContain('POST /api/conversations')
  const composer = page.getByPlaceholder(/Write a message|Escribe un mensaje/i)
  await expect(composer).toBeVisible()
  await composer.fill('La gracia nos reúne.')
  await page.getByRole('button', { name: /^Send$|^Enviar$/i }).click()

  await expect.poll(() => requests).toContain('POST /api/conversations/901/messages')
  await expect(composer).toHaveValue('')
  await expect(page.getByText('La gracia nos reúne.')).toBeVisible()

  await page.getByRole('button', { name: /Close chat|Cerrar chat/i }).click()
  await page.getByRole('button', { name: 'Message' }).click()
  await expect.poll(() => requests.filter((request) => request === 'POST /api/conversations')).toHaveLength(2)
  await expect(page.getByText('La gracia nos reúne.')).toBeVisible()

  const reopenedComposer = page.getByPlaceholder(/Write a message|Escribe un mensaje/i)
  await reopenedComposer.fill('/v Juan')
  await expect(page.getByRole('button', { name: /Juan 2:1/ })).toBeVisible()
  await page.getByRole('button', { name: /Juan 2:1/ }).click()
  await expect(reopenedComposer).toHaveValue('Juan 2:1')
  await page.getByRole('button', { name: /^Send$|^Enviar$/i }).click()
  await expect(reopenedComposer).toHaveValue('')
  await page.getByRole('link', { name: 'Juan 2:1' }).click()
  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
})
