import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[AI-MODEL-01][SETTINGS-AI-01] lists a public model, saves it, and restores it', async ({ page }) => {
  const payloads: Array<Record<string, unknown>> = []
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname !== '/api/user/settings' || request.method() !== 'POST') return
    const { _method, ...payload } = request.postDataJSON() as Record<string, unknown>
    if (_method === 'PATCH') payloads.push(payload)
  })

  await page.goto('/ajustes#ia', { waitUntil: 'domcontentloaded' })
  const model = page.getByRole('combobox', { name: /Default model|Modelo predeterminado/i })
  await model.click()
  await page.getByRole('option', { name: /DeepSeek V4 Flash/ }).click()

  await expect(model).toContainText('DeepSeek V4 Flash')
  await expect.poll(() => payloads).toContainEqual({ preferred_ai_model: 'deepseek/v4-flash' })
  await expect.poll(() => page.evaluate(() => localStorage.getItem('preferredAiModel')))
    .toBe('deepseek/v4-flash')
  await expect(page.getByText('25%')).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('combobox', { name: /Default model|Modelo predeterminado/i }))
    .toContainText('DeepSeek V4 Flash')
})
