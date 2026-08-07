import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[ACCOUNT-AVATAR-01] carga y elimina el avatar con postcondiciones de API', async ({ page }) => {
  const mutations: string[] = []
  await installApiMock(page, (path, method) => {
    if (path === '/api/user/avatar') mutations.push(method)
  })
  await page.goto('/ajustes#cuenta', { waitUntil: 'domcontentloaded' })

  await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
  })

  const avatar = page.getByRole('img', { name: 'Ana Segura' }).first()
  await expect(avatar).toHaveAttribute('src', /^data:image\/png/)
  await expect(page.getByRole('button', { name: /^Remove$|^Eliminar$/i })).toBeVisible()
  expect(mutations).toContain('POST')

  const deleteRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname === '/api/user/avatar'
      && request.headers()['content-type']?.includes('application/json') === true
      && request.postDataJSON()?._method === 'DELETE')
  await page.getByRole('button', { name: /^Remove$|^Eliminar$/i }).click()
  await deleteRequest
  await expect(page.getByRole('button', { name: /^Remove$|^Eliminar$/i })).toHaveCount(0)
  expect(mutations).toEqual(['POST', 'POST'])
})
