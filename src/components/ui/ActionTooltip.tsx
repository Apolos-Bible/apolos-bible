import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ActionTooltipProps {
  label: string
  shortcut?: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

/**
 * Tooltip for actions whose shortcut is useful context, not just a label.
 * The second phase is deliberately delayed so the shortcut never competes
 * with the action name during a quick hover.
 */
export function ActionTooltip({
  label,
  shortcut,
  children,
  side = 'bottom',
  className,
}: ActionTooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [showShortcut, setShowShortcut] = useState(false)
  const [active, setActive] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const timerRef = useRef<number | null>(null)

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const gap = 8
    const left = Math.min(window.innerWidth - 8, Math.max(8, rect.left + rect.width / 2))
    const next = side === 'top'
      ? { top: rect.top - gap, left }
      : side === 'left'
        ? { top: rect.top + rect.height / 2, left: rect.left - gap }
        : side === 'right'
          ? { top: rect.top + rect.height / 2, left: rect.right + gap }
          : { top: rect.bottom + gap, left }
    setPosition(next)
  }, [side])

  useLayoutEffect(() => {
    if (!active) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [active, updatePosition])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const start = () => {
    setActive(true)
    setShowShortcut(false)
    if (!shortcut) return
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      setShowShortcut(true)
      timerRef.current = null
    }, 2000)
  }

  const stop = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setActive(false)
    setShowShortcut(false)
  }

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocusCapture={start}
      onBlurCapture={(event) => {
        const relatedTarget = event.relatedTarget
        if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
        stop()
      }}
    >
      {children}
      {active && typeof document !== 'undefined' && createPortal(
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none fixed z-[100] whitespace-nowrap',
            'rounded-md px-2.5 py-1.5 text-2xs text-text-primary bg-bg-tertiary border border-border-subtle shadow-md',
            'max-w-[calc(100vw-16px)] transition-opacity duration-150',
            side === 'top' && '-translate-x-1/2 -translate-y-full',
            side === 'bottom' && '-translate-x-1/2',
            side === 'left' && '-translate-x-full -translate-y-1/2',
            side === 'right' && '-translate-y-1/2',
          )}
          style={{ top: position.top, left: position.left }}
        >
          <span className={cn('transition-opacity duration-150', showShortcut && 'opacity-0 absolute inset-0 flex items-center justify-center')}>
            {label}
          </span>
          {shortcut && (
            <span className={cn('inline-flex items-center gap-1 transition-opacity duration-150', !showShortcut && 'opacity-0')}>
              <kbd className="rounded border border-border-subtle bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                {shortcut}
              </kbd>
            </span>
          )}
        </span>,
        document.body,
      )}
    </span>
  )
}
