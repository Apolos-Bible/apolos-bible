import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[NOTIFY-PUSH-01] shows an owned push device and revokes it from settings', async ({ page }) => {
  const requests: Array<{ method: string; path: string; body: unknown }> = []
  await installApiMock(page, (path, method) => {
    requests.push({ method, path, body: null })
  }, {
    pushSubscriptions: [{
      id: 71,
      token: 'device-token-71',
      platform: 'desktop',
      device_label: 'Windows laptop',
      last_used_at: '2026-08-08T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
    }],
  })

  await page.goto('/ajustes#notificaciones', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Windows laptop')).toBeVisible()
  await expect(page.getByText(/desktop/)).toBeVisible()

  await page.getByRole('button', { name: /Revoke|Revocar/i }).click()

  await expect.poll(() => requests.map(({ method, path }) => `${method} ${path}`))
    .toContain('POST /api/push/subscriptions/device-token-71')
  await expect(page.getByText('Windows laptop')).not.toBeVisible()
})
