import { describe, expect, it } from 'vitest'
import { selectDefaultAppLocale, selectDocumentLocale } from './defaultAppLocale'

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

describe('selectDocumentLocale', () => {
  it('uses the locale encoded by Bible URLs', () => {
    expect(selectDocumentLocale('/es/bible/genesis/1', 'en', 'en-US')).toBe('es')
    expect(selectDocumentLocale('/bible/genesis/1', 'es', 'es-ES')).toBe('en')
  })

  it('uses the saved locale on locale-neutral application URLs', () => {
    expect(selectDocumentLocale('/inicio', 'es', 'en-US')).toBe('es')
  })

  it('falls back to the browser locale without a saved preference', () => {
    expect(selectDocumentLocale('/inicio', null, 'es-MX')).toBe('es')
  })
})
