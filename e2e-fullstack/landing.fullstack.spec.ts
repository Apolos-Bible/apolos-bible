import { expect, test } from '@playwright/test'

const backend = 'http://127.0.0.1:8000'

test.describe('Laravel-backed public landing', () => {
  test('[LANDING-I18N-01][LANDING-DOWNLOAD-01][LANDING-LEGAL-01] renders localized navigation and branded downloads', async ({ page }) => {
    for (const locale of ['es', 'en'] as const) {
      await page.goto(`${backend}/${locale}`, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page).toHaveTitle(locale === 'es' ? /Lee la Biblia con otros/ : /Read the Bible with others/)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        locale === 'es' ? /leer la Biblia acompañado/ : /reading the Bible in company/,
      )
      await expect(page.locator('body')).not.toContainText(/open[ -]?source|código abierto|GitHub/i)

      for (const artifact of ['Apolos.dmg', 'Apolos.msi', 'Apolos.AppImage', 'Apolos.apk']) {
        await expect(page.locator(`a[href^="https://releases.apolos.io/"][href$="${artifact}"]`).first()).toBeVisible()
      }

      const prefix = locale === 'en' ? '/en' : ''
      const privacy = page.locator(`.foot a[href$="${prefix}/privacy"]`)
      const terms = page.locator(`.foot a[href$="${prefix}/terms"]`)
      await expect(privacy).toBeVisible()
      await expect(terms).toBeVisible()
      await privacy.click()
      await expect(page).toHaveURL(new RegExp(`${prefix}/privacy$`))
      await expect(page.locator('body')).toContainText(/Backblaze B2/i)
      await page.goto(`${backend}/${locale}`, { waitUntil: 'domcontentloaded' })
      await page.locator(`.foot a[href$="${prefix}/terms"]`).click()
      await expect(page).toHaveURL(new RegExp(`${prefix}/terms$`))
    }
  })

  test('[LANDING-ANALYTICS-01] rejects analytics and persists the decision', async ({ page, context }) => {
    await page.goto(`${backend}/es`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#apolos-google-analytics')).toHaveCount(0)
    await page.locator('[data-analytics-consent="denied"]').click()
    await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === 'analytics_consent')?.value).toBe('denied')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('#cookie-consent')).toBeHidden()
    await expect(page.locator('#apolos-google-analytics')).toHaveCount(0)
  })

  test('[LANDING-ANALYTICS-01] grants analytics and restores it after reload', async ({ page, context }) => {
    await page.goto(`${backend}/en`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-analytics-consent="granted"]').click()
    await expect.poll(async () => (await context.cookies()).find((cookie) => cookie.name === 'analytics_consent')?.value).toBe('granted')
    await expect(page.locator('#apolos-google-analytics')).toHaveAttribute('src', /googletagmanager\.com\/gtag\/js\?id=/)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('#cookie-consent')).toBeHidden()
    await expect(page.locator('#apolos-google-analytics')).toHaveCount(1)
  })
})
