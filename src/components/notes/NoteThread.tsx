import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNoteStore } from '@/lib/store/useNoteStore'
import type { Note } from '@/lib/store/useNoteStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useUIStore } from '@/lib/store/useUIStore'
import NoteItem from './NoteItem'

interface NoteThreadProps {
  verseApiId: number
}

export default function NoteThread({ verseApiId }: NoteThreadProps) {
  const { t } = useTranslation()
  const rawNotes = useNoteStore((s) => s.notes[verseApiId])
  const loading = useNoteStore((s) => s.loading[verseApiId] ?? false)
  const loadNotes = useNoteStore((s) => s.loadNotes)
  const user = useAuthStore((s) => s.user)
  const showOthersNotes = useUIStore((s) => s.showOthersNotes)

  const notes = rawNotes ?? []
  const filteredNotes = showOthersNotes
    ? notes.filter((n) => n.user?.id === user?.id || n.is_public)
    : notes.filter((n) => n.user?.id === user?.id)
  const noteTree = buildNoteTree(filteredNotes)

  const allNoteIds = new Set(notes.map((n) => n.id))
  const visibleIds = new Set(filteredNotes.map((n) => n.id))
  const hiddenParentIds = new Set(
    notes
      .filter((n) => n.parent_id && !visibleIds.has(n.parent_id) && allNoteIds.has(n.parent_id))
      .map((n) => n.parent_id!),
  )

  useEffect(() => {
    if (user) loadNotes(verseApiId)
  }, [verseApiId, user, loadNotes])

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className="text-xs text-text-muted text-center py-6">
          {t('notes.signInToView')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <p className="text-xs text-text-muted text-center py-6">{t('notes.loadingNotes')}</p>
      ) : noteTree.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-6">
          {t('notes.firstNote')}
        </p>
      ) : (
        <div className="px-4 py-2">
          {noteTree.map((note) => (
            <NoteItem key={note.id} note={note} verseApiId={verseApiId} hiddenParentIds={hiddenParentIds} />
          ))}
        </div>
      )}
    </div>
  )
}

function buildNoteTree(notes: Note[]): Note[] {
  const byId = new Map<number, Note>()
  const rootById = new Map<number, Note>()
  const roots: Note[] = []

  for (const note of notes) {
    byId.set(note.id, { ...note, replies: [] })
  }

  for (const note of byId.values()) {
    const root = findRoot(note, byId)
    rootById.set(note.id, root)

    if (root.id === note.id) {
      roots.push(note)
    }
  }

  for (const note of byId.values()) {
    const root = rootById.get(note.id)
    if (root && root.id !== note.id) {
      root.replies!.push(note)
    }
  }

  return roots
}

function findRoot(note: Note, byId: Map<number, Note>): Note {
  let current = note
  const seen = new Set<number>()

  while (current.parent_id && byId.has(current.parent_id) && !seen.has(current.parent_id)) {
    seen.add(current.id)
    current = byId.get(current.parent_id)!
  }

  return current
}
