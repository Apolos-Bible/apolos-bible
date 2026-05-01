import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { cn } from '@/lib/cn'
import { modKey } from '@/lib/platform'
import { useIsMobile } from '@/lib/useIsMobile'

interface NoteInputProps {
  verseApiId?: number
  verseApiIds?: number[]
}

export default function NoteInput({ verseApiId, verseApiIds }: NoteInputProps) {
  const { t } = useTranslation()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const addNote = useNoteStore((s) => s.addNote)
  const addToast = useUIStore((s) => s.addToast)
  const openAuthModal = useUIStore((s) => s.openAuthModal)
  const user = useAuthStore((s) => s.user)
  const isMobile = useIsMobile()
  const targetVerseApiIds = verseApiIds ?? (verseApiId ? [verseApiId] : [])
  const isGroupNote = targetVerseApiIds.length > 1

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((s) => s[0].toUpperCase()).join('')
    : user?.email?.[0]?.toUpperCase() ?? '?'

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || submitting || targetVerseApiIds.length === 0) return
    if (!user) {
      addToast(t('study.loginRequired'), 'error', {
        action: { label: t('auth.logIn'), onClick: openAuthModal },
      })
      openAuthModal()
      return
    }
    setSubmitting(true)
    try {
      await Promise.all(targetVerseApiIds.map((id) => addNote(id, trimmed)))
      addToast(isGroupNote ? t('notes.savedForVerses', { count: targetVerseApiIds.length }) : t('notes.saved'), 'success')
      setContent('')
    } catch {
      addToast(t('notes.saveFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border-t border-border-subtle px-4 py-3 bg-bg-secondary">
      <div className="flex gap-2.5 items-start">
        <span className="shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-semibold text-accent select-none">
          {user ? initials : '?'}
        </span>
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            readOnly={!user}
            onFocus={() => {
              if (!user) openAuthModal()
            }}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              !user
                ? t('study.loginRequired')
                : isGroupNote
                  ? t('notes.groupPlaceholder', { count: targetVerseApiIds.length })
                  : isMobile
                    ? t('notes.placeholder')
                    : t('notes.placeholderDesktop', { modKey })
            }
            className={cn(
              'w-full resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted',
              'outline-none min-h-[24px] max-h-[120px] leading-relaxed',
              !user && 'cursor-not-allowed opacity-60',
            )}
          />
          {content.trim() && (
            <div className="flex justify-end mt-1.5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!user || !content.trim() || submitting}
                className={cn(
                  'text-xs font-medium transition-colors',
                  user && content.trim() && !submitting
                    ? 'text-accent hover:text-accent/80'
                    : 'text-text-muted cursor-not-allowed',
                )}
              >
                {submitting ? t('notes.saving') : t('notes.addNote')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
