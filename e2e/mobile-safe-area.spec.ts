import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[PWA-SAFE-AREA-01] integra la zona segura inferior en la navegación móvil', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'La navegación inferior solo existe en móvil')

  await installApiMock(page)
  await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--android-safe-area-inset-bottom', '24px')
  })

  const navigation = page.getByRole('navigation', { name: /Library|Biblioteca/i })
  await expect(navigation).toBeVisible()
  const geometry = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('#root')!
    const nav = document.querySelector<HTMLElement>('nav[aria-label="Library"], nav[aria-label="Biblioteca"]')!
    const rootStyle = getComputedStyle(root)
    const navStyle = getComputedStyle(nav)
    return {
      viewportWidth: window.innerWidth,
      androidInset: getComputedStyle(document.documentElement).getPropertyValue('--android-safe-area-inset-bottom'),
      rootPadding: rootStyle.paddingBottom,
      navHeight: navStyle.height,
      navPadding: navStyle.paddingBottom,
    }
  })
  expect(geometry).toEqual({
    viewportWidth: testInfo.project.use.viewport?.width,
    androidInset: '24px',
    rootPadding: '0px',
    navHeight: '92px',
    navPadding: '24px',
  })

  const bounds = await navigation.boundingBox()
  expect(bounds).not.toBeNull()
  expect(Math.round(bounds!.y + bounds!.height)).toBe(testInfo.project.use.viewport?.height)
})

test('[PWA-SYSTEM-BAR-01] aplica la superficie e iconos adecuados al tema inicial', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'La barra de estado se valida en el viewport móvil')

  await installApiMock(page)
  await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })

  await page.evaluate(() => localStorage.setItem('theme', 'dark'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#151922')
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black-translucent')
  await expect(page.locator('#root')).toHaveCSS('background-color', 'rgb(21, 25, 34)')

  await page.evaluate(() => localStorage.setItem('theme', 'light'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff')
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'default')
  await expect(page.locator('#root')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})
