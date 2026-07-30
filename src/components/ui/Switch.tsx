import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/** Shared on/off control for preference and permission settings. */
export function Switch({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled,
  size = 'md',
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none transition-colors',
        size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
        'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary',
        checked ? 'bg-accent' : 'bg-bg-tertiary ring-1 ring-inset ring-border-subtle',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'rounded-full bg-white shadow-sm transition-transform',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          checked
            ? size === 'sm'
              ? 'translate-x-[18px]'
              : 'translate-x-[21px]'
            : size === 'sm'
              ? 'translate-x-0.5'
              : 'translate-x-[1px]',
        )}
      />
    </button>
  )
}
