import { paths } from '@/router/paths'

const FALLBACK_SITE_URL = 'https://apolos.bible'

export function normalizeGameCode(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase() ?? ''
  return /^[A-Z0-9]{6}$/.test(code) ? code : null
}

export function gameInvitePath(code: string): string {
  const normalizedCode = normalizeGameCode(code)
  if (!normalizedCode) throw new Error('A valid room code is required.')

  return `${paths.games()}?join=${normalizedCode}`
}

export function gameInviteUrl(code: string, siteUrl = import.meta.env.VITE_SITE_URL || FALLBACK_SITE_URL): string {
  const url = new URL(gameInvitePath(code), siteUrl)
  return url.toString()
}
