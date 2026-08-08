import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

const friends = [
  { id: 21, name: 'Lucia Visible', email: 'lucia@example.test', avatar_url: null },
  { id: 22, name: 'Marcos Miembro', email: 'marcos@example.test', avatar_url: null },
  { id: 23, name: 'Elena Disponible', email: 'elena@example.test', avatar_url: null },
]

test('[CHAT-GROUP-01] creates a group then manages settings and member roles as admin', async ({ page }, testInfo) => {
  const requests: Array<{ path: string; body?: Record<string, unknown> }> = []
  await installApiMock(page, (path) => requests.push({ path }), { friends })
  page.on('request', (request) => {
    if (request.method() === 'POST') {
      const item = requests.findLast((entry) => entry.path === new URL(request.url()).pathname)
      if (item) item.body = request.postDataJSON() as Record<string, unknown>
    }
  })

  await page.goto('/')
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Community' }).click()
  }
  await page.getByRole('button', { name: 'Chats' }).click()
  await page.getByRole('button', { name: /New chat/i }).click()
  await page.getByRole('button', { name: 'Group', exact: true }).click()
  await page.getByPlaceholder(/Group name/i).fill('Study Circle')
  await page.getByRole('button', { name: /Lucia Visible/ }).click()
  await page.getByRole('button', { name: /Marcos Miembro/ }).click()
  await page.getByRole('button', { name: /Create group \(2\)/ }).click()

  await expect.poll(() => requests.some((entry) => entry.path === '/api/conversations' && entry.body?.type === 'group')).toBe(true)
  await page.getByRole('link', { name: /Open group/i }).click()
  await expect(page).toHaveURL(/\/chat\/902$/)
  if (testInfo.project.name === 'mobile-chromium') {
    await page.getByRole('button', { name: 'Close chat', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Study Circle' })).toBeVisible()

  await page.getByLabel('Group name').fill('Secure Study Circle')
  await page.getByLabel('Description').fill('A moderated conversation.')
  await page.getByRole('switch', { name: /Members can invite/i }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'Secure Study Circle' })).toBeVisible()

  const memberRow = page.locator('.workspace-conversation-member').filter({ hasText: 'Marcos Miembro' })
  await memberRow.getByRole('button', { name: 'Promote' }).click()
  await expect(memberRow.getByRole('button', { name: 'Remove admin' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Remove Lucia Visible' }).click()
  await expect(page.locator('.workspace-conversation-member').filter({ hasText: 'Lucia Visible' })).toHaveCount(0)
})
