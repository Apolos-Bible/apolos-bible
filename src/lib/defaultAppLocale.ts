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

function isAppLocale(locale: string | null): locale is AppLocale {
  return locale === 'en' || locale === 'es'
}
