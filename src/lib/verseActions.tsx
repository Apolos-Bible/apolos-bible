import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { comparableBibleVersions, preferredComparisonVersion } from '@/lib/bibleVersionOptions'
import { useActiveVerseStore, useVerseStoreApi, type Verse } from '@/lib/store/useVerseStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useActiveCrossRefStore } from '@/lib/store/useCrossRefStore'
import { useActiveCompareStore } from '@/lib/store/useCompareStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { ScanSearch } from 'lucide-react'
import type { MenuItem } from '@/lib/store/useContextMenuStore'
import { isAuthError } from '@/lib/auth'
import { focusWhenReady, type TranslationKey } from '@/lib/keyboard'
import type { HighlightColor } from '@/types'
import { isMac } from '@/lib/platform'
import { isRemoteVerseApiId, isYouVersionVersion } from '@/lib/youVersion'

// ── Icons ──────────────────────────────────────────────────────────────────

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <path d="M1 8V2a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

function IconNote() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h8v7H7l-1 1.5L5 9H2V2z" />
      <path d="M4 5h4M4 7h2" />
    </svg>
  )
}

function IconStar({ filled }: { filled?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <polygon points="6,1 7.2,4.3 10.8,4.5 8.0,6.6 8.9,10.0 6,8.1 3.1,10.0 4.0,6.6 1.2,4.5 4.8,4.3" />
    </svg>
  )
}

function IconXRef() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="7" cy="11" r="1.5" />
      <path d="M4.3 4.8C5 7 7 9.5 7 9.5M9.7 4.8C9 7 7 9.5 7 9.5" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3.5" cy="6" r="2" />
      <circle cx="8.5" cy="3" r="2" />
      <circle cx="8.5" cy="9" r="2" />
      <path d="M5 5l2-1.5M5 7l2 1.5" />
    </svg>
  )
}

function ColorDot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
}

function platformShortcut(key: string, shift = false) {
  return `${isMac ? '⌘' : 'Ctrl+'}${shift ? (isMac ? '⇧' : 'Shift+') : ''}${key}`
}

export const HIGHLIGHT_SWATCHES: { color: HighlightColor; hex: string; labelKey: TranslationKey }[] = [
  { color: 'yellow', hex: '#e5c07b', labelKey: 'study.colorYellow' },
  { color: 'blue', hex: '#61afef', labelKey: 'study.colorBlue' },
  { color: 'green', hex: '#98c379', labelKey: 'study.colorGreen' },
]

/** Selector for the note composer, so `n` can land the caret in it. */
export const NOTE_INPUT_SELECTOR = '[data-focus-target="note-input"]'

/**
 * Every verse action in one place. The context menu, the toolbar and the
 * keyboard commands all call into this — that's what keeps the `h` shortcut and
 * the "Resaltar" menu item from drifting apart.
 */
