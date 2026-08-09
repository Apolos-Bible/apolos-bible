import { create } from 'zustand'
import { checkForAppUpdates, installAppUpdate, type AppUpdate } from '@/lib/updater'

const SKIPPED_VERSION_KEY = 'appUpdate.skippedVersion'
const REMIND_AFTER_KEY = 'appUpdate.remindAfter'
const REMIND_DELAY_MS = 24 * 60 * 60 * 1000

type UpdateStatus = 'idle' | 'checking' | 'available' | 'installing'

type AppUpdateStore = {
  status: UpdateStatus
  update: AppUpdate | null
  progress: number | null
  check: (options?: { force?: boolean }) => Promise<AppUpdate | null>
  install: () => Promise<void>
  remindLater: () => void
  skipVersion: () => void
}

function shouldOffer(update: AppUpdate) {
  if (localStorage.getItem(SKIPPED_VERSION_KEY) === update.version) return false
  const remindAfter = Number(localStorage.getItem(REMIND_AFTER_KEY) ?? 0)
  return !Number.isFinite(remindAfter) || Date.now() >= remindAfter
}

export const useAppUpdateStore = create<AppUpdateStore>((set, get) => ({
  status: 'idle',
  update: null,
  progress: null,

  check: async (options = {}) => {
    set({ status: 'checking' })
    try {
      const update = await checkForAppUpdates({ force: options.force })
      const visibleUpdate = update && (options.force || shouldOffer(update)) ? update : null
      set(visibleUpdate
        ? { update: visibleUpdate, status: 'available', progress: null }
        : { update: null, status: 'idle', progress: null })
      return update
    } catch (error) {
      set({ status: 'idle', progress: null })
      throw error
    }
  },

  install: async () => {
    const update = get().update
    if (!update || get().status === 'installing') return
    set({ status: 'installing', progress: null })
    try {
      await installAppUpdate(update, (progress) => set({ progress }))
    } catch (error) {
      set({ status: 'available', progress: null })
      throw error
    }
  },

  remindLater: () => {
    localStorage.setItem(REMIND_AFTER_KEY, String(Date.now() + REMIND_DELAY_MS))
    set({ update: null, status: 'idle', progress: null })
  },

  skipVersion: () => {
    const update = get().update
    if (update) localStorage.setItem(SKIPPED_VERSION_KEY, update.version)
    localStorage.removeItem(REMIND_AFTER_KEY)
    set({ update: null, status: 'idle', progress: null })
  },
}))
