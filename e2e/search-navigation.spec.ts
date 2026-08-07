import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SEARCH-BOOK-01] buscar Juan abre el libro seleccionado', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('option', { name: /En el principio cre.* Dios/i }).first()).toBeVisible()

  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()
  if (testInfo.project.name === 'mobile-chromium') {
    await page.locator('input[type="search"]').fill('Juan')
    await page.getByRole('button', { name: /^Juan/i }).click()
  } else {
    await page.locator('[cmdk-input]').fill('Juan')
    await page.getByRole('option', { name: /Juan/i }).click()
  }

  await expect(page).toHaveURL(/\/bible\/juan\/1(?:\/1)?$/)
  await expect(page.getByRole('option', { name: /En el principio era el Verbo/i }).first()).toBeVisible()
})
