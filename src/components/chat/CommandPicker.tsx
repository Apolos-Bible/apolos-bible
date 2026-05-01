import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { type ChatCommand } from './chatCommands'

interface Props {
  commands:  ChatCommand[]
  activeIdx: number
  onSelect:  (cmd: ChatCommand) => void
  onHover:   (idx: number) => void
}

export function CommandPicker({ commands, activeIdx, onSelect, onHover }: Props) {
  const { t } = useTranslation()
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle">
        <span className="text-2xs text-text-muted">{t('chat.commandAvailable')}</span>
      </div>

      <div className="py-1">
        {commands.length === 0 && (
          <div className="px-3 py-2 text-xs text-text-muted">{t('chat.noCommandMatch')}</div>
        )}

        {commands.map((cmd, i) => (
          <button
            key={cmd.trigger}
            ref={i === activeIdx ? activeRef : null}
            type="button"
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(cmd)}
            className={cn(
              'w-full text-left px-3 py-2 flex items-center gap-3 transition-colors',
              i === activeIdx ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary',
            )}
          >
            <span className="text-sm font-mono font-medium text-accent w-8 shrink-0">
              {cmd.label}
            </span>
            <span className="text-xs text-text-muted">{t(cmd.description as any)}</span>
          </button>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t border-border-subtle flex items-center gap-3">
        <span className="text-2xs text-text-muted">{t('chat.commandNavigate')}</span>
        <span className="text-2xs text-text-muted">{t('chat.commandSelect')}</span>
        <span className="text-2xs text-text-muted">{t('chat.commandClose')}</span>
      </div>
    </div>
  )
}
