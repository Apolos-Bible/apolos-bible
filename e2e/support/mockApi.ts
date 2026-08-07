import type { Page, Route } from '@playwright/test'

export const testUser = {
  id: 7,
  name: 'Ana Segura',
  email: 'ana@example.test',
  email_verified_at: '2026-08-01T10:00:00Z',
  avatar_url: null,
  bio: 'Estudio la Biblia con mi comunidad.',
  has_password: true,
  connected_providers: ['password', 'google'],
}

const versions = [{
  id: 1,
  name: 'Reina Valera 1960',
  abbreviation: 'RVR1960',
  language: 'es',
  provider: 'local',
}, {
  id: 2,
  name: 'Nueva Versión Internacional',
  abbreviation: 'NVI',
  language: 'es',
  provider: 'local',
}]

const books = [
  { id: 1, number: 1, name: 'Génesis', slug: 'genesis', chapters_count: 50 },
  { id: 43, number: 43, name: 'Juan', slug: 'juan', chapters_count: 21 },
]

function chapterResponse(path: string) {
  const match = path.match(/\/books\/([^/]+)\/chapters\/(\d+)/)
  const slug = match?.[1] ?? 'juan'
  const chapter = Number(match?.[2] ?? 1)
  const isJohn = slug === 'juan'
  return {
    book: { number: isJohn ? 43 : 1, name: isJohn ? 'Juan' : 'Génesis', slug },
    chapter,
    chapter_id: (isJohn ? 43000 : 1000) + chapter,
    verses: [1, 2, 3].map((number) => ({
      id: (isJohn ? 4300000 : 1000000) + chapter * 1000 + number,
      number,
      text: isJohn
        ? ['En el principio era el Verbo.', 'Él estaba con Dios.', 'Todas las cosas por él fueron hechas.'][number - 1]
        : ['En el principio creó Dios.', 'La tierra estaba desordenada.', 'Y dijo Dios: Sea la luz.'][number - 1],
    })),
  }
}

async function fulfill(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
}

interface ApiMockOptions {
  user?: Record<string, unknown>
  resendVerificationStatus?: number
}

