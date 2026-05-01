import { describe, expect, it } from 'vitest'
import { selectDefaultBibleVersionId } from './defaultBibleVersion'
import type { ApiVersion } from './bibleApi'

const versions: ApiVersion[] = [
  { id: 1, abbreviation: 'KJV', name: 'King James Version', language: 'en' },
  { id: 2, abbreviation: 'RVR09', name: 'Reina-Valera 1909', language: 'es' },
  { id: 3, abbreviation: 'RVR60', name: 'Reina-Valera 1960', language: 'es' },
]

describe('selectDefaultBibleVersionId', () => {
  it('prefers Reina-Valera 1960 for Spanish browsers', () => {
    expect(selectDefaultBibleVersionId(versions, 'es-ES')).toBe(3)
  })

  it('uses an available English version for English browsers', () => {
    expect(selectDefaultBibleVersionId(versions, 'en-US')).toBe(1)
  })

  it('falls back to the first available version for unsupported languages', () => {
    expect(selectDefaultBibleVersionId(versions, 'fr-FR')).toBe(1)
  })
})
