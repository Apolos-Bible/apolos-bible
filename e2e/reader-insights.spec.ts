import { expect, test, type Page } from '@playwright/test'
import { installApiMock } from './support/mockApi'

async function selectFirstVerse(page: Page) {
  const verse = page.getByRole('listitem').filter({ hasText: /En el principio cre.* Dios/i }).first()
  await expect(verse).toBeVisible()
  await verse.click()
  await expect(verse).toHaveAttribute('aria-current', 'true')
}

async function invokeVerseAction(page: Page, name: RegExp) {
  const direct = page.getByRole('button', { name }).filter({ visible: true })
  if (await direct.count()) {
    await direct.first().click()
    return
  }
  await page.getByRole('button', { name: /More actions|M.s acciones/i }).filter({ visible: true }).click()
  await page.getByRole('menuitem', { name }).click()
}

test.beforeEach(async ({ page }) => {
  await installApiMock(page)
  const crossRefIndex = page.waitForResponse((response) => response.url().includes('cross-ref-verse-ids'))
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await crossRefIndex
  await selectFirstVerse(page)
})

test('[VERSE-CROSSREF-01] carga una referencia cruzada y abre su destino', async ({ page }) => {
  await invokeVerseAction(page, /Cross-references|Referencias cruzadas/i)
  await expect(page.getByRole('heading', { name: /Cross-References|Referencias cruzadas/i })).toBeVisible()
  await page.getByRole('button', { name: /Juan 2:1.*En el principio era el Verbo/i }).click()

  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
  await expect(page.getByRole('listitem').filter({ hasText: 'En el principio era el Verbo.' }).first())
    .toHaveAttribute('aria-current', 'true')
})

test('[SEARCH-SEMANTIC-01] encuentra un versículo similar y permite reintentar la navegación', async ({ page }) => {
  await invokeVerseAction(page, /Similar verses|Vers.culos similares/i)
  await expect(page.getByRole('heading', { name: /Similar verses|Vers.culos similares/i })).toBeVisible()
  await page.getByRole('button', { name: /Juan 2:1.*En el principio era el Verbo/i }).click()

  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
})

test('[SEARCH-SEMANTIC-01] muestra un límite temporal y recupera al reintentar', async ({ page }) => {
  let attempts = 0
  await page.route(/\/api\/verses\/\d+\/similar/, async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'Quota exceeded' }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      seed_verse_id: 1001001,
      model: 'test-semantic-v1',
      results: [{
        verse_id: 43002001,
        book: 'Juan',
        book_slug: 'juan',
        chapter: 2,
        verse: 1,
        text: 'En el principio era el Verbo.',
        score: 0.94,
      }],
    }) })
  })

  await invokeVerseAction(page, /Similar verses|Vers.culos similares/i)
  await expect(page.getByText(/Couldn't load similar verses|No se pudieron cargar los vers.culos similares/i).filter({ visible: true }).first()).toBeVisible()
  await page.getByRole('tab', { name: /Cross-References|Referencias cruzadas/i }).filter({ visible: true }).first().click()
  await page.getByRole('tab', { name: /Similar verses|Vers.culos similares/i }).filter({ visible: true }).first().click()
  await expect(page.getByRole('button', { name: /Juan 2:1.*En el principio era el Verbo/i }).filter({ visible: true }).first()).toBeVisible()
  expect(attempts).toBe(2)
})

test('[VERSE-COMPARE-01] abre otra versión, cambia la comparación y la cierra', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'La comparación paralela pertenece al lector de escritorio')
  await page.getByRole('button', { name: /Compare versions|Comparar versiones/i }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: /Compare versions|Comparar versiones/i })).toBeVisible()
  const selector = page.getByRole('combobox', { name: /Version to compare|Versión para comparar/i })
  await expect(selector).toContainText(/NVI/)
  await expect(page.locator('[data-compare-verse="1"]')).toContainText(/En el principio cre.* Dios/i)

  await selector.click()
  await page.getByRole('option', { name: /NVI-YV.*YouVersion/i }).click()
  await expect(selector).toContainText(/NVI-YV/)
  await expect(page.locator('[data-compare-verse="1"]')).toContainText(/En el principio era el Verbo/i)
  await expect(page.getByText(/Not available in this version|No disponible en esta versi.n/i)).toHaveCount(0)

  await selector.click()
  await page.getByRole('option', { name: /NTV/ }).click()
  await expect(selector).toContainText(/NTV/)
  await page.getByRole('heading', { name: /Compare versions|Comparar versiones/i })
    .locator('..').getByRole('button', { name: /Close|Cerrar/i }).click()
  await expect(page.getByRole('heading', { name: /Compare versions|Comparar versiones/i })).toHaveCount(0)
})
