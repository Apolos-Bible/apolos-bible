import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'
import { useIsMobile } from '@/lib/useIsMobile'

interface NoteInputProps {
  verseApiId: number
}

export interface NoteInputHandle {
  focus: () => void
}

const NoteInput = forwardRef<NoteInputHandle, NoteInputProps>(
  function NoteInput({ verseApiId }, ref) {
    const { t } = useTranslation()
    const [content, setContent] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const addNote = useNoteStore((s) => s.addNote)
    const addToast = useUIStore((s) => s.addToast)
    const isMobile = useIsMobile()

    useImperativeHandle(ref, () => ({
      focus() {
        textareaRef.current?.focus()
      },
    }))

    function adjustHeight(el: HTMLTextAreaElement) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      setContent(e.target.value)
      adjustHeight(e.target)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }

    async function handleSubmit() {
      const trimmed = content.trim()
      if (!trimmed || submitting) return
      setSubmitting(true)
      try {
        await addNote(verseApiId, trimmed)
        addToast(t('notes.saved'), 'success')
        setContent('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      } catch {
        addToast(t('notes.saveFailed'), 'error')
      } finally {
        setSubmitting(false)
      }
    }

    const canSubmit = content.trim().length > 0 && !submitting

    return (
      <div className="border-t border-border-subtle px-4 py-3 bg-bg-secondary">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isMobile ? t('notes.placeholder') : t('notes.placeholderDesktop', { modKey })}
          className={cn(
            'w-full resize-none bg-bg-primary rounded-md border border-border-subtle',
            'text-sm text-text-primary placeholder:text-text-muted',
            'px-3 py-2 outline-none min-h-[40px] max-h-[120px] leading-relaxed',
            'focus:border-accent transition-colors',
          )}
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'text-xs px-3 py-1.5 rounded font-medium transition-colors',
              canSubmit
                ? 'bg-accent text-bg-primary hover:brightness-110'
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
            )}
          >
            {submitting ? t('notes.saving') : t('notes.addNote')}
          </button>
        </div>
      </div>
    )
  },
)

export default NoteInput
