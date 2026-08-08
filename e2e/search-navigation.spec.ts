import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[SEARCH-OPEN-01] abre, enfoca y cierra la búsqueda', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('listitem').filter({ hasText: /En el principio cre.* Dios/i }).first()).toBeVisible()
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
  await expect(page.getByRole('listitem').filter({ hasText: /En el principio cre.* Dios/i }).first()).toBeVisible()

  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()
  if (testInfo.project.name === 'mobile-chromium') {
    await page.locator('input[type="search"]').fill('Juan')
    await page.getByRole('button', { name: /^Juan/i }).click()
  } else {
    await page.locator('[cmdk-input]').fill('Juan')
    await page.getByRole('option', { name: /Juan/i }).click()
  }

  await expect(page).toHaveURL(/\/bible\/juan\/1(?:\/1)?$/)
  await expect(page.getByRole('listitem').filter({ hasText: /En el principio era el Verbo/i }).first()).toBeVisible()
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
  await expect(page.getByRole('listitem').filter({ hasText: 'En el principio era el Verbo.' }).first())
    .toHaveAttribute('aria-current', 'true')
})

test('[SEARCH-TEXT-01] busca texto bíblico y abre el resultado', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()

  if (testInfo.project.name === 'mobile-chromium') {
    await page.locator('input[type="search"]').fill('bodas')
    await page.getByRole('button', { name: /bodas en Can/i }).click()
  } else {
    await page.locator('[cmdk-input]').fill('bodas')
    await page.getByRole('option', { name: /bodas en Can/i }).click()
  }

  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
  await expect(page.getByRole('listitem').filter({ hasText: 'En el principio era el Verbo.' }).first()).toHaveAttribute('aria-current', 'true')
})

test('[SEARCH-TEXT-01] muestra un estado vacío sin resultados', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()
  const search = testInfo.project.name === 'mobile-chromium'
    ? page.locator('input[type="search"]')
    : page.locator('[cmdk-input]')
  await search.fill('inexistente')

  await expect(page.getByText(/No results|Sin resultados|No se encontraron/i).filter({ visible: true })).toBeVisible()
})

test('[SEARCH-NOTE-01] busca únicamente las notas propias y abre su pasaje', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'La búsqueda de notas pertenece a la vista de búsqueda móvil')
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()
  await page.getByRole('button', { name: /^Notes$|^Notas$/i }).click()
  await page.locator('input[type="search"]').fill('esperanza')
  await page.getByRole('button', { name: /Juan 1:1.*Esperanza personal/i }).click()

  await expect(page).toHaveURL(/\/bible\/juan\/1\/1$/)
  await expect(page.getByRole('listitem').filter({ hasText: 'En el principio era el Verbo.' }).first()).toHaveAttribute('aria-current', 'true')
})

test('[SEARCH-PEOPLE-01] respeta la privacidad de descubrimiento y permite solicitar amistad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'La búsqueda de personas pertenece a la vista de búsqueda móvil')
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Search Bible|Buscar Biblia|Search|Buscar/i }).first().click()
  await page.getByRole('button', { name: /^People$|^Personas$/i }).click()
  await page.locator('input[type="search"]').fill('lucia.visible@example.test')

  await expect(page.getByText('Lucia Visible')).toBeVisible()
  await expect(page.getByText('lucia.visible@example.test')).toBeVisible()
  await expect(page.getByText(/Private Person|hidden-person@example\.com/i)).toHaveCount(0)

  await page.getByRole('button', { name: /^Add$|^Agregar$/i }).click()
  await expect(page.getByText(/Request sent|Solicitud enviada/i)).toBeVisible()
})
