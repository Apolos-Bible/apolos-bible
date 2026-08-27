import { describe, expect, it } from 'vitest'
import {
  bibleVersionsInSameLanguage,
  bibleTextSearchVersionId,
  comparableBibleVersions,
  preferredComparisonVersion,
} from './bibleVersionOptions'
import type { ApiVersion } from './bibleApi'

const versions: ApiVersion[] = [
  { id: 1, abbreviation: 'KJV', name: 'King James Version', language: 'en' },
  { id: 2, abbreviation: 'ASV', name: 'American Standard Version', language: 'en-US' },
  { id: 3, abbreviation: 'RVR60', name: 'Reina-Valera 1960', language: 'es' },
  { id: 4, abbreviation: 'RVES', name: 'Reina-Valera Antigua', language: 'Spanish' },
]

describe('Bible version selector options', () => {
  it('keeps only versions in the reference version language', () => {
    expect(bibleVersionsInSameLanguage(versions, 1).map((version) => version.id))
      .toEqual([1, 2])
  })

  it('excludes the reader version from comparison options', () => {
    expect(comparableBibleVersions(versions, 1).map((version) => version.id))
      .toEqual([2])
  })

  it('uses the saved comparison version when it remains available', () => {
    localStorage.setItem('preferredCompareVersionId', '2')
    expect(preferredComparisonVersion(versions)?.id).toBe(2)
    localStorage.removeItem('preferredCompareVersionId')
  })

  it('matches API language names with locale codes', () => {
    expect(bibleVersionsInSameLanguage(versions, 3).map((version) => version.id))
      .toEqual([3, 4])
  })

  it('does not expose mixed-language fallbacks for an unknown reference', () => {
    expect(bibleVersionsInSameLanguage(versions, 99)).toEqual([])
  })

  it('uses a local same-language Bible to search text while YouVersion is active', () => {
    const remote: ApiVersion = {
      id: 1_000_128,
      abbreviation: 'NVI-YV',
      name: 'NVI YouVersion',
      language: 'es-ES',
      provider: 'youversion',
    }
    expect(bibleTextSearchVersionId([...versions, remote], remote.id)).toBe(3)
    expect(bibleTextSearchVersionId(versions, 1)).toBe(1)
  })
})
