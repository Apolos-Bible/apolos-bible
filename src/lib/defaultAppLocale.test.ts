import { describe, expect, it } from 'vitest'
import { selectDefaultAppLocale } from './defaultAppLocale'

describe('selectDefaultAppLocale', () => {
  it('uses Spanish for Spanish browser locales', () => {
    expect(selectDefaultAppLocale('es-ES')).toBe('es')
  })

  it('uses English for English browser locales', () => {
    expect(selectDefaultAppLocale('en-US')).toBe('en')
  })

  it('falls back to English for unsupported browser locales', () => {
    expect(selectDefaultAppLocale('fr-FR')).toBe('en')
  })
})
