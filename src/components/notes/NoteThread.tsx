import { useEffect } from 'react'
import { useNoteStore } from '@/lib/store/useNoteStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import NoteItem from './NoteItem'

interface NoteThreadProps {
  verseApiId: number
}

export default function NoteThread({ verseApiId }: NoteThreadProps) {
  const rawNotes = useNoteStore((s) => s.notes[verseApiId])
  const loading = useNoteStore((s) => s.loading[verseApiId] ?? false)
  const loadNotes = useNoteStore((s) => s.loadNotes)
  const user = useAuthStore((s) => s.user)

  const notes = rawNotes ?? []

  useEffect(() => {
    if (user) loadNotes(verseApiId)
  }, [verseApiId, user, loadNotes])

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className="text-xs text-text-muted text-center py-6">
          Inicia sesión para ver y agregar notas
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <p className="text-xs text-text-muted text-center py-6">Cargando notas…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-6">
          Sin notas aún — agrega la primera
        </p>
      ) : (
        <div className="px-4 py-2">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} verseApiId={verseApiId} />
          ))}
        </div>
      )}
    </div>
  )
}
