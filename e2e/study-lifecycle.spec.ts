import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

async function openMyStudies(page: Parameters<typeof installApiMock>[0]) {
  await page.goto('/bible/genesis/1', { waitUntil: 'domcontentloaded' })
  await page.locator('[data-tour="my-studies"]').click()
  await expect(page.getByText(/My Studies|Mis estudios/i).filter({ visible: true }).first()).toBeVisible()
}

test('[STUDY-LIFE-01] crea un estudio libre y abre la nueva sesión', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'El panel de estudios se valida en el workspace de escritorio')
  const payloads: Array<Record<string, unknown>> = []
  await installApiMock(page)
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/studies' && request.method() === 'POST') {
      payloads.push(request.postDataJSON() as Record<string, unknown>)
    }
  })
  await openMyStudies(page)
  await page.getByRole('button', { name: /New Study|Nuevo estudio/i }).filter({ visible: true }).last().click()
  const dialog = page.getByRole('dialog', { name: /Start.*study|Iniciar.*estudio/i })
  await dialog.getByRole('button', { name: /Free|Libre/i }).click()
  await dialog.locator('input[type="text"]').fill('Mi estudio E2E')
  await dialog.getByRole('button', { name: /^Start$|^Iniciar$/i }).click()

  await expect(page).toHaveURL(/\/study\/study-new$/)
  expect(payloads).toContainEqual({ type: 'free', title: 'Mi estudio E2E' })
})

test('[STUDY-LIFE-01] filtra y reabre una sesión terminada con el nuevo identificador', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium', 'El panel de estudios se valida en el workspace de escritorio')
  await installApiMock(page)
  await openMyStudies(page)
  await page.getByRole('button', { name: /Ended|Terminados/i }).filter({ visible: true }).click()
  await page.getByRole('button', { name: /Estudio terminado/i }).click()
  await expect(page).toHaveURL(/\/study\/study-reopened$/)
})
