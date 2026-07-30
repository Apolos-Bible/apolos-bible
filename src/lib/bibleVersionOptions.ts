import type { ApiVersion } from '@/lib/bibleApi'

function normalizeLanguage(language: string): string {
  return language.trim().toLowerCase().split(/[-_]/)[0]
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
