import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[GUIDED-MARKET-01][GUIDED-CONSUME-01] descubre, añade, inicia y reabre un estudio guiado', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/marketplace', { waitUntil: 'domcontentloaded' })
  const search = page.getByRole('textbox', { name: /Search paths|Buscar rutas/i })
  await search.fill('esperanza')
  await search.press('Enter')
  await expect(page.getByRole('button', { name: 'Ruta de esperanza' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Ruta de esperanza' }).first().click()
  await expect(page).toHaveURL(/\/marketplace\/hope-path$/)
  // The responsive workspace may switch shells during the first mobile
  // navigation; a reload proves the deep link itself resolves identically.
  await page.reload({ waitUntil: 'domcontentloaded' })

  const add = page.getByRole('button', { name: /^Add$|^Añadir$/i })
  await add.click()
  await expect(page.getByRole('button', { name: /On my list|En mi lista/i })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => requests).toContain('POST /api/guided-plans/hope-path/list')

  await page.getByRole('button', { name: /Esperanza firme/i }).click()
  const dialog = page.getByRole('dialog', { name: 'Esperanza firme' })
  await expect(dialog.getByText('Abre el corazón.')).toBeVisible()
  await dialog.getByRole('button', { name: /Start this study|Iniciar este estudio/i }).click()
  await expect(page).toHaveURL(/\/study\/study-new$/)
  await expect(page.getByText('Abre el corazón.').first()).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/study\/study-new$/)
  await expect(page.getByText('Abre el corazón.').first()).toBeVisible()
})
