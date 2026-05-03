import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
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
  const [isPublic, setIsPublic] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const addNote = useNoteStore((s) => s.addNote)
  const closeStudyPanel = useVerseStore((s) => s.closeStudyPanel)
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
      await Promise.all(targetVerseApiIds.map((id) => addNote(id, trimmed, undefined, isPublic)))
      addToast(isGroupNote ? t('notes.savedForVerses', { count: targetVerseApiIds.length }) : t('notes.saved'), 'success')
      setContent('')
      if (isGroupNote) closeStudyPanel()
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
            <div className="flex items-center justify-end gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={cn(
                  'text-[11px] transition-all duration-200',
                  isPublic ? 'text-accent' : 'text-text-muted hover:text-text-secondary',
                )}
                title={isPublic ? t('notes.public') : t('notes.private')}
              >
                {isPublic ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </button>
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
