import type { ApiVersion } from '@/lib/bibleApi'

function normalizeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase().split(/[-_]/)[0]

  return {
    english: 'en',
    inglés: 'en',
    ingles: 'en',
    spanish: 'es',
    español: 'es',
    espanol: 'es',
  }[normalized] ?? normalized
}

export function bibleVersionsInSameLanguage(
  versions: ApiVersion[],
  referenceVersionId: number,
): ApiVersion[] {
  const reference = versions.find((version) => version.id === referenceVersionId)
  if (!reference) return []

  const language = normalizeLanguage(reference.language)
  return versions.filter((version) => normalizeLanguage(version.language) === language)
}

export function comparableBibleVersions(
  versions: ApiVersion[],
  currentVersionId: number,
): ApiVersion[] {
  return bibleVersionsInSameLanguage(versions, currentVersionId)
    .filter((version) => version.id !== currentVersionId)
}

export function preferredComparisonVersion(options: ApiVersion[]): ApiVersion | undefined {
  const preferredId = Number(localStorage.getItem('preferredCompareVersionId'))
  return options.find((version) => version.id === preferredId) ?? options[0]
}
