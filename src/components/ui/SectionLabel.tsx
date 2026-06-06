import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** The uppercase muted section label used throughout the app. */
export function SectionLabel({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <p
      id={id}
      className={cn(
        'text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted select-none',
        className,
      )}
    >
      {children}
    </p>
  )
}
