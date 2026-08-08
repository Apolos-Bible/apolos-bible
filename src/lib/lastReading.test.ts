import { beforeEach, describe, expect, it } from 'vitest'
import {
  LAST_READING_KEY,
  LEGACY_LAST_READING_KEY,
  readLastReading,
} from './lastReading'

describe('readLastReading', () => {
  beforeEach(() => localStorage.clear())

  it('[BIBLE-READER-01] prefers the reading location written by the current reader', () => {
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: 'genesis', chapter: 2 }))
    localStorage.setItem(LEGACY_LAST_READING_KEY, JSON.stringify({ book: 'juan', chapter: 3, verse: 16 }))

    expect(readLastReading()).toEqual({ book: 'genesis', chapter: 2 })
  })

  it('migrates a valid legacy reading location exactly once', () => {
    localStorage.setItem(LEGACY_LAST_READING_KEY, JSON.stringify({ book: 'juan', chapter: 3, verse: 16 }))

    expect(readLastReading()).toEqual({ book: 'juan', chapter: 3, verse: 16 })
    expect(localStorage.getItem(LAST_READING_KEY)).toBe(JSON.stringify({ book: 'juan', chapter: 3, verse: 16 }))
    expect(localStorage.getItem(LEGACY_LAST_READING_KEY)).toBeNull()
  })

  it('rejects malformed and impossible client state', () => {
    localStorage.setItem(LAST_READING_KEY, JSON.stringify({ book: '', chapter: 0 }))
    localStorage.setItem(LEGACY_LAST_READING_KEY, '{not-json')
    expect(readLastReading()).toBeNull()
  })
})
