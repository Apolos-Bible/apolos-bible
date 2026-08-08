import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

async function firstVerse(page: Parameters<typeof installApiMock>[0]) {
  const verse = page.getByRole('listitem').filter({ hasText: 'En el principio era el Verbo.' }).first()
  await expect(verse).toBeVisible()
  return verse
}

async function ensureFirstVerseSelected(page: Parameters<typeof installApiMock>[0]) {
  const verse = await firstVerse(page)
  if (await verse.getAttribute('aria-current') !== 'true') await verse.click()
  await expect(verse).toHaveAttribute('aria-current', 'true')
  return verse
}

async function chooseMoreAction(
  page: Parameters<typeof installApiMock>[0],
  name: RegExp,
) {
  await page.getByRole('button', { name: /More actions|M.s acciones/i }).filter({ visible: true }).click()
  await page.getByRole('menuitem', { name }).click()
}

test.describe('Lector bíblico y acciones de versículo', () => {
  test('[SETTINGS-APPEAR-01] persiste el ancho del lector', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'El control de ancho solo existe en el lector de escritorio')
    await installApiMock(page)
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })

    const width = page.getByRole('slider', { name: /Reader width|Ancho del lector/i })
    await width.press('End')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('readerWidth'))).toBe('wide')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('slider', { name: /Reader width|Ancho del lector/i })).toHaveValue('2')
  })

  test('[BIBLE-NAV-01] abre un deep link localizado y selecciona el versículo', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/es/bible/juan/2/2', { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/es\/bible\/juan\/2\/2$/)
    const selected = page.getByRole('listitem').filter({ hasText: 'Él estaba con Dios.' }).first()
    await expect(selected).toHaveAttribute('aria-current', 'true')
  })

  test('[BIBLE-NAV-02] respeta límites y persiste la navegación de capítulo', async ({ page }, testInfo) => {
    await installApiMock(page)
    await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })

    const previous = page.getByRole('button', { name: /Previous chapter|Cap.tulo anterior/i }).filter({ visible: true }).first()
    const next = page.getByRole('button', { name: /Next chapter|Cap.tulo siguiente/i }).filter({ visible: true }).first()
    if (testInfo.project.name === 'mobile-chromium') {
      await previous.click()
      await expect(page).toHaveURL(/\/bible\/genesis\/1$/)
    } else {
      await expect(previous).toBeDisabled()
    }
    await next.click()

    await expect(page).toHaveURL(/\/bible\/genesis\/2$/)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('verbum_last_reading')))
      .toBe(JSON.stringify({ book: 'genesis', chapter: 2 }))
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/bible\/genesis\/2$/)
    await expect(page.getByRole('listitem').filter({ hasText: 'En el principio creó Dios.' }).first()).toBeVisible()
  })

  test('[BIBLE-NAV-02] no avanza después del último capítulo disponible', async ({ page }, testInfo) => {
    await installApiMock(page)
    await page.goto('/bible/juan/21', { waitUntil: 'domcontentloaded' })

    const next = page.getByRole('button', { name: /Next chapter|Cap.tulo siguiente/i }).filter({ visible: true }).first()
    if (testInfo.project.name === 'mobile-chromium') {
      await next.click()
      await expect(page).toHaveURL(/\/bible\/juan\/21$/)
    } else {
      await expect(next).toBeDisabled()
    }
  })

  test('[BIBLE-SELECT-01] selecciona un versículo y expone sus acciones', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })

    const verse = await firstVerse(page)
    await verse.click()

    await expect(verse).toHaveAttribute('aria-current', 'true')
    await expect(page.getByRole('group', { name: /Actions for selected verses|Acciones.*vers/i })).toBeVisible()
  })

  test('[BIBLE-SELECT-01] extiende una selección contigua con teclado', async ({ page }) => {
    await installApiMock(page)
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })

    const verses = page.getByRole('listitem')
    const first = verses.filter({ hasText: 'En el principio era el Verbo.' }).first()
    const third = verses.filter({ hasText: 'Todas las cosas por él fueron hechas.' }).first()
    await first.click()
    await expect(first).toHaveAttribute('aria-current', 'true')
    await page.keyboard.press('Shift+ArrowDown')
    await expect(verses.filter({ hasText: 'Él estaba con Dios.' }).first()).toHaveAttribute('aria-current', 'true')
    await page.keyboard.press('Shift+ArrowDown')

    await expect(first).toHaveAttribute('aria-current', 'true')
    await expect(verses.filter({ hasText: 'Él estaba con Dios.' }).first()).toHaveAttribute('aria-current', 'true')
    await expect(third).toHaveAttribute('aria-current', 'true')
  })

  test('[BIBLE-SELECT-01] extiende una selección contigua con Shift y puntero', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Shift+puntero es una interacción de escritorio')
    await installApiMock(page)
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })

    const verses = page.getByRole('listitem')
    const first = verses.filter({ hasText: 'En el principio era el Verbo.' }).first()
    const second = verses.filter({ hasText: 'Él estaba con Dios.' }).first()
    const third = verses.filter({ hasText: 'Todas las cosas por él fueron hechas.' }).first()
    await first.click()
    await expect(first).toHaveAttribute('aria-current', 'true')
    await third.click({ modifiers: ['Shift'] })

    await expect(first).toHaveAttribute('aria-current', 'true')
    await expect(second).toHaveAttribute('aria-current', 'true')
    await expect(third).toHaveAttribute('aria-current', 'true')
  })

  test('[VERSE-FAVORITE-01] añade y quita el favorito con postcondición de API', async ({ page }) => {
    const mutations: Array<Record<string, unknown>> = []
    await installApiMock(page)
    page.on('request', (request) => {
      if (/\/api\/verses\/\d+\/bookmark$/.test(request.url())) {
        mutations.push(request.postDataJSON() as Record<string, unknown>)
      }
    })
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })
    await ensureFirstVerseSelected(page)

    await chooseMoreAction(page, /Add to favorites|A.adir a favoritos/i)
    await expect.poll(() => mutations.length).toBe(1)
    expect(mutations[0]).toEqual({})
    await page.reload({ waitUntil: 'domcontentloaded' })
    await ensureFirstVerseSelected(page)
    await chooseMoreAction(page, /Remove from favorites|Quitar de favoritos/i)
    await expect.poll(() => mutations.length).toBe(2)
    expect(mutations[1]).toEqual({ _method: 'DELETE' })
  })

  test('[VERSE-HIGHLIGHT-01] crea y elimina un resaltado completo', async ({ page }) => {
    const paths: string[] = []
    const mutations: Array<Record<string, unknown>> = []
    await installApiMock(page, (path) => {
      if (path.includes('/highlights')) paths.push(path)
    })
    page.on('request', (request) => {
      if (/\/api\/verses\/\d+\/highlights$/.test(request.url()) && request.method() === 'POST') {
        mutations.push(request.postDataJSON() as Record<string, unknown>)
      }
    })
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })
    await ensureFirstVerseSelected(page)

    const toggle = page.getByRole('button', { name: /Highlight verse|Resaltar vers/i })
    await toggle.click()
    await expect.poll(() => paths.some((path) => /\/api\/verses\/\d+\/highlights/.test(path))).toBe(true)
    await expect.poll(() => mutations).toContainEqual({ start_index: 0, end_index: 29, color: 'yellow' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await ensureFirstVerseSelected(page)
    await page.getByRole('button', { name: /Highlight verse|Resaltar vers/i }).click()
    await expect.poll(() => paths).toContain('/api/highlights/8001')
  })

  test('[VERSE-COPY-01][VERSE-SHARE-01] copia texto y comparte con URL canónica', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (value: string) => { (window as unknown as { __copied: string }).__copied = value; return Promise.resolve() } },
      })
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    })
    await installApiMock(page)
    await page.goto('/es/bible/juan/1/1', { waitUntil: 'domcontentloaded' })
    await ensureFirstVerseSelected(page)

    await chooseMoreAction(page, /Copy verse text|Copiar vers.culo/i)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toBe('En el principio era el Verbo.')

    await chooseMoreAction(page, /Share verse|Compartir vers.culo/i)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toContain('Juan 1:1')
    await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toContain('/es/bible/juan/1/1')
  })

  test('[VERSE-COPY-01] conserva la atribución al copiar una versión remota', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (value: string) => { (window as unknown as { __copied: string }).__copied = value; return Promise.resolve() } },
      })
    })
    await installApiMock(page)
    await page.goto('/ajustes#biblia', { waitUntil: 'domcontentloaded' })
    const version = page.getByRole('combobox', { name: /^Version$|^Versi.n$/i }).first()
    await version.click()
    await page.getByRole('option', { name: /NVI-YV.*YouVersion/i }).click()
    await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })

    await ensureFirstVerseSelected(page)
    await chooseMoreAction(page, /Copy verse text|Copiar vers.culo/i)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toContain('En el principio era el Verbo.')
    await expect.poll(() => page.evaluate(() => (window as unknown as { __copied?: string }).__copied)).toContain('(NVI-YV)')
  })
})
