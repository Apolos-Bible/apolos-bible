import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.describe('[SOCIAL-FRIEND-01] friendship lifecycle', () => {
  test('sends and cancels an outgoing request from a public profile', async ({ page }) => {
    const requests: string[] = []
    await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))

    await page.goto('/u/21')
    await page.getByRole('button', { name: 'Add friend' }).click()

    await expect.poll(() => requests).toContain('POST /api/friends/21')
    await expect(page.getByRole('button', { name: /Request sent/ })).toBeVisible()

    await page.getByRole('button', { name: /Request sent/ }).click()
    await expect.poll(() => requests).toContain('POST /api/friend-requests/501')
    await expect(page.getByRole('button', { name: 'Add friend' })).toBeVisible()
  })

  test('accepts an incoming request and removes the resulting friendship', async ({ page }) => {
    const requests: string[] = []
    await installApiMock(page, (path, method) => requests.push(`${method} ${path}`), {
      profileFriendshipStatus: 'pending_received',
    })

    await page.goto('/u/21')
    await page.getByRole('button', { name: 'Accept' }).click()

    await expect.poll(() => requests).toContain('POST /api/friend-requests/501/accept')
    await expect(page.locator('.workspace-profile-identity').getByText('Friends', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Message' })).toBeVisible()

    await page.getByRole('button', { name: 'Remove friend' }).click()
    await expect(page.getByRole('heading', { name: 'Remove Lucia Visible from your friends?' })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Remove friend' }).click()

    await expect.poll(() => requests.filter((request) => request === 'POST /api/friends/21')).toHaveLength(1)
    await expect(page.getByRole('button', { name: 'Add friend' })).toBeVisible()
  })
})
