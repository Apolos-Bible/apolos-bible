import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/userSettingsApi', () => ({
  saveUserSettingsSilently: vi.fn(),
}))

vi.mock('@/lib/defaultAppLocale', async () => {
  const actual = await vi.importActual<typeof import('@/lib/defaultAppLocale')>('@/lib/defaultAppLocale')
  const actual_getBrowserLocale = actual.getBrowserLocale
  const actual_getStoredAppLocale = actual.getStoredAppLocale
  return {
    ...actual,
    getBrowserLocale: vi.fn(() => 'en-US'),
    getStoredAppLocale: vi.fn(() => null),
    APP_LOCALE_STORAGE_KEY: 'appLocale',
  }
})

vi.mock('@/lib/i18n', () => ({
  default: {
    changeLanguage: vi.fn(() => Promise.resolve()),
    t: vi.fn((k: string) => k),
    language: 'en',
  },
}))

import { useUIStore } from '../useUIStore'

beforeEach(() => {
  localStorage.clear()
  useUIStore.setState({
    commandPaletteOpen: false,
    shortcutsPanelOpen: false,
    settingsOpen: false,
    authModalOpen: false,
    authModalMode: 'login',
    authModalKey: 0,
    studyMode: false,
    commentaryOpen: false,
    mobileSidebarOpen: false,
    showOthersNotes: false,
    toasts: [],
    activePanel: null,
    fontSize: 'base',
    theme: 'light',
    locale: 'en',
    readingMode: 'verse',
  })
  document.documentElement.setAttribute('data-theme', 'light')
})

describe('useUIStore — modals & panels', () => {
  it('toggles command palette', () => {
    const store = useUIStore.getState()
    expect(store.commandPaletteOpen).toBe(false)
    store.openCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(true)
    store.closeCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
  })

  it('toggles shortcuts panel', () => {
    const store = useUIStore.getState()
    store.toggleShortcutsPanel()
    expect(useUIStore.getState().shortcutsPanelOpen).toBe(true)
    store.toggleShortcutsPanel()
    expect(useUIStore.getState().shortcutsPanelOpen).toBe(false)
  })

  it('toggles settings modal', () => {
    const store = useUIStore.getState()
    store.openSettings()
    expect(useUIStore.getState().settingsOpen).toBe(true)
    store.closeSettings()
    expect(useUIStore.getState().settingsOpen).toBe(false)
  })

  it('opens auth modal with default mode (login)', () => {
    const store = useUIStore.getState()
    store.openAuthModal()
    expect(useUIStore.getState().authModalOpen).toBe(true)
    expect(useUIStore.getState().authModalMode).toBe('login')
  })

  it('opens auth modal with specified mode', () => {
    useUIStore.getState().openAuthModal('register')
    expect(useUIStore.getState().authModalMode).toBe('register')
  })

  it('ignores invalid auth modal mode and falls back to login', () => {
    useUIStore.getState().openAuthModal('invalid' as 'login')
    expect(useUIStore.getState().authModalMode).toBe('login')
  })

  it('increments authModalKey each time modal opens', () => {
    const k1 = useUIStore.getState().authModalKey
    useUIStore.getState().openAuthModal()
    const k2 = useUIStore.getState().authModalKey
    expect(k2).toBe(k1 + 1)
  })

  it('closes auth modal and resets mode to login', () => {
    const store = useUIStore.getState()
    store.openAuthModal('register')
    store.closeAuthModal()
    expect(useUIStore.getState().authModalOpen).toBe(false)
    expect(useUIStore.getState().authModalMode).toBe('login')
  })

  it('mobile sidebar toggle', () => {
    const store = useUIStore.getState()
    store.openMobileSidebar()
    expect(useUIStore.getState().mobileSidebarOpen).toBe(true)
    store.closeMobileSidebar()
    expect(useUIStore.getState().mobileSidebarOpen).toBe(false)
    store.toggleMobileSidebar()
    expect(useUIStore.getState().mobileSidebarOpen).toBe(true)
  })

  it('study mode toggles', () => {
    useUIStore.getState().enterStudyMode()
    expect(useUIStore.getState().studyMode).toBe(true)
    useUIStore.getState().exitStudyMode()
    expect(useUIStore.getState().studyMode).toBe(false)
  })

  it('commentary toggle', () => {
    useUIStore.getState().toggleCommentary()
    expect(useUIStore.getState().commentaryOpen).toBe(true)
    useUIStore.getState().toggleCommentary()
    expect(useUIStore.getState().commentaryOpen).toBe(false)
  })

  it('showOthersNotes toggle persists to localStorage', () => {
    const store = useUIStore.getState()
    expect(store.showOthersNotes).toBe(false)
    store.toggleShowOthersNotes()
    expect(useUIStore.getState().showOthersNotes).toBe(true)
    expect(localStorage.getItem('showOthersNotes')).toBe('true')
  })
})

