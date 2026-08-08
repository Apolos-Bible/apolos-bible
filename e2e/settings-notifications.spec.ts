import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[NOTIFY-PREF-01] saves event, quiet-hours, and reminder preferences and restores them', async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = []
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/push/preferences' && request.method() === 'POST') {
      const { _method, ...payload } = request.postDataJSON() as Record<string, unknown>
      if (_method === 'PATCH') payloads.push(payload)
    }
  })

  await page.goto('/ajustes#notificaciones', { waitUntil: 'domcontentloaded' })

  await page.getByRole('switch', { name: /Chat messages|Mensajes de chat/i }).click()
  await page.getByLabel(/Quiet hours start|Inicio del horario silencioso/i).fill('22:15')
  await page.getByLabel(/Quiet hours end|Fin del horario silencioso/i).fill('07:30')
  await page.getByRole('switch', { name: /Reading reminder|Recordatorio de lectura/i }).click()
  await page.getByLabel(/Reminder time|Hora del recordatorio/i).fill('08:45')

  await expect.poll(() => payloads).toEqual(expect.arrayContaining([
    { chat_message: false },
    expect.objectContaining({ quiet_hours_start: '22:15' }),
    expect.objectContaining({ quiet_hours_end: '07:30' }),
    { reading_reminder: true },
    expect.objectContaining({ reminder_time: '08:45' }),
  ]))

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('switch', { name: /Chat messages|Mensajes de chat/i })).not.toBeChecked()
  await expect(page.getByRole('switch', { name: /Reading reminder|Recordatorio de lectura/i })).toBeChecked()
  await expect(page.getByLabel(/Quiet hours start|Inicio del horario silencioso/i)).toHaveValue('22:15')
  await expect(page.getByLabel(/Quiet hours end|Fin del horario silencioso/i)).toHaveValue('07:30')
  await expect(page.getByLabel(/Reminder time|Hora del recordatorio/i)).toHaveValue('08:45')

  await page.getByRole('switch', { name: /Reading reminder|Recordatorio de lectura/i }).click()
  await expect.poll(() => payloads).toContainEqual({ reading_reminder: false })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('switch', { name: /Reading reminder|Recordatorio de lectura/i })).not.toBeChecked()
  await expect(page.getByLabel(/Reminder time|Hora del recordatorio/i)).toBeDisabled()
})
