import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

type SelectValue = string | number

export interface SelectOption<T extends SelectValue> {
  value: T
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

interface SelectProps<T extends SelectValue> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  placeholder?: ReactNode
  disabled?: boolean
  className?: string
  buttonClassName?: string
  searchable?: boolean
  searchPlaceholder?: string
}

/**
 * Reusable single-value listbox with keyboard navigation.
 * Keeps focus on the trigger and exposes the active option through
 * aria-activedescendant so it behaves consistently across desktop and mobile.
 */
export function Select<T extends SelectValue>({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  className,
  buttonClassName,
  searchable = false,
  searchPlaceholder = 'Search…',
}: SelectProps<T>) {
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(0, options.findIndex((option) => Object.is(option.value, value)))
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const selectedOption = options.find((option) => Object.is(option.value, value))
  const filteredOptions = searchable && query.trim()
    ? options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
  }, [open, searchable])

  const nextEnabled = (start: number, direction: 1 | -1) => {
    if (filteredOptions.length === 0) return 0

    let index = start
    for (let step = 0; step < options.length; step += 1) {
      index = (index + direction + filteredOptions.length) % filteredOptions.length
      if (!filteredOptions[index]?.disabled) return index
    }
    return start
  }

  const selectIndex = (index: number) => {
    const option = filteredOptions[index]
    if (!option || option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        if (!open) {
          setOpen(true)
          setActiveIndex(selectedIndex)
        } else {
          setActiveIndex((current) => nextEnabled(current, direction))
        }
        break
      }
      case 'Home':
        if (open) {
          event.preventDefault()
          setActiveIndex(nextEnabled(options.length - 1, 1))
        }
        break
      case 'End':
        if (open) {
          event.preventDefault()
          setActiveIndex(nextEnabled(0, -1))
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) selectIndex(activeIndex)
        else setOpen(true)
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        role="combobox"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        onClick={() => {
          setQuery('')
          setOpen((current) => !current)
          setActiveIndex(selectedIndex)
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-xl border border-border-subtle bg-bg-secondary px-3.5 text-left text-sm text-text-primary outline-none transition-colors',
          'hover:bg-bg-tertiary focus:border-accent/60 focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50',
          buttonClassName,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.6}
          className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-border-subtle bg-bg-secondary p-1.5 shadow-xl"
        >
          {searchable && (
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActiveIndex((current) => nextEnabled(current, event.key === 'ArrowDown' ? 1 : -1))
                }
                if (event.key === 'Enter' && filteredOptions.length > 0) { event.preventDefault(); selectIndex(activeIndex) }
              }}
              placeholder={searchPlaceholder}
              aria-label={`${ariaLabel} search`}
              className="mb-1.5 h-9 w-full rounded-xl border border-border-subtle bg-bg-primary px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent/60"
            />
          )}
          {filteredOptions.map((option, index) => {
            const selected = Object.is(option.value, value)
            const active = index === activeIndex

            return (
              <button
                key={String(option.value)}
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectIndex(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors',
                  active ? 'bg-bg-tertiary' : 'hover:bg-bg-tertiary/70',
                  option.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', selected ? 'font-medium text-accent' : 'text-text-primary')}>
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="mt-0.5 block truncate text-xs text-text-muted">{option.description}</span>
                  )}
                </span>
                <Check
                  size={15}
                  strokeWidth={1.8}
                  className={cn('shrink-0 text-accent', !selected && 'invisible')}
                />
              </button>
            )
          })}
          {filteredOptions.length === 0 && <p className="px-3 py-2 text-xs text-text-muted">No results</p>}
        </div>
      )}
    </div>
  )
}
