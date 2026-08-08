import { expect, test } from '@playwright/test'
import { installApiMock, testUser } from './support/mockApi'

test('[AUTH-VERIFY-01] procesa y elimina el retorno de verificación firmado', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/?email_verified=1', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText(/Email verified|Correo verificado/i)).toBeVisible()
  await expect(page).not.toHaveURL(/email_verified/)
})

test('[AUTH-VERIFY-01] muestra el rechazo de un enlace inválido o caducado', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/?email_verified=invalid', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText(/could not verify|No pudimos verificar/i)).toBeVisible()
  await expect(page).not.toHaveURL(/email_verified/)
})

test('[AUTH-VERIFY-02] reenvía la verificación para una cuenta pendiente', async ({ page }) => {
  let resendCalls = 0
  await installApiMock(
    page,
    (path) => {
      if (path === '/api/auth/email/resend-verification') resendCalls += 1
    },
    { user: { ...testUser, email_verified_at: null } },
  )
  await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: /Resend email|Reenviar correo/i }).click()
  await expect(page.getByRole('button', { name: /^Sent$|^Enviado$/i })).toBeVisible()
  expect(resendCalls).toBe(1)
})

test('[AUTH-VERIFY-02] permite reintentar cuando el reenvío es limitado', async ({ page }) => {
  await installApiMock(page, undefined, {
    user: { ...testUser, email_verified_at: null },
    resendVerificationStatus: 429,
  })
  await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

  const resend = page.getByRole('button', { name: /Resend email|Reenviar correo/i })
  await resend.click()
  await expect(resend).toBeEnabled()
  await expect(resend).toHaveText(/Resend email|Reenviar correo/i)
})
