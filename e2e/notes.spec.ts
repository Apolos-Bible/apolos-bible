import { expect, test } from '@playwright/test'
import { installApiMock } from './support/mockApi'

const sharedFriendNote = {
  id: 7200,
  verse_id: 4301001,
  parent_id: null,
  body: 'Reflexión compartida por Lucía',
  is_public: true,
  note_type: 'insight',
  created_at: '2026-08-07T20:00:00Z',
  user: { id: 21, name: 'Lucia Visible', email: 'lucia.visible@example.test', avatar_url: null },
  likes_count: 0,
  is_liked: false,
}

async function openNotes(page: Parameters<typeof installApiMock>[0]) {
  await page.goto('/bible/juan/1', { waitUntil: 'domcontentloaded' })
  const verse = page.getByRole('listitem').filter({ hasText: 'En el principio era el Verbo.' }).first()
  await expect(verse).toBeVisible()
  await verse.click()
  await page.getByRole('button', { name: /Add Note|A.adir nota/i }).filter({ visible: true }).click()
  await expect(page.getByRole('textbox', { name: /Add Note|A.adir nota/i })).toBeVisible()
}

async function addNote(page: Parameters<typeof installApiMock>[0], body: string) {
  const input = page.getByRole('textbox', { name: /Add Note|A.adir nota/i }).filter({ visible: true })
  await input.fill(body)
  await input.press('Control+Enter')
  await expect(input).toHaveValue('')
  await expect(page.locator('.note-surface').filter({ hasText: body }).filter({ visible: true }).first()).toBeVisible()
}

