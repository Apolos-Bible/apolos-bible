import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { installApiMock, testUser } from './support/mockApi'

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

  test('[ACCOUNT-PASSWORD-02] crea la primera contraseña de una cuenta OAuth', async ({ page }) => {
    let passwordBody: Record<string, unknown> | undefined
    await installApiMock(page, undefined, {
      user: { ...testUser, has_password: false, connected_providers: ['google'] },
    })
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user/password') {
        passwordBody = request.postDataJSON() as Record<string, unknown>
      }
    })
    await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Set password|Crear contrase.a|Establecer contrase.a/i }).click()
    await expect(page.getByPlaceholder(/Current password|Contrase.a actual/i)).toHaveCount(0)
    await page.getByPlaceholder(/New password|Nueva contrase/i).fill('oauth-password-123')
    await page.getByPlaceholder(/Confirm password|Confirmar contrase/i).fill('oauth-password-123')
    await page.getByRole('button', { name: /Save password|Guardar contrase/i }).click()

    await expect.poll(() => passwordBody).toEqual({
      current_password: '',
      password: 'oauth-password-123',
      password_confirmation: 'oauth-password-123',
    })
    await expect(page.getByRole('button', { name: /Change password|Cambiar contrase/i })).toBeVisible()
  })

  test('[ACCOUNT-EXPORT-01][SETTINGS-DANGER-01] descarga exportaciones JSON y Markdown del usuario', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/ajustes#seguridad', { waitUntil: 'domcontentloaded' })

    const jsonDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: /(?:Download|Exportar) JSON/i }).click()
    const json = await jsonDownload
    expect(json.suggestedFilename()).toMatch(/^apolos-data-\d{4}-\d{2}-\d{2}\.json$/)
    const jsonBody = JSON.parse(await readFile(await json.path() as string, 'utf8')) as { user: { id: number }; notes: unknown[] }
    expect(jsonBody.user.id).toBe(7)
    expect(jsonBody.notes).toHaveLength(1)

    const markdownDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: /(?:Download|Exportar) Markdown/i }).click()
    const markdown = await markdownDownload
    expect(markdown.suggestedFilename()).toMatch(/^apolos-data-\d{4}-\d{2}-\d{2}\.md$/)
    await expect.poll(async () => readFile(await markdown.path() as string, 'utf8')).toContain('Ana Segura — Juan 1:1')
  })

  test('[ACCOUNT-DELETE-01][SETTINGS-DANGER-01] requiere contraseña antes de eliminar y limpia la sesión', async ({ page }) => {
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

  test('[ACCOUNT-DELETE-02][SETTINGS-DANGER-01] elimina una cuenta OAuth confirmando el correo', async ({ page }) => {
    let deletionBody: Record<string, unknown> | undefined
    await installApiMock(page, undefined, {
      user: { ...testUser, has_password: false, connected_providers: ['google'] },
    })
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/user' && request.method() === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>
        if (body._method === 'DELETE') deletionBody = body
      }
    })
    await page.goto('/ajustes#peligro', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: /Delete account|Eliminar cuenta/i }).click()
    const confirm = page.getByRole('button', { name: /Yes, delete my account|eliminar mi cuenta/i })
    const emailConfirmation = page.getByRole('textbox', { name: /Confirm your email|Confirma tu correo/i })
    await emailConfirmation.fill('wrong@example.test')
    await expect(confirm).toBeDisabled()
    await emailConfirmation.fill(testUser.email)
    await confirm.click()

    await expect.poll(() => deletionBody).toEqual({ _method: 'DELETE', email_confirmation: testUser.email })
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token'))).toBeNull()
    await expect(page.getByRole('button', { name: /Sign in|Iniciar sesi.n/i }).first()).toBeVisible()
  })
})
