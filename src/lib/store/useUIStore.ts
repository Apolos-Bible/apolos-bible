import { create } from 'zustand'
import i18n from '@/lib/i18n'
import {
  APP_LOCALE_STORAGE_KEY,
  getBrowserLocale,
  getStoredAppLocale,
  selectDefaultAppLocale,
  type AppLocale,
} from '@/lib/defaultAppLocale'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'

type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
}

export type FontSize    = 'sm' | 'base' | 'lg'
export type Theme       = 'dark' | 'light' | 'system'
export type Locale      = AppLocale
export type Panel       = 'favorites' | 'my-notes' | 'friends' | 'chat' | 'my-studies' | 'notifications'
export type MobileHub   = 'explore' | 'you'
export type ReadingMode = 'flow' | 'verse'
export type ReaderFont  = 'reading' | 'sans' | 'serif'
export type LineHeight  = 'compact' | 'comfortable' | 'relaxed'

function applyTheme(t: Theme) {
  const resolved = t === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : t
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.setAttribute('data-theme-preference', t)
}

export const DEFAULT_ACCENT_COLOR = '#4f5dcc'

function applyAccentColor(color: string) {
  document.documentElement.style.setProperty('--accent', color)
}

type UIStore = {
  commandPaletteOpen: boolean
  shortcutsPanelOpen: boolean
  settingsOpen: boolean
  authModalOpen: boolean
  authModalMode: 'login' | 'register' | 'forgot-password' | 'reset-password'
  authModalKey: number
  studyMode: boolean
  commentaryOpen: boolean
  mobileSidebarOpen: boolean
  mobileBookPickerOpen: boolean
  mobileSearchOpen: boolean
  mobileHub: MobileHub | null
  mobileChromeCollapsed: boolean
  desktopSidebarCollapsed: boolean
  setMobileChromeCollapsed: (v: boolean) => void
  toggleDesktopSidebar: () => void
  showOthersNotes: boolean
  toggleCommentary: () => void
  toggleShowOthersNotes: () => void
  toasts: Toast[]
  activePanel: Panel | null
  fontSize: FontSize
  theme: Theme
  accentColor: string
  locale: Locale
  readingMode: ReadingMode
  readerFont: ReaderFont
  lineHeight: LineHeight
  showVerseNumbers: boolean
  reduceMotion: boolean
  highContrast: boolean
  keepScreenAwake: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleShortcutsPanel: () => void
  openSettings: () => void
  closeSettings: () => void
  openAuthModal: (mode?: 'login' | 'register' | 'forgot-password' | 'reset-password') => void
  closeAuthModal: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleMobileSidebar: () => void
  openMobileBookPicker: () => void
  closeMobileBookPicker: () => void
  openMobileSearch: () => void
  closeMobileSearch: () => void
  openMobileHub: (hub: MobileHub) => void
  closeMobileHub: () => void
  addToast: (message: string, type?: Toast['type'], options?: { action?: Toast['action']; duration?: number }) => string
  removeToast: (id: string) => void
  openPanel: (panel: Panel) => void
  togglePanel: (panel: Panel) => void
  closePanel: () => void
  setFontSize: (size: FontSize) => void
  setTheme: (t: Theme, sync?: boolean) => void
  setAccentColor: (color: string, sync?: boolean) => void
  setLocale: (l: Locale) => void
  setReadingMode: (mode: ReadingMode) => void
  setReaderFont: (font: ReaderFont, sync?: boolean) => void
  setLineHeight: (height: LineHeight, sync?: boolean) => void
  setShowVerseNumbers: (show: boolean, sync?: boolean) => void
  setReduceMotion: (reduce: boolean, sync?: boolean) => void
  setHighContrast: (high: boolean, sync?: boolean) => void
  setKeepScreenAwake: (keep: boolean) => void
  enterStudyMode: () => void
  exitStudyMode: () => void
}

const savedFontSize    = (localStorage.getItem('fontSize')    as FontSize)    ?? 'base'
const savedTheme       = (localStorage.getItem('theme')       as Theme)       ?? 'light'
const savedAccentColor = localStorage.getItem('accentColor') ?? DEFAULT_ACCENT_COLOR
const savedReadingMode = (localStorage.getItem('readingMode') as ReadingMode) ?? 'verse'
const savedReaderFont = (localStorage.getItem('readerFont') as ReaderFont) ?? 'reading'
const savedLineHeight = (localStorage.getItem('lineHeight') as LineHeight) ?? 'comfortable'
const savedShowVerseNumbers = localStorage.getItem('showVerseNumbers') !== 'false'
const savedReduceMotion = localStorage.getItem('reduceMotion') === 'true'
const savedHighContrast = localStorage.getItem('highContrast') === 'true'
const savedKeepScreenAwake = localStorage.getItem('keepScreenAwake') === 'true'
const savedLocale      = getStoredAppLocale()
const savedShowOthers  = localStorage.getItem('showOthersNotes') === 'true'
const savedDesktopSidebarCollapsed = localStorage.getItem('desktopSidebarCollapsed') === 'true'
applyTheme(savedTheme)
applyAccentColor(savedAccentColor)
document.documentElement.dataset.readerFont = savedReaderFont
document.documentElement.dataset.lineHeight = savedLineHeight
document.documentElement.dataset.reduceMotion = String(savedReduceMotion)
document.documentElement.dataset.highContrast = String(savedHighContrast)

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem('theme') === 'system') applyTheme('system')
})

let _toastSeq = 0

