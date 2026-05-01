import type { ApiVersion } from '@/lib/bibleApi'

export const BIBLE_VERSION_STORAGE_KEY = 'tulia_version_id'

export function getStoredBibleVersionId(): number | null {
  const raw = localStorage.getItem(BIBLE_VERSION_STORAGE_KEY)
  const id = Number(raw)

  return Number.isInteger(id) && id > 0 ? id : null
}

export function getBrowserLanguage(): string {
  return navigator.languages?.[0] ?? navigator.language ?? ''
}

export function selectDefaultBibleVersionId(
  versions: ApiVersion[],
  browserLanguage: string,
  fallbackVersionId = 1,
): number {
  if (versions.length === 0) return fallbackVersionId

  const language = browserLanguage.toLowerCase()
  const languageCode = language.split('-')[0]
  const byLanguage = versions.filter(versionMatchesLanguage(languageCode))

  if (languageCode === 'es') {
    return byLanguage.find(isReinaValera1960)?.id ?? byLanguage[0]?.id ?? versions[0].id
  }

  if (languageCode === 'en') {
    return byLanguage[0]?.id ?? versions[0].id
  }

  return byLanguage[0]?.id ?? versions[0].id
}

function versionMatchesLanguage(languageCode: string) {
  return (version: ApiVersion) => version.language.toLowerCase().split('-')[0] === languageCode
}

function isReinaValera1960(version: ApiVersion): boolean {
  const value = `${version.abbreviation} ${version.name}`.toLowerCase()

  return (
    value.includes('1960') &&
    (value.includes('reina') || value.includes('valera') || value.includes('rvr') || value.includes('rv60'))
  )
}
