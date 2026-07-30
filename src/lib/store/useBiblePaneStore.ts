import { create } from 'zustand'
import { createContext, createElement, useContext, type ReactNode } from 'react'

interface BiblePaneState {
  commentaryOpen: boolean
  readingMode: 'flow' | 'verse'
  toggleCommentary: () => void
  closeCommentary: () => void
  setReadingMode: (mode: 'flow' | 'verse') => void
}

function createBiblePaneStore() {
  return create<BiblePaneState>((set) => ({
    commentaryOpen: false,
    readingMode: localStorage.getItem('readingMode') === 'flow' ? 'flow' : 'verse',
    toggleCommentary: () => set((state) => ({ commentaryOpen: !state.commentaryOpen })),
    closeCommentary: () => set({ commentaryOpen: false }),
    setReadingMode: (readingMode) => set({ readingMode }),
  }))
}

type BiblePaneStore = ReturnType<typeof createBiblePaneStore>

const globalBiblePaneStore = createBiblePaneStore()
const workspaceBiblePaneStores = new Map<string, BiblePaneStore>()
const BiblePaneStoreContext = createContext<BiblePaneStore | null>(null)

export function getBiblePaneStoreForTab(tabId: string): BiblePaneStore {
  let store = workspaceBiblePaneStores.get(tabId)
  if (!store) {
    store = createBiblePaneStore()
    workspaceBiblePaneStores.set(tabId, store)
  }
  return store
}

export function BiblePaneStoreProvider({
  store,
  children,
}: {
  store: BiblePaneStore
  children: ReactNode
}) {
  return createElement(BiblePaneStoreContext.Provider, { value: store }, children)
}

export function useActiveBiblePaneStore<T>(selector: (state: BiblePaneState) => T): T {
  const store = useContext(BiblePaneStoreContext) ?? globalBiblePaneStore
  return store(selector)
}
