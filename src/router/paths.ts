import type { AppLocale } from '@/lib/defaultAppLocale'

export const APP_LOCALES = ['en', 'es'] as const

const APP_LOCALE_SET = new Set<string>(APP_LOCALES)

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && APP_LOCALE_SET.has(value)
}

export type BibleParams = {
  lang: AppLocale
  book: string
  chapter: number
  verse?: number | null
}

export const paths = {
  root: () => '/',

  bible({ lang, book, chapter, verse }: BibleParams): string {
    const langPrefix = lang === 'en' ? '' : `/${lang}`
    const base = `${langPrefix}/bible/${book}/${chapter}`
    return verse ? `${base}/${verse}` : base
  },

  study({ sessionId, shareToken }: { sessionId: string; shareToken?: string | null }): string {
    return shareToken ? `/study/${sessionId}/${shareToken}` : `/study/${sessionId}`
  },

  resetPassword(): string {
    return '/auth/reset-password'
  },

  profile(): string {
    return '/perfil'
  },

  userProfile(userId: number | string): string {
    return `/u/${userId}`
  },

  conversation(conversationId: number | string): string {
    return `/chat/${conversationId}`
  },

  settings(): string {
    return '/ajustes'
  },

  marketplace(): string {
    return '/marketplace'
  },

  marketplacePath(slug: string): string {
    return `/marketplace/${slug}`
  },

  /** The paths this person wrote. */
  myPaths(): string {
    return '/mis-rutas'
  },

  /** The full-width editor; with a study slug it opens straight on its steps. */
  pathEditor(slug: string, studySlug?: string | null): string {
    return studySlug ? `/mis-rutas/${slug}/${studySlug}` : `/mis-rutas/${slug}`
  },
}

/** True for routes that are full "pages" (profile/settings) rather than the reader. */
export function isPageRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/ajustes') ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/mis-rutas') ||
    pathname.startsWith('/u/')
    || pathname.startsWith('/chat/')
  )
}

export function verseIdToNumber(verseId: string | null | undefined): number | undefined {
  if (!verseId) return undefined
  const parts = verseId.split('-')
  if (parts.length < 3) return undefined
  const n = parseInt(parts[parts.length - 1], 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function parseChapter(value: string | undefined): number | null {
  if (!value) return null
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseVerse(value: string | undefined): number | null {
  if (!value) return null
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}
