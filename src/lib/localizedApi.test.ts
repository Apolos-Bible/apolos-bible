import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { APP_LOCALE_STORAGE_KEY } from './defaultAppLocale'
import { withFrontendLocale } from './localizedApi'

describe('withFrontendLocale', () => {
  const browserLanguage = navigator.language

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'language', { value: browserLanguage, configurable: true })
  })

  it('uses the persisted frontend locale', () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'es')

    expect(withFrontendLocale('/api/guided-plans')).toBe('/api/guided-plans?locale=es')
  })

  it('defaults unsupported browser locales to English', () => {
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true })

    expect(withFrontendLocale('/api/guided-plans?cursor=next')).toBe(
      '/api/guided-plans?cursor=next&locale=en',
    )
  })
})
