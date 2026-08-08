import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[STUDY-LINK-01] bloquea URLs peligrosas y aísla una página embebida', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await page.getByText(/^File$/).filter({ visible: true }).locator('..').getByRole('button').click()
  const dialog = page.getByRole('dialog', { name: /Add files|Añadir archivos/i })
  const input = dialog.locator('input[type="url"]')

  await input.fill('javascript:alert(document.cookie)')
  await input.press('Enter')
  await expect(dialog.getByRole('alert')).toContainText(/valid public|pública válida/i)

  await input.fill('https://docs.example.com/guide')
  await input.press('Enter')
  await dialog.getByRole('button', { name: /Add to canvas \(1\)|Añadir al lienzo \(1\)/i }).click()
  const node = page.locator('.react-flow__node-file')
  await expect(node).toContainText('docs.example.com')
  const frame = node.locator('iframe')
  await expect(frame).toHaveAttribute('src', 'https://docs.example.com/guide')
  await expect(frame).toHaveAttribute('sandbox', 'allow-forms allow-scripts')
  await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer')
})
