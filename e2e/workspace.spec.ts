import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test.beforeEach(async ({ page }) => {
  await installApiMock(page)
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
})

test('[WORKSPACE-TAB-01][WORKSPACE-SHORTCUT-01] abre, selecciona, reordena y cierra pestañas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'Las pestañas editoras son una interfaz de escritorio')

  await page.locator('[data-tour="bible"]').click({ modifiers: ['Control'] })
  const tabbar = page.getByRole('toolbar', { name: /Workspace tabs|Pestañas del espacio/i })
  const tabs = tabbar.locator('[data-workspace-tab]')
  await expect(tabs).toHaveCount(2)
  await expect(tabs.last()).toHaveAttribute('aria-pressed', 'true')

  const bibleTab = tabs.first()
  await bibleTab.click()
  await expect(page).toHaveURL(/\/bible\/genesis\/1$/)
  await bibleTab.press('Alt+Shift+ArrowRight')
  await expect(tabs.nth(1)).toHaveAttribute('aria-pressed', 'true')

  await tabbar.getByRole('button', { name: /Close|Cerrar/i }).first().click()
  await expect(tabs).toHaveCount(1)

  await page.keyboard.press('?')
  await expect(page.getByRole('heading', { name: /Keyboard shortcuts|Atajos de teclado/i })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: /Keyboard shortcuts|Atajos de teclado/i })).toHaveCount(0)
})

test('[WORKSPACE-PANE-01] divide, redimensiona, persiste y cierra grupos', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'Los grupos divididos son una interfaz de escritorio')

  await page.locator('[data-tour="bible"]').click({ modifiers: ['Control'] })
  await page.getByRole('button', { name: /Move active tab to a new column|Mover la pestaña activa a una nueva columna/i }).click()
  await expect(page.getByRole('region', { name: /Editor group|Grupo editor/i })).toHaveCount(2)

  const separator = page.getByRole('separator', { name: /Resize editor groups|Redimensionar grupos de edición/i })
  await separator.press('ArrowRight')
  await expect(separator).toHaveAttribute('aria-valuenow', '52')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('apolos_workspace_layout_v2'))).toContain('0.52')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('separator', { name: /Resize editor groups|Redimensionar grupos de edición/i })).toHaveAttribute('aria-valuenow', '52')
  await page.getByRole('button', { name: /Close editor group|Cerrar grupo de edición/i }).last().click()
  await expect(page.getByRole('region', { name: /Editor group|Grupo editor/i })).toHaveCount(1)
})

test('[WORKSPACE-DND-01] reordena pestañas mediante arrastre y persiste el resultado', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'El arrastre de pestañas pertenece a la interfaz de escritorio')

  await page.locator('[data-tour="bible"]').click({ modifiers: ['Control'] })
  const tablist = page.getByRole('toolbar', { name: /Workspace tabs|Pestañas del espacio/i })
  const tabs = tablist.locator('[data-workspace-tab]')
  await expect(tabs).toHaveCount(2)
  const storedOrder = () => page.evaluate(() => {
    const workspace = JSON.parse(localStorage.getItem('apolos_workspace_layout_v2') ?? '{}')
    return workspace.layout?.tabIds as string[] | undefined
  })
  const before = await storedOrder()

  await tabs.first().dragTo(tabs.last())
  await expect.poll(storedOrder).toEqual([before?.[1], before?.[0]])
})

test('[WORKSPACE-RESP-01] conserva ruta y contenido al cambiar entre escritorio y móvil', async ({ page }) => {
  await page.goto('/bible/juan/2/1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('option').filter({ hasText: 'En el principio era el Verbo.' }).first()).toBeVisible()

  await page.setViewportSize({ width: 412, height: 915 })
  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
  await expect(page.getByRole('option').filter({ hasText: 'En el principio era el Verbo.' }).first()).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page).toHaveURL(/\/bible\/juan\/2\/1$/)
  await expect(page.getByRole('option').filter({ hasText: 'En el principio era el Verbo.' }).first()).toBeVisible()
})
