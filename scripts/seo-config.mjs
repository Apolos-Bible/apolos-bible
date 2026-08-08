export const SITE_LOCALES = ['en', 'es']

export const LOCALE_CONFIG = {
  en: {
    preferredVersionIds: [3, 1],
    htmlLang: 'en',
    ogLocale: 'en_US',
    chapter: 'Chapter',
    chapters: 'chapters',
    oldTestament: 'Old Testament',
    newTestament: 'New Testament',
    read: 'Read',
  },
  es: {
    preferredVersionIds: [38, 10],
    htmlLang: 'es',
    ogLocale: 'es_ES',
    chapter: 'Capítulo',
    chapters: 'capítulos',
    oldTestament: 'Antiguo Testamento',
    newTestament: 'Nuevo Testamento',
    read: 'Lee',
  },
}

export function pickSeoVersion(versions, lang) {
  const candidates = versions.filter((version) => version.language === lang)
  for (const id of LOCALE_CONFIG[lang].preferredVersionIds) {
    const preferred = candidates.find((version) => version.id === id)
    if (preferred) return preferred
  }
  return candidates[0] ?? null
}

export function localizedBiblePath(lang, slug, chapter) {
  const prefix = lang === 'en' ? '' : `/${lang}`
  const base = `${prefix}/bible/${slug}`
  return chapter == null ? base : `${base}/${chapter}`
}
