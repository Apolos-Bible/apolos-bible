import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ label, children, side = 'bottom', className }: TooltipProps) {
  const sideClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }

  return (
    <span className={cn('relative group/tooltip inline-flex', className)}>
      {children}
      {/* Visual affordance only: the trigger carries its own aria-label, so
          exposing the tooltip too would announce the name twice. It must also
          appear on keyboard focus — hover-only labels are invisible to anyone
          navigating with Tab. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap',
          'rounded px-2 py-1 text-2xs text-text-primary bg-bg-tertiary border border-border-subtle shadow-md',
          'opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100',
          'transition-opacity duration-150 delay-300',
          sideClasses[side],
        )}
      >
        {label}
      </span>
    </span>
  )
}
