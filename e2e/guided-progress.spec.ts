import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[GUIDED-PROGRESS-01] guarda respuesta, reanuda el paso y completa el estudio', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/marketplace/hope-path', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Esperanza firme/i }).click()
  await page.getByRole('dialog', { name: 'Esperanza firme' })
    .getByRole('button', { name: /Start this study|Iniciar este estudio/i }).click()
  await expect(page).toHaveURL(/\/study\/study-new$/)

  await page.getByRole('button', { name: /^Next$|^Siguiente$/i }).click()
  const answer = page.getByPlaceholder(/Write what you understand|Escribe lo que tú entiendes/i)
  await answer.fill('Hoy confiaré aunque no vea el resultado.')
  await answer.blur()
  await expect.poll(() => requests.some((entry) => entry === 'POST /api/guided-studies/hope-study/steps/802/responses')).toBe(true)

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByPlaceholder(/Write what you understand|Escribe lo que tú entiendes/i))
    .toHaveValue('Hoy confiaré aunque no vea el resultado.')
  await page.getByRole('button', { name: /Finish study|Terminar estudio/i }).click()
  await expect(page.getByRole('button', { name: /Study finished|Estudio terminado/i })).toBeDisabled()
})
