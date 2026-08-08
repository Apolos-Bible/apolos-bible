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
  test('[AUTH-REG-01][AUTH-LOGIN-01][ACCOUNT-PASSWORD-01][ACCOUNT-DELETE-01] persists the real account lifecycle', async ({ page }, testInfo) => {
    test.setTimeout(60_000)
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
    await page.evaluate(() => {
      localStorage.setItem('tutorial_completed_v1', 'true')
      localStorage.setItem('tutorial_invite_dismissed_v1', 'true')
    })
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

    const changedPassword = `${password}-changed`
    await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Change password|Cambiar contrase/i }).click()
    await page.getByPlaceholder(/Current password|Contrase.a actual/i).fill(password)
    await page.getByPlaceholder(/New password|Nueva contrase/i).fill(changedPassword)
    await page.getByPlaceholder(/Confirm password|Confirmar contrase/i).fill(changedPassword)
    const passwordResponse = page.waitForResponse((response) => response.url().endsWith('/api/user/password'))
    await page.getByRole('button', { name: /Save password|Guardar contrase/i }).click()
    expect((await passwordResponse).status()).toBe(200)
    await expect(page.getByPlaceholder(/Current password|Contrase.a actual/i)).toHaveCount(0)

    await page.goto('/ajustes#peligro', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Sign out|Cerrar sesi.n/i }).click()
    await openAuth(page)
    await page.locator('form input[type="email"]').fill(email)
    await page.locator('form input[type="password"]').fill(password)
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('form').getByText(/provided credentials are incorrect|credenciales/i)).toBeVisible()
    await page.locator('form input[type="password"]').fill(changedPassword)
    await page.locator('form button[type="submit"]').click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).not.toBeNull()

    await page.goto('/ajustes#peligro', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Delete account|Eliminar cuenta/i }).click()
    await page.getByPlaceholder(/Enter your password|Ingresa tu contrase/i).fill(changedPassword)
    await page.getByRole('button', { name: /Yes, delete my account|eliminar mi cuenta/i }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()

    await openAuth(page)
    await page.locator('form input[type="email"]').fill(email)
    await page.locator('form input[type="password"]').fill(changedPassword)
    await page.locator('form button[type="submit"]').click()
    await expect(page.locator('form').getByText(/provided credentials are incorrect|credenciales/i)).toBeVisible()
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
