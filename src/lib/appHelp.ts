import { paths } from '@/router/paths'

export type HelpTurn = { role: 'user' | 'assistant'; content: string; links?: { href: string; label: string }[] }

const destinations: Record<string, string> = {
  '/inicio': 'home', '/ajustes': 'settings', '/perfil': 'profile',
  '/marketplace': 'marketplace', '/mis-rutas': 'paths', '/circulo': 'feed',
  '/juegos': 'games', '/ayuda': 'help', '/study': 'study', '/chat': 'chat', '/u': 'profile',
}
const allowedLinks = new Set([
  paths.bible({ lang: 'es', book: 'genesis', chapter: 1 }),
  paths.bible({ lang: 'en', book: 'genesis', chapter: 1 }),
  paths.home(), paths.settings(), paths.profile(), paths.marketplace(),
  paths.myPaths(), paths.feed(), paths.games(), paths.help(),
])

/** Deliberately excludes query strings, share tokens, user IDs and private content. */
export function helpScreen(pathname: string): string {
  if (pathname === '/' || /^\/(?:es\/|en\/)?bible(?:\/|$)/.test(pathname)) return 'bible'
  return destinations['/' + pathname.split('/')[1]] ?? 'other'
}

export async function askAppHelp(question: string, history: HelpTurn[], screen: string, locale: string, signal: AbortSignal) {
  const token = localStorage.getItem('verbum_token')
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'https://apolos.test'}/api/ai/app-help`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ question, history: history.slice(-12).map(({ role, content }) => ({ role, content })), screen, locale }),
  })
  if (!response.ok) throw Object.assign(new Error('Assistant request failed'), { status: response.status })
  const data = await response.json()
  if (typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 6000 || !Array.isArray(data.links)) throw new Error('Invalid assistant response')
  return {
    role: 'assistant', content: data.answer,
    links: data.links.filter((link: { href?: unknown; label?: unknown } | null) =>
      link && typeof link.href === 'string' && allowedLinks.has(link.href) && typeof link.label === 'string',
    ).slice(0, 3),
  } as HelpTurn
}
