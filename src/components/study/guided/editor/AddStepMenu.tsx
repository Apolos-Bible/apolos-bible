import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { STEP_KINDS } from '@/lib/study/guidedStepKinds'
import type { GuidedStepKind } from '@/lib/study/guidedApi'

/**
 * One button that opens the whole catalogue of step kinds, each with a line
 * saying what it is for.
 *
 * Ten kinds as ten bare chips would be a wall of words nobody reads; a list
 * with explanations is where someone writing their first study actually learns
 * that "Contexto" and "Enseñanza" are different things.
 */
export function AddStepMenu({ onPick }: { onPick: (kind: GuidedStepKind) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1 rounded-md border border-accent bg-accent/10 px-2 py-1 text-2xs font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        <Plus className="h-3 w-3" />
        {t('path.addStep')}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <ul className="max-h-80 overflow-y-auto py-1">
            {STEP_KINDS.map(({ kind, Icon }) => (
              <li key={kind}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onPick(kind)
                    setOpen(false)
                  }}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-bg-tertiary"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-text-primary">
                      {t(`guided.kind.${kind}`)}
                    </span>
                    <span className="mt-0.5 block text-2xs leading-relaxed text-text-muted">
                      {t(`path.kindHint.${kind}`)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
