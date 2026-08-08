import {
  getVerseStoreForTab,
  useVerseStore,
  type VerseStore,
} from '@/lib/store/useVerseStore'

/**
 * The command palette lives above workspace pane providers. Resolve the
 * focused desktop tab explicitly; mobile continues to use the shared reader.
 */
export function commandPaletteVerseStore(
  isMobile: boolean,
  activeTabId: string | null | undefined,
): VerseStore {
  return !isMobile && activeTabId ? getVerseStoreForTab(activeTabId) : useVerseStore
}