describe('useUIStore — toasts', () => {
  it('addToast creates a toast and returns id', () => {
    const id = useUIStore.getState().addToast('Hello')
    expect(typeof id).toBe('string')
    expect(useUIStore.getState().toasts).toHaveLength(1)
    expect(useUIStore.getState().toasts[0].message).toBe('Hello')
    expect(useUIStore.getState().toasts[0].type).toBe('info')
  })

  it('addToast respects type parameter', () => {
    useUIStore.getState().addToast('Error!', 'error')
    expect(useUIStore.getState().toasts[0].type).toBe('error')
  })

  it('removeToast removes a specific toast', () => {
    const id = useUIStore.getState().addToast('Keep')
    useUIStore.getState().addToast('Remove')
    useUIStore.getState().removeToast(id)
    expect(useUIStore.getState().toasts).toHaveLength(1)
  })

  it('toast auto-removes after default duration', () => {
    vi.useFakeTimers()
    useUIStore.setState({ toasts: [] })
    useUIStore.getState().addToast('Auto-remove')
    expect(useUIStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(3001)
    expect(useUIStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })

  it('toast respects custom duration', () => {
    vi.useFakeTimers()
    useUIStore.setState({ toasts: [] })
    useUIStore.getState().addToast('Short', 'info', { duration: 1000 })
    expect(useUIStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(1001)
    expect(useUIStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})

describe('useUIStore — panels', () => {
  it('openPanel sets active panel', () => {
    useUIStore.getState().openPanel('favorites')
    expect(useUIStore.getState().activePanel).toBe('favorites')
  })

  it('togglePanel opens if closed, closes if same panel', () => {
    const store = useUIStore.getState()
    store.togglePanel('chat')
    expect(useUIStore.getState().activePanel).toBe('chat')
    store.togglePanel('chat')
    expect(useUIStore.getState().activePanel).toBeNull()
  })

  it('togglePanel switches to a new panel', () => {
    const store = useUIStore.getState()
    store.togglePanel('chat')
    store.togglePanel('friends')
    expect(useUIStore.getState().activePanel).toBe('friends')
  })

  it('closePanel sets activePanel to null', () => {
    useUIStore.getState().openPanel('my-notes')
    useUIStore.getState().closePanel()
    expect(useUIStore.getState().activePanel).toBeNull()
  })
})

describe('useUIStore — theme, locale, font, reading mode', () => {
  it('setFontSize persists to localStorage and updates state', () => {
    useUIStore.getState().setFontSize('lg')
    expect(useUIStore.getState().fontSize).toBe('lg')
    expect(localStorage.getItem('fontSize')).toBe('lg')
  })

  it('setTheme applies data-theme attribute on document element', () => {
    useUIStore.getState().setTheme('dark')
    expect(useUIStore.getState().theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('setLocale persists to localStorage', () => {
    useUIStore.getState().setLocale('es')
    expect(useUIStore.getState().locale).toBe('es')
    expect(localStorage.getItem('appLocale')).toBe('es')
  })

  it('setReadingMode persists to localStorage', () => {
    useUIStore.getState().setReadingMode('flow')
    expect(useUIStore.getState().readingMode).toBe('flow')
    expect(localStorage.getItem('readingMode')).toBe('flow')
  })
})