export const useUIStore = create<UIStore>((set) => ({
  commandPaletteOpen: false,
  shortcutsPanelOpen: false,
  settingsOpen: false,
  authModalOpen: false,
  authModalMode: 'login',
  authModalKey: 0,
  studyMode: false,
  commentaryOpen: false,
  mobileSidebarOpen: false,
  mobileBookPickerOpen: false,
  mobileSearchOpen: false,
  mobileHub: null,
  mobileChromeCollapsed: false,
  desktopSidebarCollapsed: savedDesktopSidebarCollapsed,
  setMobileChromeCollapsed: (v) => set({ mobileChromeCollapsed: v }),
  toggleDesktopSidebar: () => set((state) => {
    const collapsed = !state.desktopSidebarCollapsed
    localStorage.setItem('desktopSidebarCollapsed', String(collapsed))
    return { desktopSidebarCollapsed: collapsed }
  }),
  showOthersNotes: savedShowOthers,
  toggleCommentary: () => set((s) => ({ commentaryOpen: !s.commentaryOpen })),
  toggleShowOthersNotes: () =>
    set((s) => {
      const next = !s.showOthersNotes
      localStorage.setItem('showOthersNotes', String(next))
      return { showOthersNotes: next }
    }),
  toasts: [],
  activePanel: null,
  fontSize: savedFontSize,
  theme: savedTheme,
  accentColor: savedAccentColor,
  locale: savedLocale ?? selectDefaultAppLocale(getBrowserLocale()),
  readingMode: savedReadingMode,
  readerFont: savedReaderFont,
  lineHeight: savedLineHeight,
  showVerseNumbers: savedShowVerseNumbers,
  reduceMotion: savedReduceMotion,
  highContrast: savedHighContrast,
  keepScreenAwake: savedKeepScreenAwake,

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleShortcutsPanel: () => set((s) => ({ shortcutsPanelOpen: !s.shortcutsPanelOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openAuthModal: (mode) => {
    const valid = ['login', 'register', 'forgot-password', 'reset-password'] as const
    const safe = (valid as readonly string[]).includes(mode as string)
      ? (mode as typeof valid[number])
      : 'login'
    set(s => ({ authModalOpen: true, authModalMode: safe, authModalKey: s.authModalKey + 1 }))
  },
  closeAuthModal: () => set({ authModalOpen: false, authModalMode: 'login' }),
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  openMobileBookPicker: () => set({ mobileBookPickerOpen: true }),
  closeMobileBookPicker: () => set({ mobileBookPickerOpen: false }),
  openMobileSearch: () => set({ mobileSearchOpen: true, mobileHub: null, activePanel: null }),
  closeMobileSearch: () => set({ mobileSearchOpen: false }),
  openMobileHub: (hub) => set({ mobileHub: hub, mobileSearchOpen: false, activePanel: null }),
  closeMobileHub: () => set({ mobileHub: null }),

  addToast: (message, type = 'info', options) => {
    const id = `toast-${++_toastSeq}-${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action: options?.action }] }))
    if (options?.duration !== 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), options?.duration ?? 3000)
    }
    return id
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  openPanel: (panel) => set({ activePanel: panel }),
  togglePanel: (panel) => set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
  closePanel: () => set({ activePanel: null }),

  setFontSize: (size) => {
    localStorage.setItem('fontSize', size)
    saveUserSettingsSilently({ font_size: size })
    set({ fontSize: size })
  },

  setTheme: (t, sync = true) => {
    localStorage.setItem('theme', t)
    applyTheme(t)
    if (sync) saveUserSettingsSilently({ theme: t })
    set({ theme: t })
  },

  setAccentColor: (color, sync = true) => {
    localStorage.setItem('accentColor', color)
    applyAccentColor(color)
    if (sync) saveUserSettingsSilently({ accent_color: color })
    set({ accentColor: color })
  },

  setLocale: (l) => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, l)
    void i18n.changeLanguage(l)
    saveUserSettingsSilently({ locale: l })
    set({ locale: l })
  },

  setReadingMode: (mode) => {
    localStorage.setItem('readingMode', mode)
    saveUserSettingsSilently({ reading_mode: mode })
    set({ readingMode: mode })
  },

  setReaderFont: (readerFont, sync = true) => {
    localStorage.setItem('readerFont', readerFont)
    document.documentElement.dataset.readerFont = readerFont
    if (sync) saveUserSettingsSilently({ reader_font: readerFont })
    set({ readerFont })
  },

  setLineHeight: (lineHeight, sync = true) => {
    localStorage.setItem('lineHeight', lineHeight)
    document.documentElement.dataset.lineHeight = lineHeight
    if (sync) saveUserSettingsSilently({ line_height: lineHeight })
    set({ lineHeight })
  },

  setShowVerseNumbers: (showVerseNumbers, sync = true) => {
    localStorage.setItem('showVerseNumbers', String(showVerseNumbers))
    if (sync) saveUserSettingsSilently({ show_verse_numbers: showVerseNumbers })
    set({ showVerseNumbers })
  },

  setReduceMotion: (reduceMotion, sync = true) => {
    localStorage.setItem('reduceMotion', String(reduceMotion))
    document.documentElement.dataset.reduceMotion = String(reduceMotion)
    if (sync) saveUserSettingsSilently({ reduce_motion: reduceMotion })
    set({ reduceMotion })
  },

  setHighContrast: (highContrast, sync = true) => {
    localStorage.setItem('highContrast', String(highContrast))
    document.documentElement.dataset.highContrast = String(highContrast)
    if (sync) saveUserSettingsSilently({ high_contrast: highContrast })
    set({ highContrast })
  },

  setKeepScreenAwake: (keepScreenAwake) => {
    localStorage.setItem('keepScreenAwake', String(keepScreenAwake))
    set({ keepScreenAwake })
  },

  enterStudyMode: () => set({ studyMode: true }),
  exitStudyMode: () => set({ studyMode: false }),
}))
