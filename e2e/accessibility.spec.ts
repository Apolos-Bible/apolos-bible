import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.beforeEach(async ({ page }) => {
  await installApiMock(page)
})

test('[A11Y-NAV-01] permite saltar regiones y conserva el foco dentro de diálogos', async ({ page }, testInfo) => {
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-verse-id]').filter({ hasText: /En el principio cre.* Dios/i }).first()).toBeVisible()

  const skipReader = page.getByRole('button', { name: /Skip to the reader|Saltar al lector/i })
  await skipReader.focus()
  await expect(skipReader).toBeFocused()
  await skipReader.click()
  await expect(page.locator('[data-region="reader"]:visible')).toBeFocused()

  await page.keyboard.press('F6')
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.region ?? null))
    .not.toBeNull()

  if (testInfo.project.name === 'mobile-chromium') return

  const search = page.getByRole('button', { name: /Search Bible|Buscar Biblia/i }).first()
  await search.focus()
  await page.keyboard.press('?')
  const dialog = page.getByRole('dialog', { name: /Keyboard shortcuts|Atajos de teclado/i })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(':focus')).toHaveCount(1)

  for (let index = 0; index < 12; index += 1) await page.keyboard.press('Tab')
  await expect(dialog.locator(':focus')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(search).toBeFocused()
})

test('[A11Y-MOBILE-01] evita el autozoom al enfocar controles editables', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Only applies to touch devices')

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const fontSizes = await page.evaluate(() => {
    const controls = [
      document.createElement('input'),
      document.createElement('textarea'),
      document.createElement('select'),
    ]

    controls.forEach((control) => {
      control.style.fontSize = '12px'
      document.body.append(control)
    })

    return controls.map((control) => Number.parseFloat(getComputedStyle(control).fontSize))
  })

  expect(fontSizes).toEqual([16, 16, 16])
})

for (const route of ['/bible/genesis/1', '/ajustes']) {
  test(`[A11Y-SCREEN-01] no presenta infracciones automáticas críticas en ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    if (route.startsWith('/bible/')) {
      await expect(page.locator('[data-verse-id]').filter({ hasText: /En el principio cre.* Dios/i }).first()).toBeVisible()
    } else {
      await expect(page.locator('main').getByRole('heading').first()).toBeVisible()
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? '')))
      .toEqual([])
  })
}
