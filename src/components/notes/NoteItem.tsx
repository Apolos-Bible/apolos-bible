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
  depth?: number
}

function Avatar({ name, email }: { name: string; email?: string }) {
  const initials = (name || email || '?')
    .split(/[\s.@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('')

  return (
    <span className="shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-semibold text-accent select-none">
      {initials}
    </span>
  )
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const diffMs = now - new Date(isoString).getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffSecs < 60) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHrs < 24) return `${diffHrs}h`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays}d`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo`
  return `${Math.floor(diffMonths / 12)}y`
}

export default function NoteItem({ note, verseApiId, depth = 0 }: NoteItemProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [showReply, setShowReply] = useState(false)

  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const addNote = useNoteStore((s) => s.addNote)
  const likeNote = useNoteStore((s) => s.likeNote)
  const unlikeNote = useNoteStore((s) => s.unlikeNote)
  const addToast = useUIStore((s) => s.addToast)

  const authorName = note.user?.name ?? note.user?.email ?? 'Unknown'
  const relativeTime = formatRelativeTime(note.created_at)

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

  async function handleReply(body: string) {
    try {
      await addNote(verseApiId, body)
      setShowReply(false)
      addToast(t('notes.saved'), 'success')
    } catch {
      addToast(t('notes.saveFailed'), 'error')
    }
  }

  return (
    <div className={cn(depth > 0 && 'ml-8 pl-4 border-l-2 border-border-subtle')}>
      <div className="group flex gap-2.5 py-1.5">
        <Avatar name={authorName} email={note.user?.email} />

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <NoteEditor
              initialValue={note.body}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-text-primary">{authorName}</span>
                <span className="text-[10px] text-text-muted">{relativeTime}</span>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                {note.body}
              </p>

              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (note.is_liked) {
                      unlikeNote(verseApiId, note.id)
                    } else {
                      likeNote(verseApiId, note.id)
                    }
                  }}
                  className={cn(
                    'text-[11px] transition-colors',
                    note.is_liked ? 'text-fav' : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  {note.is_liked ? '♥' : '♡'} {(note.likes_count ?? 0) > 0 && note.likes_count}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReply(!showReply)}
                  className="text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors"
                >
                  Reply
                </button>

                <div className="flex-1" />

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        className="text-[10px] px-1.5 py-0.5 rounded text-text-muted hover:text-text-secondary hover:bg-bg-primary transition-colors"
                      >
                        {t('notes.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        className="text-[10px] px-1.5 py-0.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        {t('notes.delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {showReply && (
            <div className="mt-2">
              <ReplyInput onSubmit={handleReply} onCancel={() => setShowReply(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReplyInput({ onSubmit, onCancel }: { onSubmit: (body: string) => void; onCancel: () => void }) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    await onSubmit(trimmed)
    setSubmitting(false)
    setContent('')
  }

  return (
    <div className="flex gap-2 items-start">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Write a reply..."
        className="flex-1 bg-bg-primary rounded-md border border-border-subtle px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
      />
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] px-2 py-1 rounded text-text-muted hover:text-text-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className={cn(
            'text-[11px] px-2 py-1 rounded font-medium transition-colors',
            content.trim() && !submitting
              ? 'text-accent hover:bg-accent/10'
              : 'text-text-muted cursor-not-allowed',
          )}
        >
          {submitting ? '...' : 'Reply'}
        </button>
      </div>
    </div>
  )
}
