import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[AUTH-GOOGLE-01] consume el token del fragmento y restaura la sesión', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/auth/google/finish#token=google-fragment-token', { waitUntil: 'domcontentloaded' })

  await expect(page).not.toHaveURL(/\/auth\/google\/finish/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token')))
    .toBe('google-fragment-token')
  await expect(page.getByText(/Signed in with Google|Sesión iniciada con Google/i)).toBeVisible()
  expect(new URL(page.url()).searchParams.has('token')).toBe(false)
})

test('[AUTH-YV-01] completa YouVersion desde un fragmento sin filtrar el token', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/auth/youversion/finish?data_exchange=cancelled#token=yv-fragment-token', { waitUntil: 'domcontentloaded' })

  await expect(page).not.toHaveURL(/\/auth\/youversion\/finish/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_token')))
    .toBe('yv-fragment-token')
  await expect(page.getByText(/signed in with YouVersion|sesión iniciada con YouVersion/i)).toBeVisible()
  expect(new URL(page.url()).searchParams.has('token')).toBe(false)
})
