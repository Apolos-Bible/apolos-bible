import { expect, test, type Page } from '@playwright/test'

async function openAuth(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.goto('/juegos', { waitUntil: 'domcontentloaded' })
  } else {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Sign in|Iniciar sesi.n/i }).filter({ visible: true }).first().click()
  }
  await expect(page.getByRole('heading', { name: /Sign in to Apolos|Inicia sesi.n en Apolos/i })).toBeVisible()
}

test.describe('Laravel-backed authentication', () => {
  test('[AUTH-REG-01][AUTH-LOGIN-01] registers, restores, logs out and signs in through the real API', async ({ page }, testInfo) => {
    const suffix = `${testInfo.project.name}-${Date.now()}`
    const email = `fullstack-${suffix}@example.test`
    const password = 'fullstack-secure-password'
    await openAuth(page)

    await page.getByRole('button', { name: /Register|Registrarse/i }).click()
    const registration = page.locator('form')
    await registration.locator('input[type="text"]').fill('Full Stack User')
    await registration.locator('input[type="email"]').fill(email)
    await registration.locator('input[type="password"]').fill(password)
    await registration.locator('button[type="submit"]').click()

    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).not.toBeNull()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).not.toBeNull()

    await page.goto('/ajustes#peligro', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Sign out|Cerrar sesi.n/i }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()

    await openAuth(page)
    const login = page.locator('form')
    await login.locator('input[type="email"]').fill(email)
    await login.locator('input[type="password"]').fill(password)
    await login.locator('button[type="submit"]').click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).not.toBeNull()
  })

  test('[AUTH-LOGIN-02] rejects invalid credentials without issuing a real Sanctum token', async ({ page }) => {
    await openAuth(page)
    const login = page.locator('form')
    await login.locator('input[type="email"]').fill('missing-fullstack@example.test')
    await login.locator('input[type="password"]').fill('wrong-password')
    await login.locator('button[type="submit"]').click()

    await expect(login.getByText(/provided credentials are incorrect|credenciales/i)).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
  })
})
