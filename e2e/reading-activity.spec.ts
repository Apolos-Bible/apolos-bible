import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SOCIAL-ACTIVITY-01] publica una sola vez la última posición tras navegación rápida', async ({ page }) => {
  await installApiMock(page)
  let published = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/user/reading-activity' && request.method() === 'POST') published += 1
  })
  const activityRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname === '/api/user/reading-activity' && request.method() === 'POST')

  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  const next = page.getByRole('button', { name: /Next chapter|Cap.tulo siguiente/i }).filter({ visible: true }).first()
  await expect(next).toBeVisible()
  await next.click()
  await expect(page).toHaveURL(/\/bible\/genesis\/2$/)
  await next.click()
  await expect(page).toHaveURL(/\/bible\/genesis\/3$/)

  const request = await activityRequest
  expect(request.postDataJSON()).toMatchObject({
    book_slug: 'genesis',
    chapter: 3,
    verse: 1,
    version: 'RVR1960',
  })
  await page.waitForTimeout(2700)
  expect(published).toBe(1)
})
