import { expect, test, type Page } from '@playwright/test'
import { installApiMock } from './support/mockApi'

async function addVerseAndOpenAi(page: Page) {
  await page.goto('/study/study-active', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox')).toHaveValue('Estudio canvas')
  await page.waitForFunction(() => Boolean((window as any).__studyCanvasActions?.addVerseNode))
  await page.evaluate(() => (window as any).__studyCanvasActions.addVerseNode({
    verseId: 4301001, reference: 'Juan 1:1', version_id: 1, text: 'En el principio era el Verbo.',
  }))
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.getByRole('button', { name: /Ask AI|Preguntar a la IA/i }).click()
  await expect(page.getByText(/^Ask AI$|^Preguntar a la IA$/i)).toBeVisible()
}

test('[AI-ASK-01] pregunta por un versículo y añade la respuesta citada al lienzo', async ({ page }) => {
  await installApiMock(page, undefined, { aiScenario: 'success' })
  await addVerseAndOpenAi(page)

  const question = page.getByPlaceholder(/What do you want to know|Qué quieres saber/i)
  await question.fill('¿Qué afirma Juan acerca del Verbo?')
  await page.getByRole('button', { name: /^Ask$|^Preguntar$/i }).click()

  await expect(page.locator('.react-flow__node')).toHaveCount(2)
  await expect(page.getByText('Juan presenta al Verbo eterno y lo identifica con Dios.')).toBeVisible()
  await expect(page.locator('.react-flow__node').last().getByText('Juan 1:1')).toBeVisible()
})

test('[AI-QUOTA-01] muestra la cuota agotada y bloquea nuevas preguntas', async ({ page }) => {
  await installApiMock(page, undefined, { aiScenario: 'quota' })
  await addVerseAndOpenAi(page)

  await expect(page.getByText(/1[,.]?000 \/ 1[,.]?000/i)).toBeVisible()
  const question = page.getByPlaceholder(/What do you want to know|Qué quieres saber/i)
  await question.fill('¿Qué significa?')
  await expect(page.getByRole('button', { name: /^Ask$|^Preguntar$/i })).toBeDisabled()
})

test('[AI-QUOTA-01] informa del rate limit y permite reintentar', async ({ page }) => {
  await installApiMock(page, undefined, { aiScenario: 'rate-then-success' })
  await addVerseAndOpenAi(page)

  const question = page.getByPlaceholder(/What do you want to know|Qué quieres saber/i)
  await question.fill('¿Qué significa?')
  await page.getByRole('button', { name: /^Ask$|^Preguntar$/i }).click()
  await expect(page.getByText(/asking questions too quickly|haciendo preguntas muy rápido/i)).toBeVisible()
  await page.getByRole('button', { name: /^Ask$|^Preguntar$/i }).click()
  await expect(page.getByText('Juan presenta al Verbo eterno y lo identifica con Dios.')).toBeVisible()
})