export async function installApiMock(
  page: Page,
  onRequest?: (path: string, method: string) => void,
  options: ApiMockOptions = {},
) {
  let currentUser: Record<string, unknown> = { ...(options.user ?? testUser) }
  let notes: Array<Record<string, unknown>> = []
  let nextNoteId = 7001
  let bookmarks: Array<Record<string, unknown>> = []
  let highlights: Array<Record<string, unknown>> = []
  let sessions = [
    { id: 11, name: 'Windows · Apolos', current: true, last_used_at: '2026-08-07T20:00:00Z', created_at: '2026-08-01T10:00:00Z' },
    { id: 12, name: 'Mac · Apolos', current: false, last_used_at: '2026-08-06T20:00:00Z', created_at: '2026-08-01T10:00:00Z' },
  ]
  await page.addInitScript(({ user }) => {
    if (sessionStorage.getItem('apolos_e2e_api_initialized') !== 'true') {
      localStorage.setItem('verbum_token', 'e2e-token')
      sessionStorage.setItem('apolos_e2e_api_initialized', 'true')
    }
    localStorage.setItem('analytics_consent', 'denied')
    localStorage.setItem('verbum_tutorial_completed', 'true')
    localStorage.setItem('lastReading', JSON.stringify({ book: 'juan', chapter: 3, verse: 16 }))
    localStorage.setItem('e2e_user', JSON.stringify(user))
  }, { user: currentUser })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    onRequest?.(path, request.method())

    if (path === '/api/user') {
      if (request.method() === 'GET') return fulfill(route, currentUser)
      const body = request.postDataJSON?.() ?? {}
      if (body._method === 'DELETE') return fulfill(route, { ok: true })
      const { _method: _ignored, ...updates } = body
      currentUser = { ...currentUser, ...updates }
      return fulfill(route, currentUser)
    }
    if (path === '/api/user/settings') return fulfill(route, {})
    if (path === '/api/auth/email/resend-verification') {
      if (options.resendVerificationStatus && options.resendVerificationStatus !== 200) {
        return fulfill(route, { message: 'Too Many Attempts.' }, options.resendVerificationStatus)
      }
      return fulfill(route, { message: 'Verification email sent.', verified: false })
    }
    if (path === '/api/user/notes') return fulfill(route, [{
      id: 7101,
      body: '<!--apolos-rich-note--><p>Esperanza personal</p>',
      created_at: '2026-08-07T20:00:00Z',
      is_public: false,
      note_type: 'insight',
      verse: { id: 4301001, number: 1, text: 'En el principio era el Verbo.', chapter: 1, book: 'Juan', slug: 'juan' },
    }])
    if (path === '/api/user/export') {
      const markdown = url.searchParams.get('format') === 'markdown'
      return route.fulfill({
        status: 200,
        contentType: markdown ? 'text/markdown' : 'application/json',
        body: markdown
          ? '# Apolos export\n\nAna Segura — Juan 1:1\n'
          : JSON.stringify({ user: { id: 7, name: 'Ana Segura' }, notes: [{ verse: 'Juan 1:1', body: 'Mi nota' }] }),
      })
    }
    if (path === '/api/user/sessions' && request.method() === 'GET') return fulfill(route, sessions)
    if (path === '/api/user/sessions/others') {
      sessions = sessions.filter((session) => session.current)
      return fulfill(route, { ok: true })
    }
    const sessionMutation = path.match(/^\/api\/user\/sessions\/(\d+)$/)
    if (sessionMutation && request.method() === 'POST') {
      sessions = sessions.filter((session) => session.id !== Number(sessionMutation[1]) || session.current)
      return fulfill(route, { ok: true })
    }
    if (path === '/api/versions') return fulfill(route, versions)
    if (/^\/api\/versions\/\d+\/books$/.test(path)) return fulfill(route, books)
    if (path.includes('/chapters/')) return fulfill(route, chapterResponse(path))
    if (/^\/api\/versions\/\d+\/search$/.test(path)) {
      if (url.searchParams.get('q')?.includes('inexistente')) return fulfill(route, [])
      return fulfill(route, [{
        id: 43002001,
        book: 'Juan',
        slug: 'juan',
        chapter: 2,
        verse: 1,
        text: 'Al tercer día se hicieron unas bodas en Caná.',
      }])
    }
    if (path === '/api/youversion/versions') return fulfill(route, { data: [] })
    if (path === '/api/user/bookmarks') return fulfill(route, bookmarks)
    if (path === '/api/users/search') return fulfill(route, [{
      id: 21,
      name: 'Lucia Visible',
      email: 'lucia.visible@example.test',
      avatar_url: null,
    }])
    if (path === '/api/friends/21' && request.method() === 'POST') return fulfill(route, {
      id: 501,
      user_id: testUser.id,
      friend_id: 21,
      status: 'pending',
      user: testUser,
      friend: { id: 21, name: 'Lucia Visible', email: 'lucia.visible@example.test', avatar_url: null },
    }, 201)
    if (path === '/api/friends' || path === '/api/conversations') return fulfill(route, [])
    if (path === '/api/highlights/batch') return fulfill(route, highlights)
    const verseNotes = path.match(/^\/api\/verses\/(\d+)\/notes$/)
    if (verseNotes) {
      if (request.method() === 'GET') return fulfill(route, notes)
      const body = request.postDataJSON?.() ?? {}
      const note = {
        id: nextNoteId++,
        verse_id: Number(verseNotes[1]),
        parent_id: body.parent_id ?? null,
        body: body.body ?? '',
        is_public: body.is_public ?? false,
        note_type: body.note_type ?? 'note',
        created_at: '2026-08-07T20:00:00Z',
        user: testUser,
        likes_count: 0,
        is_liked: false,
      }
      notes.push(note)
      return fulfill(route, note, 201)
    }
    const noteMutation = path.match(/^\/api\/notes\/(\d+)$/)
    if (noteMutation) {
      const noteId = Number(noteMutation[1])
      if (request.method() === 'DELETE') {
        const removed = new Set([noteId])
        let changed = true
        while (changed) {
          changed = false
          for (const note of notes) {
            if (removed.has(Number(note.parent_id)) && !removed.has(Number(note.id))) {
              removed.add(Number(note.id))
              changed = true
            }
          }
        }
        notes = notes.filter((note) => !removed.has(Number(note.id)))
        return fulfill(route, { ok: true })
      }
      const body = request.postDataJSON?.() ?? {}
      const current = notes.find((note) => Number(note.id) === noteId)
      if (!current) return fulfill(route, { message: 'Note not found' }, 404)
      Object.assign(current, body)
      return fulfill(route, current)
    }
    const noteLike = path.match(/^\/api\/notes\/(\d+)\/like$/)
    if (noteLike) {
      const current = notes.find((note) => Number(note.id) === Number(noteLike[1]))
      if (!current) return fulfill(route, { message: 'Note not found' }, 404)
      const liked = request.method() !== 'DELETE'
      current.is_liked = liked
      current.likes_count = liked ? 1 : 0
      return fulfill(route, { likes_count: current.likes_count })
    }
    const bookmark = path.match(/^\/api\/verses\/(\d+)\/bookmark$/)
    if (bookmark) {
      const verseId = Number(bookmark[1])
      const deleting = request.postDataJSON?.()?._method === 'DELETE'
      if (deleting) {
        bookmarks = bookmarks.filter((entry) => Number(entry.verse_id) !== verseId)
        return fulfill(route, { ok: true })
      }
      const created = {
        id: 9001,
        verse_id: verseId,
        note: null,
        created_at: '2026-08-07T20:00:00Z',
        verse: { id: verseId, number: 1, text: 'En el principio era el Verbo.', chapter: 1, book: 'Juan', slug: 'juan' },
      }
      bookmarks.push(created)
      return fulfill(route, created)
    }
    const highlight = path.match(/^\/api\/verses\/(\d+)\/highlights$/)
    if (highlight) {
      const verseId = Number(highlight[1])
      if (request.method() === 'GET') {
        return fulfill(route, highlights.filter((entry) => Number(entry.verse_id) === verseId))
      }
      const body = request.postDataJSON?.() ?? {}
      const created = { id: 8001, verse_id: verseId, ...body }
      highlights.push(created)
      return fulfill(route, created)
    }
    const highlightMutation = path.match(/^\/api\/highlights\/(\d+)$/)
    if (highlightMutation) {
      highlights = highlights.filter((entry) => Number(entry.id) !== Number(highlightMutation[1]))
      return fulfill(route, { ok: true })
    }
    if (path === '/api/push/preferences') return fulfill(route, {})
    if (path === '/api/push/subscriptions') return fulfill(route, [])

    return fulfill(route, [])
  })
}

