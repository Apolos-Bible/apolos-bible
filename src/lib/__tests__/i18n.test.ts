import { describe, it, expect, beforeEach, vi } from 'vitest'

// i18n.ts reads localStorage and navigator.language at module load time,
// so we reset modules between tests to get a fresh init each time.
describe('i18n initialization', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults to en when navigator.language is en-US', async () => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    const { default: i18n } = await import('../i18n')
    expect(i18n.language).toBe('en')
  })

  it('loads the correct English translation for a known key', async () => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    const { default: i18n } = await import('../i18n')
    expect(i18n.t('settings.title')).toBe('Settings')
  })

  it('loads the correct Spanish translation for a known key', async () => {
    Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true })
    const { default: i18n } = await import('../i18n')
    await i18n.changeLanguage('es')
    expect(i18n.t('settings.title')).toBe('Configuración')
  })
})
