import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PanelHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  onClose?: () => void
  closeLabel?: string
  className?: string
  leading?: ReactNode
}

export function PanelHeader({ title, subtitle, description, actions, onClose, closeLabel, className, leading }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-3 md:py-2.5 border-b border-border-subtle shrink-0',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {leading}
        <div className="min-w-0">
          {subtitle && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent/70 truncate">
              {subtitle}
            </p>
          )}
          <p className="text-base font-semibold md:font-medium text-text-primary truncate">
            {title}
          </p>
          {description && (
            <p className="text-xs md:text-2xs text-text-muted truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      {(actions || onClose) && (
        <div className="flex items-center gap-1 shrink-0">
          {actions}
          {onClose && (
            <PanelHeaderButton onClick={onClose} aria-label={closeLabel}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 md:h-4 md:w-4">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </PanelHeaderButton>
          )}
        </div>
      )}
    </div>
  )
}

type PanelHeaderButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function PanelHeaderButton({ className, children, ...props }: PanelHeaderButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors',
        className,
      )}
    >
      {children}
    </button>
  )
}
