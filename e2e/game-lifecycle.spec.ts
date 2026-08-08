import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

test('[GAME-ROOM-01][GAME-HOST-01][GAME-ANSWER-01][GAME-SCORE-01] completa y reinicia una partida', async ({ page }) => {
  const requests: string[] = []
  await installApiMock(page, (path, method) => requests.push(`${method} ${path}`))
  await page.goto('/juegos', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Create a game|Crear una partida|Crear partida/i }).click()
  await expect(page).toHaveURL(/\/juegos\/game-room-1$/)
  await expect(page.getByText('ABC123')).toBeVisible()

  await page.getByRole('button', { name: /Start game|Empezar partida|Comenzar partida/i }).click()
  await expect(page.getByText('¿Quién escribió el cuarto Evangelio?')).toBeVisible()
  await page.getByRole('button', { name: /Juan/ }).click()
  await page.getByRole('button', { name: /Confirm answer|Confirmar respuesta/i }).click()
  await expect(page.getByText(/Answer sent|Respuesta enviada|Respuesta guardada/i)).toBeVisible()
  await page.getByRole('button', { name: /Reveal answer|Mostrar respuesta/i }).click()
  await expect(page.getByText(/Correct|Correcto/i)).toBeVisible()
  await page.getByRole('button', { name: /See results|Ver resultados|Resultados/i }).click()
  await expect(page.getByText(/Ana Segura.*1[,.]?000|1[,.]?000 pts/i).first()).toBeVisible()

  await page.getByRole('button', { name: /Play again|Jugar otra vez/i }).click()
  await expect(page.getByText('ABC123')).toBeVisible()
  await expect.poll(() => requests).toContain('POST /api/games/rooms/game-room-1/replay')
})

test('[GAME-ROOM-01] reabre una sala activa y entra mediante código normalizado', async ({ page }) => {
  await installApiMock(page)
  await page.goto('/juegos', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Create a game|Crear una partida|Crear partida/i }).click()
  await page.goto('/juegos', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^Open$|^Abrir$/i }).click()
  await expect(page).toHaveURL(/\/juegos\/game-room-1$/)

  await page.goto('/juegos', { waitUntil: 'domcontentloaded' })
  const code = page.getByRole('textbox', { name: /Room code|Código de sala|Código/i })
  await code.fill('abc-123')
  await page.getByRole('button', { name: /^Join$|^Entrar$/i }).click()
  await expect(page).toHaveURL(/\/juegos\/game-room-1$/)
})
