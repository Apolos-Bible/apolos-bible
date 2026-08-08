import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SETTINGS-PRIVACY-01] persists every privacy control and restores it after reload', async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = []
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/user/settings' && request.method() === 'POST') {
      payloads.push(request.postDataJSON() as Record<string, unknown>)
    }
  })

  await page.goto('/ajustes#privacidad', { waitUntil: 'domcontentloaded' })

  await page.getByRole('switch', { name: /Find me by email|Encontrarme por correo/i }).click()
  await page.getByRole('switch', { name: /Share reading activity|Compartir actividad de lectura/i }).click()

  const requests = page.getByRole('combobox', { name: /Who can send me requests|Quién puede enviarme solicitudes/i })
  await requests.click()
  await page.getByRole('option', { name: /Friends of friends|Amigos de amigos/i }).click()

  await expect.poll(() => payloads).toEqual(expect.arrayContaining([
    { _method: 'PATCH', discoverable_by_email: false },
    { _method: 'PATCH', show_reading_activity: false },
    { _method: 'PATCH', allow_friend_requests: 'friends_of_friends' },
  ]))

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('switch', { name: /Find me by email|Encontrarme por correo/i })).not.toBeChecked()
  await expect(page.getByRole('switch', { name: /Share reading activity|Compartir actividad de lectura/i })).not.toBeChecked()
  await expect(requests).toContainText(/Friends of friends|Amigos de amigos/i)
})
