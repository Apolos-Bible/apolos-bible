import { create } from 'zustand'

type Toast = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
}

export type FontSize    = 'sm' | 'base' | 'lg'
export type Theme       = 'dark' | 'light'
export type Panel       = 'favorites' | 'my-notes' | 'friends'
export type ReadingMode = 'flow' | 'verse'

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

type UIStore = {
  commandPaletteOpen: boolean
  shortcutsPanelOpen: boolean
  settingsOpen: boolean
  authModalOpen: boolean
  commentaryOpen: boolean
  mobileSidebarOpen: boolean
  toggleCommentary: () => void
  toasts: Toast[]
  activePanel: Panel | null
  fontSize: FontSize
  theme: Theme
  readingMode: ReadingMode
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleShortcutsPanel: () => void
  openSettings: () => void
  closeSettings: () => void
  openAuthModal: () => void
  closeAuthModal: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
  toggleMobileSidebar: () => void
  addToast: (message: string, type?: Toast['type'], options?: { action?: Toast['action']; duration?: number }) => string
  removeToast: (id: string) => void
  openPanel: (panel: Panel) => void
  closePanel: () => void
  setFontSize: (size: FontSize) => void
  setTheme: (t: Theme) => void
  setReadingMode: (mode: ReadingMode) => void
}

const savedFontSize    = (localStorage.getItem('fontSize')    as FontSize)    ?? 'base'
const savedTheme       = (localStorage.getItem('theme')       as Theme)       ?? 'light'
const savedReadingMode = (localStorage.getItem('readingMode') as ReadingMode) ?? 'verse'
applyTheme(savedTheme)

export const useUIStore = create<UIStore>((set) => ({
  commandPaletteOpen: false,
  shortcutsPanelOpen: false,
  settingsOpen: false,
  authModalOpen: false,
  commentaryOpen: false,
  mobileSidebarOpen: false,
  toggleCommentary: () => set((s) => ({ commentaryOpen: !s.commentaryOpen })),
  toasts: [],
  activePanel: null,
  fontSize: savedFontSize,
  theme: savedTheme,
  readingMode: savedReadingMode,

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleShortcutsPanel: () => set((s) => ({ shortcutsPanelOpen: !s.shortcutsPanelOpen })),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),
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
  closePanel: () => set({ activePanel: null }),

  setFontSize: (size) => {
    localStorage.setItem('fontSize', size)
    set({ fontSize: size })
  },

  setTheme: (t) => {
    localStorage.setItem('theme', t)
    applyTheme(t)
    set({ theme: t })
  },

  setReadingMode: (mode) => {
    localStorage.setItem('readingMode', mode)
    set({ readingMode: mode })
  },
}))
