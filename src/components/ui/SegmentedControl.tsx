import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

/**
 * The shared segmented toggle used for theme / language / reading-mode / privacy.
 * Keyboard: it's a radiogroup with roving focus — Left/Right (and Up/Down) move
 * and apply the selection; Space/Enter selects the focused segment.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  const move = (dir: 1 | -1) => {
    const idx = options.findIndex((o) => o.value === value)
    const next = options[(idx + dir + options.length) % options.length]
    if (next) onChange(next.value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-1 rounded-lg bg-bg-tertiary p-1', className)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex h-9 md:h-8 items-center justify-center gap-1.5 rounded-md px-3 text-sm md:text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
              active
                ? 'bg-bg-secondary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
