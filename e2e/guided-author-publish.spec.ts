import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[GUIDED-AUTHOR-01][GUIDED-PUBLISH-01] crea, edita, persiste y envía una ruta a revisión', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/mis-rutas', { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: /^New path$|^Nueva ruta$/i }).first().click()
  const dialog = page.getByRole('dialog', { name: /^New path$|^Nueva ruta$/i })
  await dialog.getByRole('textbox', { name: /^Name$|^Nombre$/i }).fill('Camino de gracia')
  await dialog.getByLabel(/Description|Descripción/i).fill('Una ruta creada de principio a fin.')
  await dialog.getByRole('button', { name: /#668f32/i }).click()
  await dialog.getByRole('button', { name: /Create and edit|Crear y editar/i }).click()

  await expect(page).toHaveURL(/\/mis-rutas\/authored-path-1\/authored-study-1$/)
  await page.getByRole('button', { name: /Edit cover|Editar portada/i }).click()
  const coverDialog = page.getByRole('dialog', { name: /Edit cover|Editar portada/i })
  await coverDialog.getByRole('button', { name: /^Photo$|^Foto$/i }).click()
  await coverDialog.getByLabel(/Choose a photo|Elegir una foto/i).setInputFiles('public/logo.png')
  await coverDialog.getByRole('button', { name: /^Save$|^Guardar$/i }).click()
  await expect(coverDialog).toBeHidden()
  await expect.poll(() => requests).toContain('POST /api/guided-plans/authored-path-1/cover')

  await page.getByRole('button', { name: /^Add step$|^Añadir paso$/i }).click()
  await page.getByRole('menuitem', { name: /Before we begin|Antes de empezar/i }).click()
  await page.getByLabel(/Step title|Título del paso/i).fill('La gracia nos alcanza')
  await page.getByLabel(/Step text|Texto del paso/i).fill('Lee, medita y responde con sinceridad.')

  await page.getByRole('button', { name: /^Study$|^Estudio$/i }).click()
  const studyTitle = page.getByLabel(/Study title|Título del estudio/i)
  await studyTitle.fill('Gracia transformadora')
  await studyTitle.blur()
  await page.getByRole('button', { name: /^Step$|^Paso$/i }).click()
  await page.getByRole('button', { name: /^Save$|^Guardar$/i }).click()
  await expect(page.getByText(/^Saved$|^Guardado$/i)).toBeVisible()

  await expect.poll(() => requests.some((entry) => entry.includes('/authored-study-1/steps'))).toBe(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('La gracia nos alcanza')).toBeVisible()
  await page.getByRole('button', { name: /^Study$|^Estudio$/i }).click()
  await expect(page.getByLabel(/Study title|Título del estudio/i)).toHaveValue('Gracia transformadora')

  await page.getByRole('button', { name: /Submit for publication|Solicitar publicación/i }).click()
  await expect(page.getByText(/Waiting for review|Pendiente de revisión/i)).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Waiting for review|Pendiente de revisión/i)).toBeVisible()
  await expect.poll(() => requests.some((entry) => entry.includes('/request-publication'))).toBe(true)
})
