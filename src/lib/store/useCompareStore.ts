import { create } from 'zustand'
import { createContext, createElement, useContext, type ReactNode } from 'react'
import { bibleApi } from '@/lib/bibleApi'
import type { ApiVersion, ApiChapterResponse } from '@/lib/bibleApi'

export interface ComparedVersionChapter {
  version: ApiVersion
  data: ApiChapterResponse | null
  loading: boolean
  error: boolean
  notAvailable: boolean
}

export interface CompareState {
  open: boolean
  result: ComparedVersionChapter | null
  bookSlug: string
  chapter: number
  targetVerseNumbers: number[]
  hoveredVerseNumber: number | null
  openCompare: (version: ApiVersion, slug: string, chapter: number, verseNumbers?: number | number[]) => Promise<void>
  setHoveredVerse: (verseNumber: number | null) => void
  closeCompare: () => void
}

export function createCompareStore() {
  let requestSequence = 0
  return create<CompareState>((set) => ({
  open: false,
  result: null,
  bookSlug: '',
  chapter: 1,
  targetVerseNumbers: [],
  hoveredVerseNumber: null,

  openCompare: async (version, slug, chapter, verseNumbers) => {
    const requestId = ++requestSequence
    const targets = Array.isArray(verseNumbers)
      ? verseNumbers
      : verseNumbers != null
        ? [verseNumbers]
        : []

    set({
      open: true,
      result: {
        version,
        data: null,
        loading: true,
        error: false,
        notAvailable: false,
      },
      bookSlug: slug,
      chapter,
      targetVerseNumbers: targets,
    })

    try {
      const data = await bibleApi.chapter(version.id, slug, chapter)
      if (requestId !== requestSequence) return
      set({
        result: {
          version,
          data,
          loading: false,
          error: false,
          notAvailable: false,
        },
      })
    } catch (error) {
      if (requestId !== requestSequence) return
      const notAvailable = (error as { status?: number })?.status === 404
      set({
        result: {
          version,
          data: null,
          loading: false,
          error: !notAvailable,
          notAvailable,
        },
      })
    }
  },

  setHoveredVerse: (hoveredVerseNumber) => set({ hoveredVerseNumber }),

  closeCompare: () => {
    requestSequence += 1
    set({
      open: false,
      result: null,
      bookSlug: '',
      chapter: 1,
      targetVerseNumbers: [],
      hoveredVerseNumber: null,
    })
  },
  }))
}

export const useCompareStore = createCompareStore()
type CompareStore = typeof useCompareStore

const workspaceCompareStores = new Map<string, CompareStore>()
const CompareStoreContext = createContext<CompareStore | null>(null)

export function getCompareStoreForTab(tabId: string): CompareStore {
  let store = workspaceCompareStores.get(tabId)
  if (!store) {
    store = createCompareStore()
    workspaceCompareStores.set(tabId, store)
  }
  return store
}

export function CompareStoreProvider({ store, children }: { store: CompareStore; children: ReactNode }) {
  return createElement(CompareStoreContext.Provider, { value: store }, children)
}

export function useActiveCompareStore(): CompareState
export function useActiveCompareStore<T>(selector: (state: CompareState) => T): T
export function useActiveCompareStore<T>(selector?: (state: CompareState) => T): T | CompareState {
  const store = useContext(CompareStoreContext) ?? useCompareStore
  if (!selector) return store()
  return store(selector)
}
