import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.describe('Seguridad de la cuenta', () => {
  test('[ACCOUNT-PROFILE-01] guarda nombre y biografía normalizados tras recargar', async ({ page }) => {
    const profileBodies: Array<Record<string, unknown>> = []
    await installApiMock(page, (_path, _method) => {})
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user' && request.method() === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>
        if (body._method === 'PATCH') profileBodies.push(body)
      }
    })
    await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

    const name = page.getByLabel(/Name|Nombre/i)
    await name.fill('  Ana Renovada  ')
    await name.locator('..').getByRole('button', { name: /Save|Guardar/i }).click()

    await expect.poll(() => profileBodies).toContainEqual({ _method: 'PATCH', name: 'Ana Renovada' })

    const bio = page.getByLabel(/Bio|Biograf.a/i)
    await bio.fill('  Estudio seguro y comunitario.  ')
    await bio.locator('..').getByRole('button', { name: /Save|Guardar/i }).click()
    await expect.poll(() => profileBodies).toContainEqual({ _method: 'PATCH', bio: 'Estudio seguro y comunitario.' })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel(/Name|Nombre/i)).toHaveValue('Ana Renovada')
    await expect(page.getByLabel(/Bio|Biograf.a/i)).toHaveValue('Estudio seguro y comunitario.')
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