export function useVerseActions() {
  const { t } = useTranslation()

  const verses = useActiveVerseStore((s) => s.verses)
  const books = useActiveVerseStore((s) => s.books)
  const selectedBook = useActiveVerseStore((s) => s.selectedBook)
  const selectedChapter = useActiveVerseStore((s) => s.selectedChapter)
  const selectedVerseId = useActiveVerseStore((s) => s.selectedVerseId)
  const selectedVerseIds = useActiveVerseStore((s) => s.selectedVerseIds)
  const cursorVerseId = useActiveVerseStore((s) => s.cursorVerseId)
  const openStudyPanel = useActiveVerseStore((s) => s.openStudyPanel)
  const closeStudyPanel = useActiveVerseStore((s) => s.closeStudyPanel)
  const loadVersions = useActiveVerseStore((s) => s.loadVersions)
  const versions = useActiveVerseStore((s) => s.versions)
  const versionId = useActiveVerseStore((s) => s.versionId)
  const verseStore = useVerseStoreApi()

  const highlights = useHighlightStore((s) => s.highlights)
  const addHighlight = useHighlightStore((s) => s.addHighlight)
  const removeHighlight = useHighlightStore((s) => s.removeHighlight)

  const bookmarkedIds = useBookmarkStore((s) => s.bookmarkedIds)
  const toggleBookmark = useBookmarkStore((s) => s.toggle)

  const verseIdsWithRefs = useActiveCrossRefStore((s) => s.verseIdsWithRefs)
  const openCrossRefPanel = useActiveCrossRefStore((s) => s.openPanel)
  const openSimilarPanel = useActiveCrossRefStore((s) => s.openSimilar)
  const closeCrossRefPanel = useActiveCrossRefStore((s) => s.closePanel)
  const openCompare = useActiveCompareStore((s) => s.openCompare)
  const closeCompare = useActiveCompareStore((s) => s.closeCompare)

  const user = useAuthStore((s) => s.user)
  const addToast = useUIStore((s) => s.addToast)
  const openAuthModal = useUIStore((s) => s.openAuthModal)

  const bookName = books.find((b) => b.slug === selectedBook)?.name ?? selectedBook
  const currentVersion = versions.find((version) => version.id === versionId)
  const remoteAttribution = isYouVersionVersion(currentVersion)
    ? [
        currentVersion?.abbreviation ? `(${currentVersion.abbreviation})` : '',
        currentVersion?.copyright ?? '',
      ].filter(Boolean).join('\n')
    : ''

  const requireLocalVerses = useCallback(
    (list: Verse[]): boolean => {
      if (!list.some((verse) => isRemoteVerseApiId(verse.apiId))) return true
      addToast(t('youVersion.actionsUnavailable'), 'info')
      return false
    },
    [addToast, t],
  )

  /**
   * The verses a command acts on: the multi-selection, else the cursor verse,
   * else the first verse of the chapter.
   *
   * The last fallback matters. Jumping in from a side panel (favorites, my
   * notes) goes through loadChapter, which clears the selection — so `n`/`f`/`h`
   * used to no-op in silence with a panel open. This is the same rule the roving
   * tabindex uses to pick the tabbable row, so a command always acts on the
   * verse that visibly holds the cursor.
   */
  const targetVerses = useMemo(() => {
    const fromSelection = selectedVerseIds
      .map((id) => verses.find((v) => v.id === id))
      .filter((v): v is Verse => Boolean(v))
    if (fromSelection.length > 0) return fromSelection

    const cursor =
      verses.find((v) => v.id === selectedVerseId) ??
      verses.find((v) => v.id === cursorVerseId) ??
      verses[0]
    return cursor ? [cursor] : []
  }, [verses, selectedVerseIds, selectedVerseId, cursorVerseId])

  const requireLogin = useCallback((): boolean => {
    if (user) return false
    addToast(t('study.loginRequired'), 'error', {
      action: { label: t('auth.logIn'), onClick: openAuthModal },
    })
    openAuthModal()
    return true
  }, [user, addToast, t, openAuthModal])

  const reportFailure = useCallback(
    (error: unknown, fallbackKey: TranslationKey) => {
      if (isAuthError(error)) {
        addToast(t('study.loginRequired'), 'error', {
          action: { label: t('auth.logIn'), onClick: openAuthModal },
        })
        return
      }
      addToast(t(fallbackKey), 'error')
    },
    [addToast, t, openAuthModal],
  )

  const referenceFor = useCallback(
    (verse: Verse) => `${bookName} ${verse.chapter}:${verse.verse}`,
    [bookName],
  )

  // ── Actions ──────────────────────────────────────────────────────────────

  const copyText = useCallback(
    (list: Verse[]) => {
      if (!list.length) return
      const text = list.map((v) => v.text).join('\n\n')
      navigator.clipboard.writeText(
        remoteAttribution ? `${text}\n\n${remoteAttribution}` : text,
      )
      addToast(t('toast.copied'), 'success')
    },
    [addToast, remoteAttribution, t],
  )

  const copyReference = useCallback(
    (list: Verse[]) => {
      if (!list.length) return
      const refs = list.map(referenceFor).join(', ')
      const value = list.length === 1 ? `${refs} — ${list[0].text}` : refs
      const payload = remoteAttribution ? `${value}\n\n${remoteAttribution}` : value
      navigator.clipboard.writeText(payload)
      addToast(t('verse.copiedRef', { ref: refs }), 'success')
    },
    [addToast, remoteAttribution, t, referenceFor],
  )

  const share = useCallback(
    (list: Verse[]) => {
      if (!list.length) return
      const refs = list.map(referenceFor).join(', ')
      const verseText = list.map((v) => `${referenceFor(v)} — ${v.text}`).join('\n\n')
      const shareText = remoteAttribution
        ? `${verseText}\n\n${remoteAttribution}`
        : verseText
      const shareUrl = window.location.href
      if (navigator.share) {
        navigator.share({ title: refs, text: shareText, url: shareUrl })
      } else {
        navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
        addToast(t('toast.copied'), 'success')
      }
    },
    [addToast, remoteAttribution, t, referenceFor],
  )

  const highlight = useCallback(
    (list: Verse[], color: HighlightColor) => {
      if (!list.length || !requireLocalVerses(list) || requireLogin()) return
      Promise.all(
        list.map(async (verse) => {
          const existing = highlights[verse.apiId] ?? []
          await Promise.all(existing.map((h) => removeHighlight(verse.apiId, h.id)))
          await addHighlight(verse.apiId, 0, verse.text.length, color)
        }),
      ).catch((error) => reportFailure(error, 'toast.highlightFailed'))
    },
    [requireLocalVerses, requireLogin, highlights, removeHighlight, addHighlight, reportFailure],
  )

  /** `h` — clears when everything is already highlighted, else paints yellow. */
  const toggleHighlight = useCallback(
    (list: Verse[]) => {
      if (!list.length || !requireLocalVerses(list) || requireLogin()) return
      const allHighlighted = list.every((verse) => (highlights[verse.apiId] ?? []).length > 0)

      if (!allHighlighted) {
        highlight(list, 'yellow')
        return
      }

      Promise.all(
        list.flatMap((verse) =>
          (highlights[verse.apiId] ?? []).map((h) => removeHighlight(verse.apiId, h.id)),
        ),
      ).catch((error) => reportFailure(error, 'toast.highlightFailed'))
    },
    [requireLocalVerses, requireLogin, highlights, highlight, removeHighlight, reportFailure],
  )

  const addNote = useCallback(
    (list: Verse[]) => {
      if (!list.length || !requireLocalVerses(list) || requireLogin()) return
      openStudyPanel(list[0].id)
      // The panel mounts a frame or two later (and in a different subtree on
      // mobile), so aim at the composer rather than assuming it's there.
      focusWhenReady(NOTE_INPUT_SELECTOR)
    },
    [requireLocalVerses, requireLogin, openStudyPanel],
  )

  const toggleFavorite = useCallback(
    (list: Verse[]) => {
      if (!list.length || !requireLocalVerses(list) || requireLogin()) return
      Promise.all(list.map((verse) => toggleBookmark(verse.apiId))).catch((error) =>
        reportFailure(error, 'toast.bookmarkFailed'),
      )
    },
    [requireLocalVerses, requireLogin, toggleBookmark, reportFailure],
  )

  const openCrossRefs = useCallback(
    (list: Verse[]) => {
      if (!list.length || !requireLocalVerses(list)) return
      closeCompare()
      closeStudyPanel()
      void openCrossRefPanel(
        list.map((verse) => ({ verseApiId: verse.apiId, label: referenceFor(verse) })),
        verseStore.getState().versionId,
      )
    },
    [requireLocalVerses, closeCompare, closeStudyPanel, openCrossRefPanel, referenceFor],
  )

  const openSimilar = useCallback(
    (list: Verse[]) => {
      if (!requireLocalVerses(list)) return
      if (list.length !== 1) {
        addToast(t('toolbar.similarRequiresOne'), 'info')
        return
      }
      const verse = list[0]
      closeCompare()
      closeStudyPanel()
      void openSimilarPanel(
        { verseApiId: verse.apiId, label: referenceFor(verse) },
        verseStore.getState().versionId,
      )
    },
    [requireLocalVerses, addToast, closeCompare, closeStudyPanel, openSimilarPanel, referenceFor, t],
  )

  const compareVersions = useCallback(
    async (list: Verse[]) => {
      let available = versions
      if (!available.length) {
        await loadVersions()
        available = verseStore.getState().versions
      }
      const currentVersionId = verseStore.getState().versionId
      const comparisonVersion = preferredComparisonVersion(comparableBibleVersions(available, currentVersionId))
      if (!comparisonVersion) {
        addToast(t('compareVersions.noAlternatives'), 'info')
        return
      }
      closeCrossRefPanel()
      closeStudyPanel()
      void openCompare(
        comparisonVersion,
        selectedBook,
        selectedChapter,
        list.map((verse) => verse.verse),
      )
    },
    [
      addToast,
      closeStudyPanel,
      closeCrossRefPanel,
      loadVersions,
      openCompare,
      selectedBook,
      selectedChapter,
      t,
      versions,
    ],
  )

  // ── Menu ─────────────────────────────────────────────────────────────────

  const buildMenu = useCallback(
    (list: Verse[]): MenuItem[] => {
      if (!list.length) return []
      const hasRemoteVerses = list.some((verse) => isRemoteVerseApiId(verse.apiId))
      const allBookmarked = list.every((verse) => bookmarkedIds.has(verse.apiId))
      const hasCrossRefs = list.some((verse) => verseIdsWithRefs.has(verse.apiId))

      const items: MenuItem[] = [
        { type: 'action', label: t('study.copyVerseText'), icon: <IconCopy />, shortcut: platformShortcut('C'), onClick: () => copyText(list) },
        { type: 'action', label: t('verse.copyReference'), icon: <IconCopy />, shortcut: platformShortcut('C', true), onClick: () => copyReference(list) },
        { type: 'action', label: t('verse.shareVerse'), icon: <IconShare />, shortcut: platformShortcut('S', true), onClick: () => share(list) },
      ]

      if (hasRemoteVerses) return items

      items.push(
        { type: 'separator' },
        { type: 'label', text: t('verse.highlightVerse') },
        ...HIGHLIGHT_SWATCHES.map((swatch, i) => ({
          type: 'action' as const,
          label: t(swatch.labelKey),
          icon: <ColorDot color={swatch.hex} />,
          shortcut: String(i + 1),
          onClick: () => highlight(list, swatch.color),
        })),
        { type: 'separator' },
        { type: 'action', label: t('verse.addNote'), icon: <IconNote />, shortcut: 'N', onClick: () => addNote(list) },
      )

      if (hasCrossRefs) {
        items.push({ type: 'separator' })
        items.push({
          type: 'action',
          label: t('toolbar.crossReferences'),
          icon: <IconXRef />,
          shortcut: 'X',
          onClick: () => openCrossRefs(list),
        })
      }

      if (list.length === 1) {
        items.push({
          type: 'action',
          label: t('toolbar.similarVerses'),
          icon: <ScanSearch className="h-3 w-3" strokeWidth={1.7} />,
          shortcut: 'S',
          onClick: () => openSimilar(list),
        })
      }

      items.push({
        type: 'action',
        label: allBookmarked ? t('verse.removeFromFavorites') : t('verse.addToFavorites'),
        icon: <IconStar filled={allBookmarked} />,
        shortcut: 'F',
        onClick: () => toggleFavorite(list),
      })

      return items
    },
    [t, bookmarkedIds, verseIdsWithRefs, copyText, copyReference, share, highlight, addNote, openCrossRefs, openSimilar, toggleFavorite],
  )

  return {
    targetVerses,
    bookName,
    referenceFor,
    requireLogin,
    copyText,
    copyReference,
    share,
    highlight,
    toggleHighlight,
    addNote,
    toggleFavorite,
    openCrossRefs,
    openSimilar,
    compareVersions,
    buildMenu,
  }
}
