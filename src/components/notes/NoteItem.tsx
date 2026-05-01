import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'
import type { Note } from '@/lib/store/useNoteStore'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { cn } from '@/lib/cn'
import NoteEditor from '@/components/notes/NoteEditor'

interface NoteItemProps {
  note: Note
  verseApiId: number
  depth?: number
  replyParentId?: number
  showReplyToggle?: boolean
  hiddenParentIds?: Set<number>
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

  if (diffSecs < 60) return i18n.t('time.now_short')
  if (diffMins < 60) return i18n.t('time.m_short', { count: diffMins })
  if (diffHrs < 24) return i18n.t('time.h_short', { count: diffHrs })
  if (diffDays === 1) return i18n.t('time.yesterday_short')
  if (diffDays < 30) return i18n.t('time.d_short', { count: diffDays })
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return i18n.t('time.mo_short', { count: diffMonths })
  return i18n.t('time.y_short', { count: Math.floor(diffMonths / 12) })
}

function ReplyInput({ onSubmit, onCancel }: { onSubmit: (body: string) => void; onCancel: () => void }) {
  const { t } = useTranslation()
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
        placeholder={t('notes.replyPlaceholder')}
        className="flex-1 bg-bg-primary rounded-md border border-border-subtle px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
      />
      <div className="flex gap-1 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] px-2 py-1 rounded text-text-muted hover:text-text-secondary transition-colors"
        >
          {t('notes.cancel')}
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
          {submitting ? t('notes.sending') : t('notes.reply')}
        </button>
      </div>
    </div>
  )
}

export default function NoteItem({ note, verseApiId, depth = 0, replyParentId, showReplyToggle = true, hiddenParentIds }: NoteItemProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingPublish, setConfirmingPublish] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [repliesOpen, setRepliesOpen] = useState(false)

  useEffect(() => {
    if (!confirmingPublish) return
    const id = setTimeout(() => setConfirmingPublish(false), 3000)
    return () => clearTimeout(id)
  }, [confirmingPublish])

  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const addNote = useNoteStore((s) => s.addNote)
  const toggleNoteVisibility = useNoteStore((s) => s.toggleNoteVisibility)
  const likeNote = useNoteStore((s) => s.likeNote)
  const unlikeNote = useNoteStore((s) => s.unlikeNote)
  const addToast = useUIStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)

  const authorName = note.user?.name ?? note.user?.email ?? t('notes.unknownAuthor')
  const relativeTime = formatRelativeTime(note.created_at)
  const canManage = user?.id === note.user?.id
  const isOrphan = depth === 0 && note.parent_id != null && hiddenParentIds?.has(note.parent_id)

  async function handleSave(body: string) {
    if (!canManage) return
    try {
      await updateNote(verseApiId, note.id, body)
      setIsEditing(false)
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('notes.updateFailed'), 'error')
    }
  }

  async function handleDelete() {
    if (!canManage) return
    try {
      await deleteNote(verseApiId, note.id)
      addToast(t('toast.noteDeleted'), 'info')
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('notes.deleteFailed'), 'error')
    }
  }

  async function handleReply(body: string) {
    try {
      await addNote(verseApiId, body, replyParentId ?? note.id)
      setShowReply(false)
      setRepliesOpen(true)
      addToast(t('notes.saved'), 'success')
    } catch {
      addToast(t('notes.saveFailed'), 'error')
    }
  }

  return (
    <div className={cn('note-enter', depth > 0 && 'pl-4 border-l border-border-subtle')}>
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-text-primary">{authorName}</span>
                <span className="text-[10px] text-text-muted">{relativeTime}</span>
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmingPublish) {
                        toggleNoteVisibility(verseApiId, note.id)
                        setConfirmingPublish(false)
                      } else {
                        setConfirmingPublish(true)
                      }
                    }}
                    onBlur={() => setConfirmingPublish(false)}
                    className={cn(
                      'text-[9px] px-1.5 py-px rounded-full font-medium transition-all duration-200',
                      confirmingPublish
                        ? 'bg-red-400/10 text-red-400 border border-red-400/30'
                        : note.is_public
                          ? 'bg-accent/15 text-accent border border-accent/30'
                          : 'bg-bg-tertiary text-text-muted border border-border-subtle hover:border-accent/30 hover:text-text-secondary',
                    )}
                  >
                    {confirmingPublish
                      ? (note.is_public ? t('notes.unpublishConfirm') : t('notes.publishConfirm'))
                      : (note.is_public ? t('notes.public') : t('notes.private'))}
                  </button>
                ) : (
                  <span className="text-[9px] px-1.5 py-px rounded-full font-medium bg-accent/15 text-accent border border-accent/30">
                    {t('notes.public')}
                  </span>
                )}
              </div>

              {isOrphan && (
                <p className="text-[10px] text-text-muted italic mt-0.5">
                  {t('notes.replyToHidden')}
                </p>
              )}

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
                  {t('notes.reply')}
                </button>

                <div className="flex-1" />

                {canManage && (
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
                )}
              </div>
            </>
          )}

          {showReply && (
            <div className="mt-2">
              <ReplyInput onSubmit={handleReply} onCancel={() => setShowReply(false)} />
            </div>
          )}

          {showReplyToggle && note.replies && note.replies.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setRepliesOpen(!repliesOpen)}
                className="inline-flex items-center gap-2 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors"
              >
                <span className="h-px w-6 bg-border-subtle" aria-hidden="true" />
                {repliesOpen
                  ? t('notes.hideReplies')
                  : t('notes.viewReplies', { count: note.replies.length })}
              </button>

              {repliesOpen && (
                <div className="mt-2 space-y-1">
                  {note.replies.map((reply) => (
                    <NoteItem
                      key={reply.id}
                      note={reply}
                      verseApiId={verseApiId}
                      depth={1}
                      replyParentId={note.id}
                      showReplyToggle={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
