import { create } from 'zustand'
import { api } from '@/lib/api'

export interface Note {
  id: number
  parent_id?: number | null
  verse_id?: number
  body: string
  created_at: string
  user?: { id: number; name: string; email: string }
  likes_count?: number
  is_liked?: boolean
  replies?: Note[]
}

interface NoteState {
  notes: Record<number, Note[]>   // keyed by numeric verse id
  loading: Record<number, boolean>
  loadNotes: (verseApiId: number) => Promise<void>
  addNote: (verseApiId: number, body: string, parentId?: number) => Promise<void>
  updateNote: (verseApiId: number, noteId: number, body: string) => Promise<void>
  deleteNote: (verseApiId: number, noteId: number) => Promise<void>
  likeNote: (verseApiId: number, noteId: number) => Promise<void>
  unlikeNote: (verseApiId: number, noteId: number) => Promise<void>
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: {},
  loading: {},

  loadNotes: async (verseApiId) => {
    set(s => ({ loading: { ...s.loading, [verseApiId]: true } }))
    try {
      const notes = await api.get<Note[]>(`/api/verses/${verseApiId}/notes`)
      set(s => ({
        notes: { ...s.notes, [verseApiId]: notes },
        loading: { ...s.loading, [verseApiId]: false },
      }))
    } catch {
      set(s => ({ loading: { ...s.loading, [verseApiId]: false } }))
    }
  },

  addNote: async (verseApiId, body, parentId) => {
    const note = await api.post<Note>(`/api/verses/${verseApiId}/notes`, { body, parent_id: parentId ?? null })
    set(s => ({
      notes: { ...s.notes, [verseApiId]: [...(s.notes[verseApiId] ?? []), note] },
    }))
  },

  updateNote: async (verseApiId, noteId, body) => {
    const updated = await api.patch<Note>(`/api/notes/${noteId}`, { body })
    set(s => ({
      notes: {
        ...s.notes,
        [verseApiId]: s.notes[verseApiId]?.map(n => n.id === noteId ? { ...n, ...updated, user: updated.user ?? n.user } : n) ?? [],
      },
    }))
  },

  deleteNote: async (verseApiId, noteId) => {
    await api.delete(`/api/notes/${noteId}`)
    set(s => ({
      notes: {
        ...s.notes,
        [verseApiId]: removeNoteAndReplies(s.notes[verseApiId] ?? [], noteId),
      },
    }))
  },

  likeNote: async (verseApiId, noteId) => {
    const res = await api.post<{ likes_count: number }>(`/api/notes/${noteId}/like`, {})
    set(s => ({
      notes: {
        ...s.notes,
        [verseApiId]: s.notes[verseApiId]?.map(n =>
          n.id === noteId ? { ...n, is_liked: true, likes_count: res.likes_count } : n,
        ) ?? [],
      },
    }))
  },

  unlikeNote: async (verseApiId, noteId) => {
    const res = await api.delete<{ likes_count: number } | undefined>(`/api/notes/${noteId}/like`)
    set(s => ({
      notes: {
        ...s.notes,
        [verseApiId]: s.notes[verseApiId]?.map(n =>
          n.id === noteId ? { ...n, is_liked: false, likes_count: res?.likes_count ?? (n.likes_count ?? 1) - 1 } : n,
        ) ?? [],
      },
    }))
  },
}))

function removeNoteAndReplies(notes: Note[], noteId: number): Note[] {
  const childIds = new Set<number>()
  let changed = true

  while (changed) {
    changed = false
    for (const note of notes) {
      if (note.parent_id === noteId || (note.parent_id != null && childIds.has(note.parent_id))) {
        if (!childIds.has(note.id)) {
          childIds.add(note.id)
          changed = true
        }
      }
    }
  }

  return notes.filter(note => note.id !== noteId && !childIds.has(note.id))
}
