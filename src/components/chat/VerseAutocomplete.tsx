import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import type { ApiSearchResult } from '@/lib/bibleApi'

interface Props {
  query:     string
  results:   ApiSearchResult[]
  loading:   boolean
  activeIdx: number
  onSelect:  (r: ApiSearchResult) => void
  onHover:   (idx: number) => void
}

export function VerseAutocomplete({ query, results, loading, activeIdx, onSelect, onHover }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border-subtle flex items-center gap-1.5">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-accent shrink-0">
          <circle cx="6.5" cy="6.5" r="4" />
          <path d="M11 11l3 3" strokeLinecap="round" />
        </svg>
        <span className="text-2xs text-text-muted">
          {query.trim() ? <>Buscando <span className="text-text-primary font-medium">"{query.trim()}"</span></> : 'Escribe una referencia o palabras del versículo…'}
        </span>
      </div>

      <div className="max-h-52 overflow-y-auto">
        {loading && (
          <div className="px-3 py-3 text-xs text-text-muted text-center">Buscando…</div>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <div className="px-3 py-3 text-xs text-text-muted text-center">Sin resultados</div>
        )}

        {results.map((r, i) => (
          <button
            key={r.id}
            ref={i === activeIdx ? activeRef : null}
            type="button"
            onMouseEnter={() => onHover(i)}
            onClick={() => onSelect(r)}
            className={cn(
              'w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors',
              i === activeIdx ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary',
            )}
          >
            <span className="text-xs font-medium text-accent">
              {r.book} {r.chapter}:{r.verse}
            </span>
            <span className="text-xs text-text-muted line-clamp-2 leading-snug">
              {r.text}
            </span>
          </button>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t border-border-subtle flex items-center gap-3">
        <span className="text-2xs text-text-muted">↑↓ navegar</span>
        <span className="text-2xs text-text-muted">↵ insertar</span>
        <span className="text-2xs text-text-muted">Esc cerrar</span>
      </div>
    </div>
  )
}