test.describe('Notas de versículos', () => {
  test('[NOTES-RICH-01] renderiza formato seguro y elimina HTML peligroso', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __unsafeNoteExecuted?: boolean }).__unsafeNoteExecuted = false
    })
    await installApiMock(page)
    await openNotes(page)

    const input = page.getByRole('textbox', { name: /Add Note|A.adir nota/i }).filter({ visible: true })
    await input.fill('<!--apolos-rich-note--><strong>Texto seguro</strong><img src=x onerror="window.__unsafeNoteExecuted=true"><script>window.__unsafeNoteExecuted=true</script>')
    await input.press('Control+Enter')

    const note = page.locator('.note-surface').filter({ hasText: 'Texto seguro' }).filter({ visible: true }).first()
    const content = note.locator('.note-rich-content')
    await expect(content.locator('strong')).toHaveText('Texto seguro')
    await expect(content.locator('img, script')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __unsafeNoteExecuted?: boolean }).__unsafeNoteExecuted)).toBe(false)
  })

  test('[NOTES-CRUD-01] crea, edita y elimina una nota con postcondiciones de API', async ({ page }) => {
    const mutations: Array<{ path: string; method: string }> = []
    await installApiMock(page, (path, method) => {
      if (path.includes('/notes')) mutations.push({ path, method })
    })
    await openNotes(page)
    await addNote(page, 'Observación inicial')

    let note = page.locator('.note-surface').filter({ hasText: 'Observación inicial' }).filter({ visible: true }).first()
    await note.getByRole('button', { name: /Note settings|Ajustes de nota/i }).click()
    await note.getByRole('button', { name: /Edit|Editar/i }).click()
    const editor = page.getByRole('textbox', { name: /Write your note|Escribe tu nota/i }).filter({ visible: true })
    await editor.fill('Observación corregida')
    await page.getByRole('button', { name: /Save|Guardar/i }).filter({ visible: true }).click()
    note = page.locator('.note-surface').filter({ hasText: 'Observación corregida' }).filter({ visible: true }).first()
    await expect(note).toBeVisible()

    await note.getByRole('button', { name: /Note settings|Ajustes de nota/i }).click()
    await note.getByRole('button', { name: /Delete|Eliminar/i }).click()
    await note.getByRole('button', { name: /^(Yes|Sí)$/i }).click()
    await expect(page.locator('.note-surface').filter({ hasText: 'Observación corregida' }).filter({ visible: true })).toHaveCount(0)
    expect(mutations).toEqual(expect.arrayContaining([
      { path: '/api/verses/4301001/notes', method: 'POST' },
      { path: '/api/notes/7001', method: 'POST' },
    ]))
  })

  test('[NOTES-TYPE-01] conserva la categoría de la nota tras recargar', async ({ page }) => {
    await installApiMock(page)
    await openNotes(page)
    await addNote(page, 'Petición persistente')

    let note = page.locator('.note-surface').filter({ hasText: 'Petición persistente' }).filter({ visible: true }).first()
    await note.getByRole('button', { name: /Note settings|Ajustes de nota/i }).click()
    await note.getByRole('button', { name: /Prayer|Oraci.n/i }).click()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await openNotes(page)

    note = page.locator('.note-surface').filter({ hasText: 'Petición persistente' }).filter({ visible: true }).first()
    await note.getByRole('button', { name: /Note settings|Ajustes de nota/i }).click()
    await expect(note.getByRole('button', { name: /Prayer|Oraci.n/i })).not.toHaveClass(/border-transparent/)
  })

  test('[NOTES-TYPE-01][NOTES-VISIBILITY-01][NOTES-THREAD-01][NOTES-LIKE-01] publica, responde y marca una nota como favorita', async ({ page }) => {
    const requests: Array<{ path: string; method: string }> = []
    await installApiMock(page, (path, method) => {
      if (path.includes('/notes')) requests.push({ path, method })
    })
    await openNotes(page)
    await addNote(page, 'Compartir esta reflexión')

    const note = page.locator('.note-surface').filter({ hasText: 'Compartir esta reflexión' }).filter({ visible: true }).first()
    await note.getByRole('button', { name: /Note settings|Ajustes de nota/i }).click()
    await note.getByRole('button', { name: /Prayer|Oraci.n/i }).click()
    await expect.poll(() => requests.filter(({ path }) => path === '/api/notes/7001').length).toBeGreaterThanOrEqual(1)
    await note.getByRole('button', { name: /Note settings|Ajustes de nota/i }).click()
    const visibility = note.getByRole('button', { name: /Private|Privada/i })
    await visibility.click()
    await note.getByRole('button', { name: /Click to publish|Clic otra vez para publicar/i }).click()
    await expect(note.getByRole('button', { name: /Public|P.blica/i })).toBeVisible()

    await note.getByRole('button', { name: /Reply|Responder/i }).click()
    const reply = note.getByRole('textbox', { name: /Write a reply|Escribe una respuesta/i })
    await reply.fill('Amén')
    await reply.press('Control+Enter')
    await expect.poll(() => requests.filter(({ path, method }) => path === '/api/verses/4301001/notes' && method === 'POST').length).toBe(2)

    const refreshedNote = page.locator('.note-surface').filter({ hasText: 'Compartir esta reflexión' }).filter({ visible: true }).first()
    await refreshedNote.getByRole('button', { name: '♡' }).first().click()
    await expect(refreshedNote.getByRole('button', { name: /♥ 1/ }).first()).toBeVisible()
    expect(requests).toEqual(expect.arrayContaining([
      { path: '/api/notes/7001', method: 'POST' },
      { path: '/api/verses/4301001/notes', method: 'POST' },
      { path: '/api/notes/7001/like', method: 'POST' },
    ]))
  })

  test('[NOTES-VISIBILITY-01][NOTES-THREAD-01] limita a un amigo a responder sin editar la nota ajena', async ({ page }) => {
    let replyBody: Record<string, unknown> | undefined
    await installApiMock(page, undefined, { initialNotes: [sharedFriendNote] })
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/verses/4301001/notes' && request.method() === 'POST') {
        replyBody = request.postDataJSON() as Record<string, unknown>
      }
    })
    await openNotes(page)
    await page.getByRole('switch', { name: /Show notes from others|Mostrar notas de otros/i }).check()

    const note = page.locator('.note-surface').filter({ hasText: 'Reflexión compartida por Lucía' }).filter({ visible: true }).first()
    await expect(note).toBeVisible()
    await expect(note.getByRole('button', { name: /Note settings|Ajustes de nota/i })).toHaveCount(0)
    await note.getByRole('button', { name: /Reply|Responder/i }).click()
    const reply = note.getByRole('textbox', { name: /Write a reply|Escribe una respuesta/i })
    await reply.fill('Respuesta autorizada')
    await reply.press('Control+Enter')

    await expect.poll(() => replyBody).toMatchObject({
      body: 'Respuesta autorizada',
      parent_id: 7200,
    })
  })

  test('[NOTES-VISIBILITY-01] no renderiza notas que el API oculta a un desconocido', async ({ page }) => {
    await installApiMock(page, undefined, { initialNotes: [] })
    await openNotes(page)
    await page.getByRole('switch', { name: /Show notes from others|Mostrar notas de otros/i }).check()

    await expect(page.getByText('Reflexión compartida por Lucía')).toHaveCount(0)
  })
})
