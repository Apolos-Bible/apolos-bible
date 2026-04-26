import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { cn } from '@/lib/cn'
import { useIsMobile } from '@/lib/useIsMobile'

export function ContextMenu() {
  const { open, x, y, items, closeMenu } = useContextMenuStore()
  const isMobile = useIsMobile()

  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos]       = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)

  // Position the menu after it renders so we can measure its size
  useEffect(() => {
    if (!open) { setVisible(false); return }

    setPos({ x, y })
    setVisible(false)

    const frame = requestAnimationFrame(() => {
      if (!menuRef.current) return
      const { width, height } = menuRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({
        x: x + width  > vw - 8 ? Math.max(8, x - width)  : x,
        y: y + height > vh - 8 ? Math.max(8, y - height)  : y,
      })
      setVisible(true)
    })

    return () => cancelAnimationFrame(frame)
  }, [open, x, y])

  // Close on Escape + scroll
  useEffect(() => {
    if (!open) return
    const onKey    = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    const onScroll = () => closeMenu()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, closeMenu])

  if (!open) return null

  return createPortal(
    <>
      {/* Invisible backdrop — catches clicks & right-clicks outside */}
      <div
        className="fixed inset-0 z-[998]"
        onClick={closeMenu}
        onContextMenu={(e) => { e.preventDefault(); closeMenu() }}
      />

      {/* Menu panel */}
      <div
        ref={menuRef}
        style={{ left: pos.x, top: pos.y }}
        className={cn(
          'fixed z-[999] min-w-[192px] rounded-lg py-1',
          'bg-bg-secondary border border-border-subtle shadow-xl',
          'transition-opacity duration-100',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {items.map((item, i) => {
          if (item.type === 'separator') {
            return <div key={i} className="my-1 mx-2 h-px bg-border-subtle" />
          }

          if (item.type === 'label') {
            return (
              <div key={i} className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted select-none">
                {item.text}
              </div>
            )
          }

          return (
            <button
              key={i}
              onClick={() => {
                if (item.disabled) return
                item.onClick()
                closeMenu()
              }}
              className={cn(
                'group w-full flex items-center gap-2.5 px-3 py-[6px] text-left',
                'text-[13px] transition-colors duration-75',
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
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
