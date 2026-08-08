import { expect, test } from '@playwright/test'

const backend = 'http://127.0.0.1:8000'

test('[LEGACY-COMPAT-01] keeps authenticated reader, bookmarks, feed and profile pages renderable', async ({ page }, testInfo) => {
  const email = `legacy-${testInfo.project.name}-${Date.now()}@example.test`
  const name = 'Legacy Browser User'
  await page.goto(`${backend}/register`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[name="name"]').fill(name)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill('legacy-browser-password')
  await page.locator('input[name="password_confirmation"]').fill('legacy-browser-password')
  await page.locator('form button[type="submit"]').click()
  await expect(page).not.toHaveURL(/\/register$/)

  for (const path of ['/read', '/bookmarks', '/feed', '/profile']) {
    const response = await page.goto(`${backend}${path}`, { waitUntil: 'domcontentloaded' })
    expect(response?.ok(), `${path} must return a successful document`).toBe(true)
    await expect(page.locator('body')).not.toContainText(/Server Error|Internal Server Error/i)
  }
  await expect(page.locator('body')).toContainText(name)
})
