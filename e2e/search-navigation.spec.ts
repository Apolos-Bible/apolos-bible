import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SEARCH-OPEN-01] abre, enfoca y cierra la búsqueda', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('option', { name: /En el principio cre.* Dios/i }).first()).toBeVisible()
  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()

  if (testInfo.project.name === 'mobile-chromium') {
    const search = page.locator('input[type="search"]')
    await expect(search).toBeFocused()
    await page.getByRole('button', { name: /Back|Volver/i }).click()
    await expect(search).toHaveCount(0)
  } else {
    const search = page.locator('[cmdk-input]')
    await expect(search).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(search).toHaveCount(0)
  }
})

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

test('[SEARCH-REF-01] una referencia exacta abre capítulo y versículo', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()

  if (testInfo.project.name === 'mobile-chromium') {
    await page.locator('input[type="search"]').fill('Juan 2:1')
    await page.getByRole('button', { name: /Juan 2:1/i }).first().click()
  } else {
    await page.locator('[cmdk-input]').fill('Juan 2:1')
    await page.getByRole('option', { name: /Juan 2:1/i }).click()
  }

  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
  await expect(page.getByRole('option').filter({ hasText: 'En el principio era el Verbo.' }).first())
    .toHaveAttribute('aria-selected', 'true')
})