export interface GuestApiRequest {
  path: string
  method: string
  body: unknown
}

interface GuestApiMockOptions {
  loginStatus?: number
  registrationStatus?: number
  resetPasswordStatus?: number
  onRequest?: (request: GuestApiRequest) => void
}

/** Public API fixture for auth journeys that must start without a local token. */
export async function installGuestApiMock(page: Page, options: GuestApiMockOptions = {}) {
  await page.addInitScript(() => {
    localStorage.removeItem('verbum_token')
    localStorage.setItem('analytics_consent', 'denied')
    localStorage.setItem('verbum_tutorial_completed', 'true')
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = request.postDataJSON?.() ?? null
    options.onRequest?.({ path, method: request.method(), body })

    if (path === '/api/auth/login') {
      if (options.loginStatus && options.loginStatus !== 200) {
        return fulfill(route, { message: 'Invalid credentials' }, options.loginStatus)
      }
      return fulfill(route, { token: 'authenticated-e2e-token', user: testUser })
    }
    if (path === '/api/auth/register') {
      if (options.registrationStatus && options.registrationStatus !== 201) {
        return fulfill(route, { message: 'The email has already been taken.' }, options.registrationStatus)
      }
      return fulfill(route, { token: 'registered-e2e-token', user: testUser }, 201)
    }
    if (path === '/api/auth/forgot-password') {
      return fulfill(route, { message: 'Reset link sent' })
    }
    if (path === '/api/auth/reset-password') {
      if (options.resetPasswordStatus && options.resetPasswordStatus !== 200) {
        return fulfill(route, { message: 'Invalid or expired reset token.' }, options.resetPasswordStatus)
      }
      return fulfill(route, { message: 'Password reset successfully.' })
    }
    if (path === '/api/auth/logout') return fulfill(route, { ok: true })
    if (path === '/api/user/settings') return fulfill(route, {})
    if (path === '/api/user') return fulfill(route, testUser)
    if (path === '/api/versions') return fulfill(route, versions)
    if (path === '/api/versions/1/books') return fulfill(route, books)
    if (path.includes('/chapters/')) return fulfill(route, chapterResponse(path))
    if (path === '/api/youversion/versions') return fulfill(route, { data: [] })
    if (path === '/api/user/bookmarks' || path === '/api/friends' || path === '/api/conversations') return fulfill(route, [])

    return fulfill(route, [])
  })
}
