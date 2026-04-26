

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'
import { useIsMobile } from '@/lib/useIsMobile'

const SHORTCUTS = [
  { key: 'J', description: 'Navigate to next verse' },
  { key: 'K', description: 'Navigate to previous verse' },
  { key: 'N', description: 'Focus note input' },
  { key: 'H', description: 'Toggle highlight mode' },
  { key: `${modKey}K`, description: 'Open command palette' },
  { key: '?', description: 'Toggle this panel' },
  { key: 'Esc', description: 'Close panel' },
]

export function KeyboardShortcutsPanel() {
  const { shortcutsPanelOpen, toggleShortcutsPanel } = useUIStore()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!shortcutsPanelOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleShortcutsPanel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcutsPanelOpen, toggleShortcutsPanel])

  if (!shortcutsPanelOpen || isMobile) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={toggleShortcutsPanel}
    >
      <div
        className="max-w-sm w-full bg-bg-secondary rounded-xl border border-border-subtle shadow-2xl overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-md font-medium text-text-primary">Keyboard Shortcuts</h2>
          <button
            onClick={toggleShortcutsPanel}
            className="text-text-muted hover:text-text-secondary transition-colors text-lg leading-none"
            aria-label="Close shortcuts panel"
          >
            ×
          </button>
        </div>

        {/* Shortcuts list */}
        <ul className="py-3 px-5 flex flex-col gap-0.5">
          {SHORTCUTS.map(({ key, description }) => (
            <li
              key={key}
              className="flex items-center justify-between py-2 gap-4"
            >
              <span className="text-sm text-text-secondary">{description}</span>
              <kbd
                className={cn(
                  'bg-bg-tertiary border border-border-subtle rounded px-1.5 py-0.5',
                  'text-xs font-mono text-text-secondary shrink-0'
                )}
              >
                {key}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
