import { expect, test } from '@playwright/test'
import { installApiMock, testUser } from './support/mockApi'

test('[AI-HELP-01] global help preserves its conversation across navigation and follows internal links', async ({ page }, testInfo) => {
  await installApiMock(page)
  const payloads: any[] = []
  await page.route('**/api/ai/app-help', async route => {
    payloads.push(route.request().postDataJSON())
    await route.fulfill({ json: { answer: 'Abre Ajustes para volver a ver el tutorial.', links: [{ href: '/ajustes', label: 'Abrir ajustes' }] } })
  })
  await page.goto('/ayuda')
  const before = await page.locator('[data-app-content]').boundingBox()
  await page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  if (testInfo.project.name === 'desktop-chromium') {
    const content = await page.locator('[data-app-content]').boundingBox()
    const assistant = await page.locator('#app-assistant').boundingBox()
    expect(content!.width).toBeLessThan(before!.width)
    expect(content!.x + content!.width).toBeLessThanOrEqual(assistant!.x)
    await page.locator('#feedback-message').fill('Puedo seguir utilizando la aplicación.')
  } else {
    await expect(page.locator('[data-app-content]')).toBeHidden()
  }
  const question = page.locator('#app-assistant-question')
  await question.fill('¿Cómo vuelvo a ver el tutorial?')
  await question.press('Enter')
  await expect(page.getByRole('log')).toContainText('Abre Ajustes')
  await page.screenshot({ path: test.info().outputPath('assistant.png') })
  expect(payloads[0].screen).toBe('help')
  await page.getByRole('link', { name: 'Abrir ajustes', exact: true }).click()
  await expect(page).toHaveURL(/\/ajustes/)
  if (testInfo.project.name === 'mobile-chromium') {
    await expect(page.locator('#app-assistant')).toBeHidden()
    await page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ }).click()
  } else {
    await expect(page.locator('#app-assistant')).toBeVisible()
  }
  await expect(page.getByRole('log')).toContainText('Abre Ajustes')
  await question.fill('¿Y cómo cambio el idioma?')
  await question.press('Enter')
  await expect.poll(() => payloads.length).toBe(2)
  expect(payloads[1].screen).toBe('settings')
  expect(payloads[1].history).toHaveLength(2)
  await expect(question).toBeEnabled()
  await page.getByRole('button', { name: /New conversation|Nueva conversación/ }).click()
  await expect(page.getByRole('log')).toBeEmpty()
  await page.keyboard.press('Escape')
  await expect(page.locator('#app-assistant')).toBeHidden()
  await expect(page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ })).toBeFocused()
})

test('[AI-HELP-03] failed questions remain editable and can be retried', async ({ page }) => {
  await installApiMock(page)
  let calls = 0
  await page.route('**/api/ai/app-help', async route => {
    calls++
    await route.fulfill(calls === 1 ? { status: 502, json: {} } : { json: { answer: 'Las Biblias descargadas funcionan sin conexión.', links: [] } })
  })
  await page.goto('/ayuda')
  await page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ }).click()
  const question = page.locator('#app-assistant-question')
  await question.fill('¿Puedo leer sin conexión?')
  await question.press('Enter')
  await expect(page.getByRole('alert')).toContainText(/Could not|No se pudo/)
  await expect(question).toHaveValue('¿Puedo leer sin conexión?')
  await question.press('Enter')
  await expect(page.getByRole('log')).toContainText('Las Biblias descargadas')
  await expect(question).toHaveValue('')
})

test('[AI-HELP-01] opens from the command palette and keyboard shortcut', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/ayuda')
  await page.keyboard.press('Control+Shift+J')
  await expect(page.locator('#app-assistant-question')).toBeFocused()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+k')
  await page.locator('[cmdk-input]').fill('Apolos')
  await page.getByRole('option', { name: /Open Apolos help|Abrir ayuda de Apolos/ }).click()
  await expect(page.locator('#app-assistant-question')).toBeFocused()
})

test('[AI-HELP-02] unverified users get an explanation and no composer', async ({ page }) => {
  await installApiMock(page, undefined, { user: { ...testUser, email_verified_at: null } })
  await page.goto('/ayuda')
  await page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ }).click()
  await expect(page.locator('#app-assistant')).toContainText(/Verify your email|Verifica tu correo/)
  await expect(page.locator('#app-assistant-question')).toHaveCount(0)
})

test('[AI-HELP-01] study canvas shares the layout with the assistant', async ({ page }, testInfo) => {
  await installApiMock(page)
  await page.goto('/study/study-active')
  await expect(page.locator('.react-flow')).toBeVisible()
  await page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ }).click()
  await expect(page.locator('#app-assistant-question')).toBeFocused()
  if (testInfo.project.name === 'desktop-chromium') {
    const canvas = await page.locator('.react-flow').boundingBox()
    const assistant = await page.locator('#app-assistant').boundingBox()
    expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(assistant!.x)
  } else {
    await expect(page.locator('.react-flow')).toBeHidden()
  }
  await page.getByRole('button', { name: /Close Apolos help|Cerrar ayuda de Apolos/ }).click()
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.getByRole('button', { name: /Open Apolos help|Abrir ayuda de Apolos/ })).toBeFocused()
})
