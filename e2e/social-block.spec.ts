import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('blocks and unblocks another user from their profile', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))

  await page.goto('/u/21')
  await expect(page.getByRole('heading', { name: 'Lucia Visible' })).toBeVisible()

  await page.getByRole('button', { name: 'Block' }).click()
  await expect(page.getByRole('heading', { name: 'Block Lucia Visible?' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Block' }).click()

  await expect.poll(() => requests).toContain('POST /api/friends/21/block')
  await expect(page.getByRole('button', { name: 'Unblock' })).toBeVisible()

  await page.getByRole('button', { name: 'Unblock' }).click()
  await expect.poll(() => requests.filter((request) => request === 'POST /api/friends/21/block')).toHaveLength(2)
  await expect(page.getByRole('button', { name: 'Add friend' })).toBeVisible()
})

test('does not expose controls or profile content to a user blocked by the owner', async ({ page }) => {
  await installApiMock(page, undefined, { profileFriendshipStatus: 'blocked_by_them' })

  await page.goto('/u/21')

  await expect(page.getByText('This profile is unavailable.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lucia Visible' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Block' })).toHaveCount(0)
})
