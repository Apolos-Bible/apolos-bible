import { afterEach, expect, it, vi } from 'vitest'
import { askAppHelp, helpScreen, type HelpTurn } from './appHelp'

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear() })

it('[AI-HELP-01] identifies screens without exposing share tokens or user IDs', () => {
  expect(helpScreen('/study/private-id/secret-token')).toBe('study')
  expect(helpScreen('/es/bible/juan/3/16')).toBe('bible')
  expect(helpScreen('/mis-rutas/private-title/step')).toBe('paths')
  expect(helpScreen('/u/123')).toBe('profile')
  expect(helpScreen('/unknown')).toBe('other')
})

it('[AI-HELP-01] bounds history, authenticates and filters untrusted links', async () => {
  localStorage.setItem('verbum_token', 'test-token')
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    answer: 'Open settings', links: [null, { href: 'https://evil.test', label: 'bad' }, { href: '/ajustes', label: 'Settings' }, { href: '//evil.test', label: 'bad' }],
  })))
  vi.stubGlobal('fetch', fetcher)
  const history: HelpTurn[] = Array.from({ length: 14 }, () => ({ role: 'user', content: 'hello', links: [{ href: '/ayuda', label: 'Help' }] }))
  const reply = await askAppHelp('question', history, 'home', 'en', new AbortController().signal)
  expect(reply.links).toEqual([{ href: '/ajustes', label: 'Settings' }])
  const init = fetcher.mock.calls[0][1]
  expect(init.headers.Authorization).toBe('Bearer test-token')
  expect(JSON.parse(init.body).history).toHaveLength(12)
  expect(JSON.parse(init.body).history[0]).toEqual({ role: 'user', content: 'hello' })
})

it('[AI-HELP-03] propagates quota failures for actionable feedback', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))
  await expect(askAppHelp('question', [], 'home', 'es', new AbortController().signal)).rejects.toMatchObject({ status: 429 })
})

it('[AI-HELP-03] rejects a malformed answer', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"answer":null,"links":[]}')))
  await expect(askAppHelp('question', [], 'home', 'es', new AbortController().signal)).rejects.toThrow('Invalid assistant response')
})
