

import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'

const typeStyles = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-text-secondary',
} as const

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
} as const

export function Toast() {
  const { t } = useTranslation()
  const { toasts, removeToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'bg-bg-tertiary border border-border-subtle rounded-lg px-4 py-2.5',
            'text-sm flex items-center gap-3 shadow-lg',
            'animate-in slide-in-from-right duration-200'
          )}
        >
          <span className={cn('shrink-0 text-xs font-bold', typeStyles[toast.type])}>
            {typeIcons[toast.type]}
          </span>
          <span className="text-text-primary">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => { toast.action!.onClick(); removeToast(toast.id) }}
              className="ml-2 shrink-0 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto shrink-0 text-text-muted hover:text-text-secondary transition-colors leading-none"
            aria-label={t('toast.dismiss')}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
