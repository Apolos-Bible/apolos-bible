import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Note } from '@/lib/store/useNoteStore'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { cn } from '@/lib/cn'
import NoteEditor from '@/components/notes/NoteEditor'

interface NoteItemProps {
  note: Note
  verseApiId: number
}

export default function NoteItem({ note, verseApiId }: NoteItemProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const addToast = useUIStore((s) => s.addToast)

  function formatRelativeTime(isoString: string): string {
    const now = Date.now()
    const diffMs   = now - new Date(isoString).getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHrs  = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHrs / 24)

    if (diffSecs < 60)  return t('time.justNow')
    if (diffMins < 60)  return t('time.minutes', { count: diffMins })
    if (diffHrs  < 24)  return t('time.hours',   { count: diffHrs })
    if (diffDays === 1) return t('time.yesterday')
    if (diffDays < 30)  return t('time.days',    { count: diffDays })
    const diffMonths = Math.floor(diffDays / 30)
    if (diffMonths < 12) return t('time.months', { count: diffMonths })
    return t('time.years', { count: Math.floor(diffMonths / 12) })
  }

  async function handleSave(body: string) {
    try {
      await updateNote(verseApiId, note.id, body)
      setIsEditing(false)
    } catch {
      addToast(t('notes.updateFailed'), 'error')
    }
  }

  async function handleDelete() {
    try {
      await deleteNote(verseApiId, note.id)
      addToast(t('toast.noteDeleted'), 'info')
    } catch {
      addToast(t('notes.deleteFailed'), 'error')
    }
  }

  const authorName = note.user?.name ?? note.user?.email ?? 'Unknown'
  const relativeTime = formatRelativeTime(note.created_at)

  return (
    <div className="bg-bg-tertiary rounded-lg p-3 group relative">
      {isEditing ? (
        <NoteEditor
          initialValue={note.body}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">
            {note.body}
          </p>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-muted">{authorName}</span>
              <span className="text-[10px] text-text-muted">·</span>
              <span className="text-[10px] text-text-muted">{relativeTime}</span>
            </div>

            <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity')}>
              {confirmingDelete ? (
                <>
                  <span className="text-[10px] text-text-muted mr-1">{t('notes.confirmDelete')}</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-[10px] px-1.5 py-0.5 rounded text-red-400 hover:bg-red-400/10 transition-colors font-medium"
                  >
                    {t('notes.deleteYes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-text-secondary hover:bg-bg-primary transition-colors"
                  >
                    {t('notes.deleteNo')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
                  >
                    {t('notes.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    {t('notes.delete')}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
