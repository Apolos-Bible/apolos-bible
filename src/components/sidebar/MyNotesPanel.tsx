import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, BookOpen, FileText, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { api } from '@/lib/api'
import { PanelHeader } from '@/components/layout/PanelHeader'
import { NoteDocumentModal, type EditableUserNote } from '@/components/notes/NoteDocumentModal'
import { getNoteTypeDef, type NoteType } from '@/lib/noteTypes'
import { noteToPlainText } from '@/lib/richNotes'
import { cn } from '@/lib/cn'

type UserNoteResponse = Omit<EditableUserNote, 'note_type'> & { note_type?: NoteType | null }

export function MyNotesPanel() {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const openVerse = useVerseStore((state) => state.openVerse)
  const closePanel = useUIStore((state) => state.closePanel)
  const addToast = useUIStore((state) => state.addToast)
  const [notes, setNotes] = useState<EditableUserNote[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editingNote, setEditingNote] = useState<EditableUserNote | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    api.get<UserNoteResponse[]>('/api/user/notes')
      .then((items) => setNotes(items.map((note) => ({ ...note, note_type: note.note_type ?? 'note' }))))
      .catch(() => addToast(t('notes.loadFailed'), 'error'))
      .finally(() => setLoading(false))
  }, [addToast, t, user])

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return notes
    return notes.filter((note) => [
      noteToPlainText(note.body),
      note.verse.book,
      `${note.verse.chapter}:${note.verse.number}`,
      note.verse.text,
    ].some((value) => value.toLocaleLowerCase().includes(normalized)))
  }, [notes, query])

  if (!user) return (
    <div className="flex flex-1 items-center justify-center px-6">
      <p className="text-center text-sm text-text-muted">{t('notes.signInPrompt')}</p>
    </div>
  )

  const openPassage = (note: EditableUserNote) => {
    setEditingNote(null)
    void openVerse(note.verse.slug, note.verse.chapter, note.verse.number)
    closePanel()
  }

  const saveNote = async (note: EditableUserNote, body: string, noteType: NoteType, isPublic: boolean) => {
    try {
      const updated = await api.patch<Partial<EditableUserNote>>(`/api/notes/${note.id}`, {
        body,
        note_type: noteType,
        is_public: isPublic,
      })
      setNotes((current) => current.map((item) => item.id === note.id
        ? { ...item, ...updated, body, note_type: noteType, is_public: isPublic, verse: item.verse }
        : item))
      setEditingNote(null)
      addToast(t('notes.saved'), 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : t('notes.updateFailed'), 'error')
      throw error
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg-secondary">
      <PanelHeader title={t('nav.myNotes')} onClose={closePanel} closeLabel={t('common.close')} />

      <div className="border-b border-border-subtle px-4 pb-4 pt-3">
        <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.12] via-bg-primary to-bg-secondary p-4 shadow-lg shadow-accent/5">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/15 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent"><FileText className="h-5 w-5" /></span>
            <div className="min-w-0">
              <strong className="block text-sm text-text-primary">{t('notes.libraryTitle')}</strong>
              <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{t('notes.libraryHint')}</p>
            </div>
          </div>
          <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-secondary/80 px-3 backdrop-blur">
            <Search className="h-4 w-4 shrink-0 text-text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t('notes.search')} placeholder={t('notes.searchPlaceholder')} className="h-10 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted" />
            {notes.length > 0 && <span className="rounded-full bg-bg-tertiary px-2 py-0.5 font-mono text-2xs text-text-muted">{filteredNotes.length}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="space-y-3" aria-label={t('common.loading')}>
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-border-subtle bg-bg-primary" />)}
          </div>
        ) : notes.length === 0 ? (
          <EmptyNotes title={t('notes.empty')} hint={t('notes.emptyHint')} />
        ) : filteredNotes.length === 0 ? (
          <EmptyNotes title={t('notes.noSearchResults')} hint={t('notes.noSearchResultsHint')} />
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => {
              const typeDef = getNoteTypeDef(note.note_type)
              return (
                <article key={note.id} className={cn('note-enter note-surface group relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-lg', typeDef.bgClass)}>
                  <button type="button" onClick={() => setEditingNote(note)} className="w-full px-4 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary', typeDef.indicatorClass)}><typeDef.icon /></span>
                      <span className="truncate text-xs font-bold text-accent">{note.verse.book} {note.verse.chapter}:{note.verse.number}</span>
                      <span className="ml-auto text-2xs text-text-muted">{new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(note.created_at))}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-text-primary">{noteToPlainText(note.body)}</p>
                    <p className="mt-3 line-clamp-2 border-l-2 border-border-subtle pl-3 font-reading text-xs italic leading-relaxed text-text-muted">“{note.verse.text}”</p>
                    <span className="mt-3 flex items-center gap-1 text-2xs font-semibold text-text-muted transition-colors group-hover:text-accent">{t('notes.openEditor')}<ArrowUpRight className="h-3.5 w-3.5" /></span>
                  </button>
                  <button type="button" onClick={() => openPassage(note)} aria-label={t('notes.editor.openPassage')} className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary text-text-muted opacity-100 shadow-sm transition-all hover:border-accent/30 hover:text-accent focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"><BookOpen className="h-4 w-4" /></button>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {editingNote && (
        <NoteDocumentModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onOpenVerse={() => openPassage(editingNote)}
          onSave={(body, noteType, isPublic) => saveNote(editingNote, body, noteType, isPublic)}
        />
      )}
    </div>
  )
}

function EmptyNotes({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-bg-primary text-text-muted shadow-sm"><FileText className="h-6 w-6" /></span>
      <strong className="mt-4 text-sm text-text-primary">{title}</strong>
      <p className="mt-1 max-w-52 text-xs leading-relaxed text-text-muted">{hint}</p>
    </div>
  )
}
