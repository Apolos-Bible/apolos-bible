import { create } from 'zustand'
import { createContext, createElement, useContext, type ReactNode } from 'react'

export type ReaderWidth = 'narrow' | 'medium' | 'wide'

interface BiblePaneState {
  commentaryOpen: boolean
  readingMode: 'flow' | 'verse'
  readerWidth: ReaderWidth
  libraryCollapsed: boolean
  toggleCommentary: () => void
  closeCommentary: () => void
  setReadingMode: (mode: 'flow' | 'verse') => void
  setReaderWidth: (width: ReaderWidth) => void
  toggleLibrary: () => void
}

function storedReaderWidth(): ReaderWidth {
  const value = localStorage.getItem('readerWidth')
  return value === 'medium' || value === 'wide' ? value : 'narrow'
}

function createBiblePaneStore() {
  return create<BiblePaneState>((set) => ({
    commentaryOpen: false,
    readingMode: localStorage.getItem('readingMode') === 'flow' ? 'flow' : 'verse',
    readerWidth: storedReaderWidth(),
    libraryCollapsed: localStorage.getItem('bibleLibraryCollapsed') === 'true',
    toggleCommentary: () => set((state) => ({ commentaryOpen: !state.commentaryOpen })),
    closeCommentary: () => set({ commentaryOpen: false }),
    setReadingMode: (readingMode) => {
      localStorage.setItem('readingMode', readingMode)
      set({ readingMode })
    },
    setReaderWidth: (readerWidth) => {
      localStorage.setItem('readerWidth', readerWidth)
      set({ readerWidth })
    },
    toggleLibrary: () => set((state) => {
      const libraryCollapsed = !state.libraryCollapsed
      localStorage.setItem('bibleLibraryCollapsed', String(libraryCollapsed))
      return { libraryCollapsed }
    }),
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
