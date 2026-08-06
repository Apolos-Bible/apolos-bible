import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { KeyboardScope, useCommand } from '@/lib/keyboard'
import { cn } from '@/lib/cn'
import { useIsMobile } from '@/lib/useIsMobile'

export function ContextMenu() {
  const open = useContextMenuStore((s) => s.open)
  if (!open) return null
  // Blocking scope: while the menu is up, j/k/n/h belong to the menu, not to
  // the reader underneath it.
  return (
    <KeyboardScope scope="dialog" blocking>
      <ContextMenuSurface />
    </KeyboardScope>
  )
}

function ContextMenuSurface() {
  const { x, y, items, closeMenu } = useContextMenuStore()
  const isMobile = useIsMobile()

  const menuRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const typeaheadRef = useRef({ query: '', at: 0 })
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  /** Indices of the rows that can actually be activated. */
  const actionIndexes = useMemo(
    () => items.map((item, i) => (item.type === 'action' && !item.disabled ? i : -1)).filter((i) => i >= 0),
    [items],
  )

  useCommand('dialog.close', () => closeMenu())

  // Position after render so the menu can be measured and flipped near edges.
  useEffect(() => {
    setPos({ x, y })
    setVisible(false)

    const frame = requestAnimationFrame(() => {
      if (!menuRef.current) return
      const { width, height } = menuRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({
        x: x + width > vw - 8 ? Math.max(8, x - width) : x,
        y: y + height > vh - 8 ? Math.max(8, y - height) : y,
      })
      setVisible(true)
    })

    return () => cancelAnimationFrame(frame)
  }, [x, y])

  // Take focus on open, hand it back to whatever opened us on close — the verse
  // row, the toolbar button, wherever the user was.
  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    setActiveIndex(actionIndexes[0] ?? null)
    return () => {
      const opener = restoreRef.current
      if (opener && document.contains(opener)) opener.focus()
    }
    // Intentionally on mount only: re-running would steal focus while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drive DOM focus from activeIndex so the browser scrolls long menus for us.
  useEffect(() => {
    if (activeIndex == null || !menuRef.current) return
    menuRef.current.querySelector<HTMLElement>(`[data-menu-index="${activeIndex}"]`)?.focus()
  }, [activeIndex, visible])

  useEffect(() => {
    const onScroll = () => closeMenu()
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [closeMenu])

  const move = useCallback(
    (delta: number) => {
      if (actionIndexes.length === 0) return
      const current = activeIndex == null ? -1 : actionIndexes.indexOf(activeIndex)
      const next = current < 0
        ? (delta > 0 ? 0 : actionIndexes.length - 1)
        : (current + delta + actionIndexes.length) % actionIndexes.length
      setActiveIndex(actionIndexes[next])
    },
    [actionIndexes, activeIndex],
  )

  const activate = useCallback(
    (index: number) => {
      const item = items[index]
      if (!item || item.type !== 'action' || item.disabled) return
      item.onClick()
      closeMenu()
    },
    [items, closeMenu],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        move(1)
        return
      case 'ArrowUp':
        e.preventDefault()
        move(-1)
        return
      case 'Home':
        e.preventDefault()
        setActiveIndex(actionIndexes[0] ?? null)
        return
      case 'End':
        e.preventDefault()
        setActiveIndex(actionIndexes[actionIndexes.length - 1] ?? null)
        return
      case 'Tab':
        // A menu is a single stop: Tab dismisses rather than escaping into the
        // page behind it.
        e.preventDefault()
        closeMenu()
        return
      case 'Enter':
      case ' ':
        if (activeIndex != null) {
          e.preventDefault()
          activate(activeIndex)
        }
        return
      default:
        break
    }

    // Typeahead: jump to the next item starting with what you type.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now()
      const state = typeaheadRef.current
      state.query = now - state.at > 700 ? e.key.toLowerCase() : state.query + e.key.toLowerCase()
      state.at = now

      const match = actionIndexes.find((i) => {
        const item = items[i]
        return item.type === 'action' && item.label.toLowerCase().startsWith(state.query)
      })
      if (match != null) {
        e.preventDefault()
        setActiveIndex(match)
      }
    }
  }

  return createPortal(
    <>
      {/* Invisible backdrop — catches clicks & right-clicks outside */}
      <div
        className="safe-area-fixed fixed inset-0 z-[998]"
        onClick={closeMenu}
        onContextMenu={(e) => { e.preventDefault(); closeMenu() }}
      />

      <div
        ref={menuRef}
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{ left: pos.x, top: pos.y }}
        className={cn(
          'fixed z-[999] max-h-[calc(100dvh-2rem)] min-w-[220px] overflow-y-auto rounded-lg py-1 outline-none md:min-w-[192px]',
          'bg-bg-secondary border border-border-subtle shadow-xl',
          'transition-opacity duration-100',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {items.map((item, i) => {
          if (item.type === 'separator') {
            return <div key={i} role="separator" className="my-1 mx-2 h-px bg-border-subtle" />
          }

          if (item.type === 'label') {
            return (
              <div
                key={i}
                role="presentation"
                className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none"
              >
                {item.text}
              </div>
            )
          }

          return (
            <button
              key={i}
              type="button"
              role="menuitem"
              data-menu-index={i}
              tabIndex={activeIndex === i ? 0 : -1}
              aria-disabled={item.disabled || undefined}
              onClick={() => activate(i)}
              onMouseEnter={() => !item.disabled && setActiveIndex(i)}
              className={cn(
                'group flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left md:min-h-0 md:py-[6px]',
                'text-[15px] transition-colors duration-75 outline-none md:text-[13px]',
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:bg-red-500/10'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus-visible:bg-bg-tertiary focus-visible:text-text-primary',
                item.disabled && 'opacity-35 cursor-not-allowed pointer-events-none',
              )}
            >
              {item.icon && (
                <span className="w-4 h-4 shrink-0 flex items-center justify-center text-text-muted group-hover:text-inherit transition-colors">
                  {item.icon}
                </span>
              )}
              <span className="flex-1 leading-none">{item.label}</span>
              {!isMobile && item.shortcut && (
                <span className="text-[10px] text-text-muted ml-4 shrink-0">{item.shortcut}</span>
              )}
            </button>
          )
        })}
      </div>
    </>,
    document.body,
  )
}
