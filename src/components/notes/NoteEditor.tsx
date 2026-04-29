import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

interface NoteEditorProps {
  initialValue: string
  onSave: (content: string) => void
  onCancel: () => void
}

export default function NoteEditor({ initialValue, onSave, onCancel }: NoteEditorProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    adjustHeight(el)
  }, [])

  function adjustHeight(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    adjustHeight(e.target)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canSave) onSave(content.trim())
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const canSave = content.trim().length > 0 && content.trim() !== initialValue.trim()

  return (
    <div
      className={cn(
        'bg-bg-primary rounded-md p-2 border border-border-subtle',
        'focus-within:border-accent transition-colors',
      )}
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={2}
        className={cn(
          'w-full resize-none bg-transparent text-sm text-text-primary',
          'placeholder:text-text-muted outline-none min-h-[60px]',
          'leading-relaxed',
        )}
        placeholder={t('notes.editorPlaceholder')}
      />
      <div className="flex items-center justify-end gap-2 mt-1.5">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'text-xs px-2.5 py-1 rounded text-text-secondary',
            'hover:text-text-primary hover:bg-bg-tertiary transition-colors',
          )}
        >
          {t('notes.cancel')}
        </button>
        <button
          type="button"
          onClick={() => onSave(content.trim())}
          disabled={!canSave}
          className={cn(
            'text-xs px-2.5 py-1 rounded font-medium transition-colors',
            canSave
              ? 'bg-accent text-bg-primary hover:brightness-110'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
          )}
        >
          {t('notes.save')}
        </button>
      </div>
    </div>
  )
}
