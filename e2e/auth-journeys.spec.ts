import { expect, test } from '@playwright/test'
import { installApiMock, installGuestApiMock, type GuestApiRequest } from './support/mockApi'

async function openGuestAuth(page: Parameters<typeof installGuestApiMock>[0]) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.goto('/juegos', { waitUntil: 'domcontentloaded' })
  } else {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Sign in|Iniciar sesi.n/i }).filter({ visible: true }).first().click()
  }
  await expect(page.getByRole('heading', { name: /Sign in to Apolos|Inicia sesi.n en Apolos/i })).toBeVisible()
}

test.describe('Flujos completos de autenticación', () => {
  test('[AUTH-LOGIN-01] inicia sesión y persiste el token', async ({ page }) => {
    let loginRequest: GuestApiRequest | undefined
    await installGuestApiMock(page, {
      onRequest: (request) => {
        if (request.path === '/api/auth/login') loginRequest = request
      },
    })
    await openGuestAuth(page)

    const form = page.locator('form')
    await form.locator('input[type="email"]').fill('ana@example.test')
    await form.locator('input[type="password"]').fill('correct-password')
    const submit = form.locator('button[type="submit"]')
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page.getByRole('heading', { name: /Sign in to Apolos|Inicia sesi.n en Apolos/i })).toBeHidden()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBe('authenticated-e2e-token')
    expect(loginRequest?.body).toEqual({ email: 'ana@example.test', password: 'correct-password' })
  })

  test('[AUTH-LOGIN-02] conserva el formulario y no crea sesión con credenciales inválidas', async ({ page }) => {
    await installGuestApiMock(page, { loginStatus: 422 })
    await openGuestAuth(page)

    const form = page.locator('form')
    await form.locator('input[type="email"]').fill('ana@example.test')
    await form.locator('input[type="password"]').fill('wrong-password')
    await form.locator('button[type="submit"]').click()

    await expect(form.getByText(/Invalid credentials/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /Sign in to Apolos|Inicia sesi.n en Apolos/i })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
  })

  test('[AUTH-REG-01] registra una cuenta con los datos normalizados', async ({ page }) => {
    let registration: GuestApiRequest | undefined
    await installGuestApiMock(page, {
      onRequest: (request) => {
        if (request.path === '/api/auth/register') registration = request
      },
    })
    await openGuestAuth(page)

    await page.getByRole('button', { name: /Register|Registrarse/i }).click()
    const form = page.locator('form')
    await form.locator('input[type="text"]').fill('  Ana Segura  ')
    await form.locator('input[type="email"]').fill('  ana@example.test  ')
    await form.locator('input[type="password"]').fill('strong-password')
    await form.locator('button[type="submit"]').click()

    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBe('registered-e2e-token')
    expect(registration?.body).toEqual({ name: 'Ana Segura', email: 'ana@example.test', password: 'strong-password' })
  })

  test('[AUTH-REG-02] rechaza un correo duplicado sin crear una sesión', async ({ page }) => {
    await installGuestApiMock(page, { registrationStatus: 422 })
    await openGuestAuth(page)

    await page.getByRole('button', { name: /Register|Registrarse/i }).click()
    const form = page.locator('form')
    await form.locator('input[type="text"]').fill('Ana Duplicada')
    await form.locator('input[type="email"]').fill('ana@example.test')
    await form.locator('input[type="password"]').fill('strong-password')
    await form.locator('button[type="submit"]').click()

    await expect(form.getByText(/already been taken|ya.*registrado|ya.*uso/i)).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
  })

  test('[AUTH-RECOVERY-01] solicita recuperación sin revelar si el correo existe', async ({ page }) => {
    let recovery: GuestApiRequest | undefined
    await installGuestApiMock(page, {
      onRequest: (request) => {
        if (request.path === '/api/auth/forgot-password') recovery = request
      },
    })
    await openGuestAuth(page)

    await page.getByRole('button', { name: /Forgot password|Olvidaste tu contrase/i }).click()
    const form = page.locator('form')
    await form.locator('input[type="email"]').fill('unknown@example.test')
    await form.locator('button[type="submit"]').click()

    await expect(page.getByText(/reset link has been sent|recibir.s un link/i)).toBeVisible()
    expect(recovery?.body).toEqual({ email: 'unknown@example.test' })
  })

  test('[AUTH-RECOVERY-02] restablece la contraseña desde el enlace recibido', async ({ page }) => {
    let resetRequest: GuestApiRequest | undefined
    await installGuestApiMock(page, {
      onRequest: (request) => {
        if (request.path === '/api/auth/reset-password') resetRequest = request
      },
    })
    await page.goto('/auth/reset-password?token=valid-reset-token&email=ana%40example.test', { waitUntil: 'domcontentloaded' })

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: /Set new password|Nueva contraseña/i })).toBeVisible()
    await expect(dialog.locator('input[type="email"]')).toHaveValue('ana@example.test')
    const passwords = dialog.locator('input[type="password"]')
    await passwords.nth(0).fill('new-secure-password')
    await passwords.nth(1).fill('new-secure-password')
    await dialog.getByRole('button', { name: /Reset password|Cambiar contraseña/i }).click()

    await expect(dialog.getByRole('heading', { name: /Sign in to Apolos|Inicia sesi.n en Apolos/i })).toBeVisible()
    expect(resetRequest?.body).toEqual({
      email: 'ana@example.test',
      token: 'valid-reset-token',
      password: 'new-secure-password',
      password_confirmation: 'new-secure-password',
    })
  })

  test('[AUTH-RECOVERY-03] conserva el formulario y rechaza un token inválido o expirado', async ({ page }) => {
    await installGuestApiMock(page, { resetPasswordStatus: 422 })
    await page.goto('/auth/reset-password?token=expired-reset-token&email=ana%40example.test', { waitUntil: 'domcontentloaded' })

    const dialog = page.getByRole('dialog')
    const passwords = dialog.locator('input[type="password"]')
    await passwords.nth(0).fill('new-secure-password')
    await passwords.nth(1).fill('new-secure-password')
    await dialog.getByRole('button', { name: /Reset password|Cambiar contraseña/i }).click()

    await expect(dialog.getByText(/Invalid or expired reset token/i)).toBeVisible()
    await expect(dialog.locator('input[type="email"]')).toHaveValue('ana@example.test')
    await expect(dialog.getByRole('heading', { name: /Set new password|Nueva contraseña/i })).toBeVisible()
  })

  test('[AUTH-LOGOUT-01] cierra la sesión local aunque el API responda correctamente', async ({ page }) => {
    let logoutCalled = false
    await installApiMock(page, (path) => {
      if (path === '/api/auth/logout') logoutCalled = true
    })
    await page.goto('/ajustes#peligro', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Sign out|Cerrar sesi.n/i }).click()

    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
    expect(logoutCalled).toBe(true)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
    await expect(page.getByRole('button', { name: /Sign out|Cerrar sesi.n/i })).toHaveCount(0)
  })
})
