import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.describe('Seguridad de la cuenta', () => {
  test('[ACCOUNT-PROFILE-01] guarda el nombre normalizado', async ({ page }) => {
    let profileBody: Record<string, unknown> | undefined
    await installApiMock(page, (_path, _method) => {})
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user' && request.method() === 'POST') {
        profileBody = request.postDataJSON() as Record<string, unknown>
      }
    })
    await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

    const name = page.getByLabel(/Name|Nombre/i)
    await name.fill('  Ana Renovada  ')
    await name.locator('..').getByRole('button', { name: /Save|Guardar/i }).click()

    await expect.poll(() => profileBody).toEqual({ _method: 'PATCH', name: 'Ana Renovada' })
  })

  test('[ACCOUNT-PASSWORD-01] exige confirmación y envía el cambio completo', async ({ page }) => {
    let passwordBody: Record<string, unknown> | undefined
    await installApiMock(page)
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user/password') {
        passwordBody = request.postDataJSON() as Record<string, unknown>
      }
    })
    await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Change password|Cambiar contrase/i }).click()
    await page.getByPlaceholder(/Current password|Contrase.a actual/i).fill('old-password')
    await page.getByPlaceholder(/New password|Nueva contrase/i).fill('new-password-123')
    await page.getByPlaceholder(/Confirm password|Confirmar contrase/i).fill('different-password')
    await expect(page.getByRole('button', { name: /Save password|Guardar contrase/i })).toBeDisabled()

    await page.getByPlaceholder(/Confirm password|Confirmar contrase/i).fill('new-password-123')
    await page.getByRole('button', { name: /Save password|Guardar contrase/i }).click()

    await expect.poll(() => passwordBody).toEqual({
      current_password: 'old-password',
      password: 'new-password-123',
      password_confirmation: 'new-password-123',
    })
  })

  test('[ACCOUNT-DELETE-01] requiere contraseña antes de eliminar y limpia la sesión', async ({ page }) => {
    let deletionBody: Record<string, unknown> | undefined
    await installApiMock(page)
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user' && request.method() === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>
        if (body._method === 'DELETE') deletionBody = body
      }
    })
    await page.goto('/ajustes#peligro', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Delete account|Eliminar cuenta/i }).click()
    const confirm = page.getByRole('button', { name: /Yes, delete my account|eliminar mi cuenta/i })
    await expect(confirm).toBeDisabled()
    await page.getByPlaceholder(/Enter your password|Ingresa tu contrase/i).fill('account-password')
    await confirm.click()

    await expect.poll(() => deletionBody).toEqual({ _method: 'DELETE', password: 'account-password' })
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
    await expect(page).toHaveURL(/\/bible\//)
    await expect(page.getByRole('button', { name: /Sign in|Iniciar sesi.n/i }).first()).toBeVisible()
  })
})
