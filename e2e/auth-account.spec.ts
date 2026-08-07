import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.describe('Autenticación, cuenta y sesiones', () => {
  test('[AUTH-SESSION-01] muestra proveedores y sesiones del usuario autenticado', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/ajustes#seguridad', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /Security|Seguridad/i })).toBeVisible()
    await expect(page.getByText('Windows · Apolos')).toBeVisible()
    await expect(page.getByText('Mac · Apolos')).toBeVisible()
    await expect(page.getByText(/Password|Contraseña/i)).toBeVisible()
    await expect(page.getByText(/Google/i)).toBeVisible()
  })

  test('[AUTH-SESSION-02] permite revocar una sesión distinta de la actual', async ({ page }) => {
    let revoked = false
    await installApiMock(page, (path) => {
      if (path === '/api/user/sessions/12') revoked = true
    })

    await page.goto('/ajustes#seguridad', { waitUntil: 'domcontentloaded' })
    const macSession = page.getByRole('listitem').filter({ hasText: 'Mac · Apolos' })
    await macSession.getByRole('button', { name: /Close|Revocar/i }).click()

    expect(revoked).toBe(true)
    await expect(page.getByText('Windows · Apolos')).toBeVisible()
  })

  test('[AUTH-SESSION-03] nunca ofrece revocar la sesión actual', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/ajustes#seguridad', { waitUntil: 'domcontentloaded' })

    const currentRow = page.getByText('Windows · Apolos').locator('..').locator('..')
    await expect(currentRow.getByRole('button', { name: /Close|Revocar/i })).toHaveCount(0)
  })
})
