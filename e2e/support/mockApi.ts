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
}]

const books = [{ id: 43, number: 43, name: 'Juan', slug: 'juan', chapters_count: 21 }]

async function fulfill(route: Route, json: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
}

export async function installApiMock(page: Page, onRequest?: (path: string, method: string) => void) {
  await page.addInitScript(({ user }) => {
    localStorage.setItem('verbum_token', 'e2e-token')
    localStorage.setItem('analytics_consent', 'denied')
    localStorage.setItem('verbum_tutorial_completed', 'true')
    localStorage.setItem('lastReading', JSON.stringify({ book: 'juan', chapter: 3, verse: 16 }))
    localStorage.setItem('e2e_user', JSON.stringify(user))
  }, { user: testUser })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    onRequest?.(path, request.method())

    if (path === '/api/user') return fulfill(route, testUser)
    if (path === '/api/user/settings') return fulfill(route, {})
    if (path === '/api/user/sessions') return fulfill(route, [
      { id: 11, name: 'Windows · Apolos', current: true, last_used_at: '2026-08-07T20:00:00Z', created_at: '2026-08-01T10:00:00Z' },
      { id: 12, name: 'Mac · Apolos', current: false, last_used_at: '2026-08-06T20:00:00Z', created_at: '2026-08-01T10:00:00Z' },
    ])
    if (path === '/api/versions') return fulfill(route, versions)
    if (path === '/api/versions/1/books') return fulfill(route, books)
    if (path.includes('/chapters/')) return fulfill(route, {
      book: { number: 43, name: 'Juan', slug: 'juan' },
      chapter: 3,
      chapter_id: 43003,
      verses: [{ id: 4300316, number: 16, text: 'Porque de tal manera amó Dios al mundo…' }],
    })
    if (path === '/api/youversion/versions') return fulfill(route, { data: [] })
    if (path === '/api/user/bookmarks' || path === '/api/friends' || path === '/api/conversations') return fulfill(route, [])
    if (path.startsWith('/api/user/sessions/') && request.method() === 'POST') return fulfill(route, { ok: true })
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
      return fulfill(route, { token: 'registered-e2e-token', user: testUser }, 201)
    }
    if (path === '/api/auth/forgot-password') {
      return fulfill(route, { message: 'Reset link sent' })
    }
    if (path === '/api/auth/logout') return fulfill(route, { ok: true })
    if (path === '/api/user/settings') return fulfill(route, {})
    if (path === '/api/user') return fulfill(route, testUser)
    if (path === '/api/versions') return fulfill(route, versions)
    if (path === '/api/versions/1/books') return fulfill(route, books)
    if (path === '/api/youversion/versions') return fulfill(route, { data: [] })
    if (path === '/api/user/bookmarks' || path === '/api/friends' || path === '/api/conversations') return fulfill(route, [])

    return fulfill(route, [])
  })
}
