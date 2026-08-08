import { create } from 'zustand'

export type SyncState = 'idle' | 'saving' | 'saved' | 'offline' | 'pending' | 'error'

type Store = { state: SyncState; pending: number; error?: string; begin: () => void; succeed: () => void; fail: (message?: string) => void }

let savedTimer: ReturnType<typeof setTimeout> | undefined

export const useSyncStore = create<Store>((set) => ({
  state: navigator.onLine ? 'idle' : 'offline', pending: 0,
  begin: () => set((current) => ({ state: navigator.onLine ? 'saving' : 'pending', pending: current.pending + 1, error: undefined })),
  succeed: () => {
    set((current) => ({ state: navigator.onLine ? 'saved' : 'pending', pending: Math.max(0, current.pending - 1) }))
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => set((current) => current.pending === 0 ? { ...current, state: navigator.onLine ? 'idle' : 'offline' } : current), 2200)
  },
  fail: (message) => set((current) => ({ state: navigator.onLine ? 'error' : 'pending', pending: Math.max(1, current.pending), error: message })),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useSyncStore.setState((state) => ({ state: state.pending ? 'pending' : 'idle' })))
  window.addEventListener('offline', () => useSyncStore.setState({ state: 'offline' }))
}
