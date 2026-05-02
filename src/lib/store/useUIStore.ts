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
export type Theme       = 'dark' | 'light'
export type Locale      = AppLocale
export type Panel       = 'favorites' | 'my-notes' | 'friends' | 'chat'
export type ReadingMode = 'flow' | 'verse'

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

type UIStore = {
  commandPaletteOpen: boolean
  shortcutsPanelOpen: boolean
  settingsOpen: boolean
  authModalOpen: boolean
  authModalMode: 'login' | 'register' | 'forgot-password' | 'reset-password'
  authModalKey: number
  commentaryOpen: boolean
  mobileSidebarOpen: boolean
  showOthersNotes: boolean
  toggleCommentary: () => void
  toggleShowOthersNotes: () => void
  toasts: Toast[]
  activePanel: Panel | null
  fontSize: FontSize
  theme: Theme
  locale: Locale
  readingMode: ReadingMode
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
  addToast: (message: string, type?: Toast['type'], options?: { action?: Toast['action']; duration?: number }) => string
  removeToast: (id: string) => void
  openPanel: (panel: Panel) => void
  togglePanel: (panel: Panel) => void
  closePanel: () => void
  setFontSize: (size: FontSize) => void
  setTheme: (t: Theme) => void
  setLocale: (l: Locale) => void
  setReadingMode: (mode: ReadingMode) => void
}

const savedFontSize    = (localStorage.getItem('fontSize')    as FontSize)    ?? 'base'
const savedTheme       = (localStorage.getItem('theme')       as Theme)       ?? 'light'
const savedReadingMode = (localStorage.getItem('readingMode') as ReadingMode) ?? 'verse'
const savedLocale      = getStoredAppLocale()
const savedShowOthers  = localStorage.getItem('showOthersNotes') === 'true'
applyTheme(savedTheme)

export const useUIStore = create<UIStore>((set) => ({
  commandPaletteOpen: false,
  shortcutsPanelOpen: false,
  settingsOpen: false,
  authModalOpen: false,
  authModalMode: 'login',
  authModalKey: 0,
  commentaryOpen: false,
  mobileSidebarOpen: false,
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
  locale: savedLocale ?? selectDefaultAppLocale(getBrowserLocale()),
  readingMode: savedReadingMode,

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

  addToast: (message, type = 'info', options) => {
    const id = `toast-${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action: options?.action }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), options?.duration ?? 3000)
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

  setTheme: (t) => {
    localStorage.setItem('theme', t)
    applyTheme(t)
    saveUserSettingsSilently({ theme: t })
    set({ theme: t })
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
}))
