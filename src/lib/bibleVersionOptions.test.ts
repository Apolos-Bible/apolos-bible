import { describe, expect, it } from 'vitest'
import {
  bibleVersionsInSameLanguage,
  comparableBibleVersions,
} from './bibleVersionOptions'
import type { ApiVersion } from './bibleApi'

const versions: ApiVersion[] = [
  { id: 1, abbreviation: 'KJV', name: 'King James Version', language: 'en' },
  { id: 2, abbreviation: 'ASV', name: 'American Standard Version', language: 'en-US' },
  { id: 3, abbreviation: 'RVR60', name: 'Reina-Valera 1960', language: 'es' },
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

  it('does not expose mixed-language fallbacks for an unknown reference', () => {
    expect(bibleVersionsInSameLanguage(versions, 99)).toEqual([])
  })
})
