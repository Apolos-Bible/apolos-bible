
import { useEffect, useRef, useState } from 'react'
import { useHighlightStore } from '@/lib/store/useHighlightStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'
import { isAuthError } from '@/lib/auth'
import type { HighlightColor } from '@/types'

interface HighlightToolbarProps {
  verseId: string     // string slug — used to scope DOM text selection
  verseApiId: number  // numeric DB id — used for API calls
}

type SelectionRange = { start: number; end: number }

const COLORS: { value: HighlightColor; bg: string; border: string }[] = [
  { value: 'yellow', bg: 'bg-[#e5c07b]', border: 'border-[#e5c07b]' },
  { value: 'blue',   bg: 'bg-[#61afef]', border: 'border-[#61afef]' },
  { value: 'green',  bg: 'bg-[#98c379]', border: 'border-[#98c379]' },
]

export function HighlightToolbar({ verseId, verseApiId }: HighlightToolbarProps) {
  const addHighlight = useHighlightStore((s) => s.addHighlight)
  const addToast = useUIStore((s) => s.addToast)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const user = useAuthStore((s) => s.user)

  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow')
  const [selectionRange, setSelectionRange] = useState<SelectionRange | null>(null)
  const [saving, setSaving] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectionRange(null)
        return
      }

      const range = sel.getRangeAt(0)

      const verseTextEl = document.querySelector(`[data-verse-text="${verseId}"]`)
      if (!verseTextEl) {
        setSelectionRange(null)
        return
      }

      const anchorInVerse =
        verseTextEl.contains(range.startContainer) &&
        verseTextEl.contains(range.endContainer)

      if (!anchorInVerse) {
        setSelectionRange(null)
        return
      }

      const fullText = verseTextEl.textContent ?? ''

      const walker = document.createTreeWalker(verseTextEl, NodeFilter.SHOW_TEXT)
      let charOffset = 0
      let startOffset: number | null = null
      let endOffset: number | null = null

      let node: Text | null
      while ((node = walker.nextNode() as Text | null)) {
        const len = node.length

        if (node === range.startContainer) {
          startOffset = charOffset + range.startOffset
        }
        if (node === range.endContainer) {
          endOffset = charOffset + range.endOffset
        }

        charOffset += len

        if (startOffset !== null && endOffset !== null) break
      }

      if (startOffset !== null && endOffset !== null && endOffset > startOffset) {
        setSelectionRange({
          start: Math.max(0, startOffset),
          end: Math.min(fullText.length, endOffset),
        })
      } else {
        setSelectionRange(null)
      }
    }

    document.addEventListener('mouseup', handleSelectionChange)
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('mouseup', handleSelectionChange)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [verseId])

  async function handleAddHighlight() {
    if (!selectionRange || saving) return
    setSaving(true)
    try {
      await addHighlight(verseApiId, selectionRange.start, selectionRange.end, selectedColor)
      addToast('Highlight added', 'success')
      window.getSelection()?.removeAllRanges()
      setSelectionRange(null)
    } catch (error) {
      if (!user || isAuthError(error)) {
        addToast('You need to log in to save highlights', 'error', {
          action: { label: 'Log in', onClick: openAuthModal },
        })
        return
      }

      addToast('Could not save highlight', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 px-4 py-2 border-t border-border-subtle text-xs text-text-muted"
    >
      {/* Color swatches */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Highlight color">
        {COLORS.map(({ value, bg, border }) => (
          <button
            key={value}
            type="button"
            title={`${value.charAt(0).toUpperCase() + value.slice(1)} highlight`}
            onClick={() => setSelectedColor(value)}
            className={cn(
              'w-4 h-4 rounded-full transition-all duration-100',
              bg,
              selectedColor === value
                ? `border-2 ${border} ring-1 ring-offset-1 ring-offset-bg-secondary ring-white/20 scale-110`
                : 'border-2 border-transparent opacity-60 hover:opacity-90',
            )}
            aria-pressed={selectedColor === value}
          />
        ))}
      </div>

      <div className="w-px h-3 bg-border-subtle mx-1" aria-hidden="true" />

      {/* Highlight button */}
      <button
        type="button"
        onClick={handleAddHighlight}
        disabled={!selectionRange || saving}
        className={cn(
          'px-2.5 py-1 rounded text-xs font-medium transition-colors duration-100',
          selectionRange && !saving
            ? 'bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer'
            : 'text-text-muted cursor-not-allowed opacity-50',
        )}
      >
        {saving ? 'Saving…' : 'Highlight selection'}
      </button>

      {selectionRange && (
        <span className="text-2xs text-text-muted ml-auto opacity-60">
          {selectionRange.end - selectionRange.start}ch selected
        </span>
      )}
    </div>
  )
}
