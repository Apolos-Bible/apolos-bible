import { describe, expect, it } from 'vitest'
import { SITE_LOCALES, localizedBiblePath, pickSeoVersion } from './seo-config.mjs'

describe('SEO route configuration', () => {
  it('keeps localized URLs aligned with the application router', () => {
    expect(localizedBiblePath('en', 'john', 3)).toBe('/bible/john/3')
    expect(localizedBiblePath('es', 'juan', 3)).toBe('/es/bible/juan/3')
  })

  it('only publishes locales supported by the application', () => {
    expect(SITE_LOCALES).toEqual(['en', 'es'])
  })

  it('uses the preferred published version for each locale', () => {
    const versions = [
      { id: 99, language: 'es' },
      { id: 38, language: 'es' },
      { id: 3, language: 'en' },
    ]
    expect(pickSeoVersion(versions, 'es')?.id).toBe(38)
    expect(pickSeoVersion(versions, 'en')?.id).toBe(3)
  })
})
