import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: ReactNode
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/** Shared checkbox primitive. The native input remains as the accessible core. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  ariaLabel,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 text-sm text-text-secondary',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-secondary',
          checked
            ? 'border-accent bg-accent text-white'
            : 'border-border-hover bg-bg-secondary text-transparent hover:border-accent/60',
        )}
      >
        <Check size={14} strokeWidth={2.4} />
      </span>
      {label && <span>{label}</span>}
    </label>
  )
}
