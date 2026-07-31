import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, FileText, Globe2, Lock, X } from 'lucide-react'
import NoteEditor from '@/components/notes/NoteEditor'
import { NOTE_TYPE_LIST, getNoteTypeDef, type NoteType } from '@/lib/noteTypes'
import { cn } from '@/lib/cn'

export interface EditableUserNote {
  id: number
  body: string
  created_at: string
  is_public: boolean
  note_type: NoteType
  verse: {
    id: number
    number: number
    text: string
    chapter: number
    book: string
    slug: string
  }
}

interface NoteDocumentModalProps {
  note: EditableUserNote
  onClose: () => void
  onOpenVerse: () => void
  onSave: (body: string, noteType: NoteType, isPublic: boolean) => Promise<void>
}

export function NoteDocumentModal({ note, onClose, onOpenVerse, onSave }: NoteDocumentModalProps) {
  const { t } = useTranslation()
  const [noteType, setNoteType] = useState<NoteType>(note.note_type)
  const [isPublic, setIsPublic] = useState(note.is_public)
  const [dirty, setDirty] = useState(false)
  const metadataDirty = noteType !== note.note_type || isPublic !== note.is_public
  const typeDef = getNoteTypeDef(noteType)

  const attemptClose = () => {
    if ((dirty || metadataDirty) && !window.confirm(t('notes.editor.discardConfirm'))) return
    onClose()
  }

  const attemptOpenPassage = () => {
    if ((dirty || metadataDirty) && !window.confirm(t('notes.editor.discardConfirm'))) return
    onOpenVerse()
  }

  const handleModalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Let controls inside the editor handle the key first, then keep it from
    // reaching the reader and other global shortcuts behind the modal.
    const closeShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'w'
    if ((event.key === 'Escape' || closeShortcut) && !event.defaultPrevented) {
      event.preventDefault()
      attemptClose()
    }
    event.stopPropagation()
  }

  const modal = (
    <div
      className="note-document-enter absolute inset-0 z-[120] flex flex-col bg-bg-primary"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-document-title"
      onKeyDown={handleModalKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <header className="shrink-0 border-b border-border-subtle bg-bg-secondary">
        <div className="flex min-h-16 items-center gap-3 px-3 md:px-6">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-primary', typeDef.indicatorClass)}>
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-text-muted">{t('notes.editor.document')}</p>
            <h1 id="note-document-title" className="truncate text-base font-bold text-text-primary md:text-lg">{note.verse.book} {note.verse.chapter}:{note.verse.number}</h1>
          </div>
          <button type="button" onClick={attemptOpenPassage} className="hidden h-10 items-center gap-2 rounded-xl border border-border-subtle bg-bg-primary px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-accent/35 hover:text-accent sm:flex"><BookOpen className="h-4 w-4" />{t('notes.editor.openPassage')}</button>
          <button type="button" onClick={attemptClose} aria-label={t('common.close')} className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"><X className="h-5 w-5" /></button>
        </div>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-t border-border-subtle px-3 py-2 md:px-6">
          {NOTE_TYPE_LIST.map((candidate) => (
            <button key={candidate.type} type="button" onClick={() => setNoteType(candidate.type)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-2xs font-semibold transition-all', noteType === candidate.type ? `border-accent/30 ${candidate.bgClass} ${candidate.indicatorClass}` : 'border-border-subtle text-text-muted hover:border-border-strong hover:text-text-secondary')}>
              <candidate.icon />{t(candidate.labelKey as any)}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-border-subtle" />
          <button type="button" onClick={() => setIsPublic((value) => !value)} className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-2xs font-semibold transition-all', isPublic ? 'border-accent/35 bg-accent/10 text-accent' : 'border-border-subtle text-text-muted hover:border-border-strong hover:text-text-secondary')}>
            {isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{isPublic ? t('notes.public') : t('notes.private')}
          </button>
          <button type="button" onClick={attemptOpenPassage} className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border-subtle px-3 text-2xs font-semibold text-text-muted sm:hidden"><BookOpen className="h-3.5 w-3.5" />{t('notes.editor.openPassage')}</button>
        </div>
      </header>

      <NoteEditor
        initialValue={note.body}
        variant="document"
        documentContext={(
          <aside className="mb-8 border-l-2 border-accent/40 pl-4 md:mb-10 md:pl-5">
            <div className="mb-2 flex items-center gap-2 text-accent">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-[0.08em]">
                {note.verse.book} {note.verse.chapter}:{note.verse.number}
              </span>
            </div>
            <p className="font-reading text-[15px] italic leading-relaxed text-text-secondary md:text-base">
              “{note.verse.text}”
            </p>
          </aside>
        )}
        externalDirty={metadataDirty}
        onDirtyChange={setDirty}
        onCancel={onClose}
        onSave={(body) => onSave(body, noteType, isPublic)}
      />
    </div>
  )

  return createPortal(modal, document.getElementById('root') ?? document.body)
}
