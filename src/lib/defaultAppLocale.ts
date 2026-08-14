export type AppLocale = 'en' | 'es'

export const APP_LOCALE_STORAGE_KEY = 'locale'

export function getStoredAppLocale(): AppLocale | null {
  const locale = localStorage.getItem(APP_LOCALE_STORAGE_KEY)

  return isAppLocale(locale) ? locale : null
}

export function getBrowserLocale(): string {
  return navigator.languages?.[0] ?? navigator.language ?? ''
}

export function selectDefaultAppLocale(browserLocale: string): AppLocale {
  return browserLocale.toLowerCase().startsWith('es') ? 'es' : 'en'
}

/** Resolve the document language before/while routing. Bible URLs own their
 * locale; locale-neutral application URLs follow the person's app setting. */
export function selectDocumentLocale(
  pathname: string,
  storedLocale: string | null,
  browserLocale: string,
): AppLocale {
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  if (firstSegment === 'es') return 'es'
  if (firstSegment === 'bible') return 'en'
  return isAppLocale(storedLocale) ? storedLocale : selectDefaultAppLocale(browserLocale)
}

/** The locale currently used by the frontend, including its persisted setting. */
export function getFrontendLocale(): AppLocale {
  return getStoredAppLocale() ?? selectDefaultAppLocale(getBrowserLocale())
}

function isAppLocale(locale: string | null): locale is AppLocale {
  return locale === 'en' || locale === 'es'
}
