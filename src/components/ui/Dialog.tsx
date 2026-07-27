import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { KeyboardScope, useCommand } from '@/lib/keyboard'
import { getFocusable } from '@/lib/keyboard/focus'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name. Use `labelledBy` instead when a visible heading exists. */
  label?: string
  labelledBy?: string
  describedBy?: string
  children: ReactNode
  /** Classes for the dialog panel itself. */
  className?: string
  /** Classes for the backdrop/positioning layer. */
  overlayClassName?: string
  /** CSS selector, relative to the panel, for the element to focus on open. */
  initialFocus?: string
  closeOnBackdrop?: boolean
  /** Render without the shared backdrop (side panels that dim nothing). */
  bare?: boolean
}

/**
 * The one modal primitive. Every dialog in the app goes through it so they all
 * get the same contract:
 *
 *  - `role="dialog"` + `aria-modal` + an accessible name
 *  - focus moves in on open and returns to the opener on close
 *  - Tab and Shift+Tab cycle inside the panel; focus cannot escape behind it
 *  - Escape closes, via a *blocking* keyboard scope — so page shortcuts (j/k,
 *    n, h…) are inert while the dialog is up instead of firing behind it
 */
export function Dialog(props: DialogProps) {
  if (!props.open) return null
  return (
    <KeyboardScope scope="dialog" blocking>
      <DialogSurface {...props} />
    </KeyboardScope>
  )
}

function DialogSurface({
  onClose,
  label,
  labelledBy,
  describedBy,
  children,
  className,
  overlayClassName,
  initialFocus,
  closeOnBackdrop = true,
  bare = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useCommand('dialog.close', () => onClose())

  // Remember the opener, move focus in, and hand it back on close. Without the
  // restore, closing a dialog dumps keyboard users at the top of the document.
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    if (panel) {
      const target =
        (initialFocus ? panel.querySelector<HTMLElement>(initialFocus) : null) ??
        getFocusable(panel)[0] ??
        panel
      // A frame's grace so children that autofocus themselves (cmdk's input)
      // aren't fought over.
      requestAnimationFrame(() => {
        if (panel.contains(document.activeElement)) return
        target.focus()
      })
    }

    return () => {
      const opener = restoreRef.current
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [initialFocus])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return

    const focusable = getFocusable(panel)
    if (focusable.length === 0) {
      e.preventDefault()
      panel.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        !bare && 'bg-black/60 backdrop-blur-sm',
        overlayClassName,
      )}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn('outline-none', className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
