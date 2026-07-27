import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, GripVertical, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { BiblePreviewVerse } from '@/lib/store/useBiblePreviewStore'

interface VerseRowProps {
  verse: BiblePreviewVerse
  selected: boolean
  /** Any verse is selected — the list is in multi-select mode. */
  selectionMode: boolean
  /** This row holds the keyboard cursor AND the list has focus. */
  showCursor: boolean
  /** Selected and the row above is not — opens a run. */
  runStart: boolean
  /** Selected and the row below is not — closes a run. */
  runEnd: boolean
  draggable: boolean
  onSelect: (e: React.MouseEvent) => void
  /** Add/remove this verse without disturbing the rest of the selection. */
  onToggle: () => void
  onQuickAdd: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

/**
 * One verse in the Bible tool list. Click selects, shift-click extends,
 * mod-click toggles — the same grammar as a file list. The whole row is a drag
 * source so verses can be dropped straight onto the canvas.
 *
 * Selection has to be unmistakable at a glance, so it is stated three times
 * over: a checkbox (explicit per-row state), a tinted body with a bracketing
 * rail (the run reads as one block), and an accent verse number. The keyboard
 * cursor is deliberately a different signal — an outline, not a fill — so
 * "where I am" never reads as "what I picked".
 */
export const VerseRow = forwardRef<HTMLDivElement, VerseRowProps>(function VerseRow(
  {
    verse, selected, selectionMode, showCursor, runStart, runEnd, draggable,
    onSelect, onToggle, onQuickAdd, onDragStart, onDragEnd,
  },
  ref,
) {
  const { t } = useTranslation()

  return (
    <div
      ref={ref}
      data-verse={verse.verse}
      role="option"
      aria-selected={selected}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        // Transparent borders are always present, so entering a run can't
        // nudge the row heights.
        'group relative flex gap-2 pl-3 pr-2 py-2 cursor-pointer select-none transition-colors',
        'border-y border-transparent',
        selected ? 'bg-accent/[0.14]' : 'hover:bg-bg-tertiary/60',
        selected && runStart && 'border-t-accent/30',
        selected && runEnd && 'border-b-accent/30',
        draggable && 'active:cursor-grabbing',
      )}
    >
      {/* Bracketing rail — a continuous bar down a multi-verse run */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[3px] transition-colors',
          selected ? 'bg-accent' : 'bg-transparent',
          runStart && 'rounded-t-full',
          runEnd && 'rounded-b-full',
        )}
      />

      {/* Keyboard cursor: an outline, never a fill */}
      {showCursor && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-sm ring-1 ring-inset ring-accent pointer-events-none"
        />
      )}

      {/* Checkbox. Space is always reserved; it only becomes visible once the
          list is in selection mode or the row is hovered. Hitting it toggles
          rather than replaces — the only way to build a multi-selection on
          touch, where there are no ⇧/⌘ modifiers. Keyboard users have Space, so
          this stays out of the listbox's a11y tree. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        className={cn(
          'mt-[3px] w-4 h-4 shrink-0 rounded-[4px] border flex items-center justify-center transition-all',
          selected ? 'bg-accent border-accent' : 'border-border hover:border-accent/60',
          selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        {selected && <Check className="w-3 h-3 text-bg-primary" strokeWidth={3} />}
      </button>

      <span
        className={cn(
          'shrink-0 w-5 text-right text-2xs tabular-nums pt-0.5 transition-colors',
          selected ? 'text-accent font-semibold' : 'text-text-muted font-medium',
        )}
      >
        {verse.verse}
      </span>

      <p
        className={cn(
          'min-w-0 flex-1 text-sm leading-relaxed transition-colors',
          selected ? 'text-text-primary' : 'text-text-secondary',
        )}
      >
        {verse.text}
      </p>

      {/* Row affordances — quiet until hover, per the Linear-ish house style */}
      <span className="shrink-0 flex items-start gap-0.5 pt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onQuickAdd()
          }}
          title={t('study.bible.addThisVerse')}
          aria-label={t('study.bible.addThisVerse')}
          className="w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-accent hover:bg-bg-tertiary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        {draggable && (
          <span
            className="w-4 h-5 flex items-center justify-center text-text-muted/60"
            title={t('study.bible.dragHint')}
            aria-hidden="true"
          >
            <GripVertical className="w-3 h-3" />
          </span>
        )}
      </span>
    </div>
  )
})
