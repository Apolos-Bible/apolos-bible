
import { useEffect, useRef } from 'react'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import type { MenuItem } from '@/lib/store/useContextMenuStore'
import { PanelHeader } from '@/components/layout/PanelHeader'
import { VerseText } from '@/components/verse/VerseText'
import { VerseReference } from '@/components/verse/VerseReference'
import { HighlightToolbar } from '@/components/study/HighlightToolbar'
import NoteThread from '@/components/notes/NoteThread'
import NoteInput from '@/components/notes/NoteInput'
import { EmptyState } from '@/components/ui/EmptyState'
import type { HighlightColor } from '@/types'

function ColorDot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ backgroundColor: color }} />
}

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <path d="M1 8V2a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

const HIGHLIGHT_COLORS: { label: string; value: HighlightColor; hex: string }[] = [
  { label: 'Yellow', value: 'yellow', hex: '#e5c07b' },
  { label: 'Blue',   value: 'blue',   hex: '#61afef' },
  { label: 'Green',  value: 'green',  hex: '#98c379' },
]

export function StudyPanel() {
  const selectedVerseId = useVerseStore((s) => s.selectedVerseId)
  const verses          = useVerseStore((s) => s.verses)
  const selectVerse     = useVerseStore((s) => s.selectVerse)

  const highlights     = useHighlightStore((s) => s.highlights)
  const loadHighlights = useHighlightStore((s) => s.loadHighlights)
  const addHighlight   = useHighlightStore((s) => s.addHighlight)

  const addToast = useUIStore((s) => s.addToast)
  const openMenu = useContextMenuStore((s) => s.openMenu)

  const verse           = verses.find((v) => v.id === selectedVerseId) ?? null
  const verseHighlights = verse ? (highlights[verse.apiId] ?? []) : []

  useEffect(() => {
    if (verse) loadHighlights(verse.apiId)
  }, [verse?.apiId])

  // ── Context menu on verse text ───────────────────────────────────────────

  function getTextSelection(verseId: string): { start: number; end: number; text: string } | null {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null

    const range = sel.getRangeAt(0)
    const el = document.querySelector(`[data-verse-text="${verseId}"]`)
    if (!el || !el.contains(range.startContainer) || !el.contains(range.endContainer)) return null

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let offset = 0, start: number | null = null, end: number | null = null
    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      if (node === range.startContainer) start = offset + range.startOffset
      if (node === range.endContainer)   end   = offset + range.endOffset
      offset += node.length
      if (start !== null && end !== null) break
    }

    if (start === null || end === null || end <= start) return null
    return { start, end, text: sel.toString() }
  }

  function handleVerseTextContextMenu(e: React.MouseEvent) {
    if (!verse) return
    e.preventDefault()

    const selection = getTextSelection(verse.id)
    const items: MenuItem[] = []

    if (selection) {
      items.push({ type: 'label', text: 'Highlight selection' })
      for (const { label, value, hex } of HIGHLIGHT_COLORS) {
        items.push({
          type: 'action',
          label,
          icon: <ColorDot color={hex} />,
          onClick: () =>
            addHighlight(verse.apiId, selection.start, selection.end, value)
              .then(() => { addToast('Highlight added', 'success'); window.getSelection()?.removeAllRanges() })
              .catch(() => addToast('Could not save highlight', 'error')),
        })
      }
      items.push({ type: 'separator' })
      items.push({
        type: 'action',
        label: 'Copy selection',
        icon: <IconCopy />,
        onClick: () => { navigator.clipboard.writeText(selection.text); addToast('Copied', 'success') },
      })
    } else {
      items.push({
        type: 'action',
        label: 'Copy verse text',
        icon: <IconCopy />,
        onClick: () => { navigator.clipboard.writeText(verse.text); addToast('Copied', 'success') },
      })
      items.push({ type: 'separator' })
      items.push({ type: 'label', text: 'Highlight entire verse' })
      for (const { label, value, hex } of HIGHLIGHT_COLORS) {
        items.push({
          type: 'action',
          label,
          icon: <ColorDot color={hex} />,
          onClick: () =>
            addHighlight(verse.apiId, 0, verse.text.length, value)
              .then(() => addToast('Highlight added', 'success'))
              .catch(() => addToast('Could not save highlight', 'error')),
        })
      }
    }

    openMenu(e.clientX, e.clientY, items)
  }

  return (
    <div className="w-full md:w-panel bg-bg-secondary border-l border-border-subtle h-full md:h-screen flex flex-col">
      {/* Header */}
      <PanelHeader
        title={
          verse
            ? `${verse.book.charAt(0).toUpperCase()}${verse.book.slice(1)} ${verse.chapter}:${verse.verse}`
            : 'Study'
        }
        actions={
          verse ? (
            <button
              type="button"
              onClick={() => selectVerse(null)}
              aria-label="Close study panel"
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors duration-100"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : undefined
        }
      />

      {/* Body */}
      {!verse ? (
        <EmptyState message="Select a verse to begin studying" />
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col">

            {/* Verse text card — right-click for highlight/copy menu */}
            <div
              className="bg-bg-tertiary rounded-lg mx-4 my-3 p-4"
              onContextMenu={handleVerseTextContextMenu}
            >
              <div data-verse-text={verse.id}>
                <VerseText text={verse.text} highlights={verseHighlights} />
              </div>
            </div>

            {/* Highlight toolbar */}
            <div className="mx-4 mb-2">
              <div className="border border-border-subtle rounded-lg overflow-hidden">
                <HighlightToolbar verseId={verse.id} verseApiId={verse.apiId} />
              </div>
            </div>

            {/* Notes thread */}
            <NoteThread verseApiId={verse.apiId} />
          </div>

          <NoteInput verseApiId={verse.apiId} />
        </div>
      )}
    </div>
  )
}
