import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import { useNoteStore } from '../useNoteStore'
import type { Note } from '../useNoteStore'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const mockNote: Note = {
  id: 1,
  verse_id: 100,
  body: 'Great verse',
  created_at: '2024-01-01T00:00:00Z',
  is_public: false,
  note_type: 'note',
  user: { id: 10, name: 'Alice', email: 'alice@test.com' },
}

const mockReply: Note = {
  id: 2,
  parent_id: 1,
  verse_id: 100,
  body: 'I agree',
  created_at: '2024-01-02T00:00:00Z',
  is_public: false,
  note_type: 'note',
  user: { id: 11, name: 'Bob', email: 'bob@test.com' },
}

beforeEach(() => {
  vi.clearAllMocks()
  useNoteStore.setState({
    notes: {},
    loading: {},
  })
})

describe('useNoteStore', () => {
  it('starts with empty notes', () => {
    expect(useNoteStore.getState().notes).toEqual({})
    expect(useNoteStore.getState().loading).toEqual({})
  })

  it('loads notes for a verse', async () => {
    mockApi.get.mockResolvedValueOnce([mockNote])
    await useNoteStore.getState().loadNotes(100)
    const state = useNoteStore.getState()
    expect(state.notes[100]).toHaveLength(1)
    expect(state.notes[100][0].body).toBe('Great verse')
    expect(state.loading[100]).toBe(false)
    expect(mockApi.get).toHaveBeenCalledWith('/api/verses/100/notes')
  })

  it('loadNotes handles errors', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Fail'))
    await useNoteStore.getState().loadNotes(100)
    expect(useNoteStore.getState().loading[100]).toBe(false)
  })

  it('addNote sends to API and appends to store', async () => {
    mockApi.post.mockResolvedValueOnce(mockNote)
    await useNoteStore.getState().addNote(100, 'Great verse')
    expect(useNoteStore.getState().notes[100]).toHaveLength(1)
    expect(useNoteStore.getState().notes[100][0].body).toBe('Great verse')
    expect(mockApi.post).toHaveBeenCalledWith('/api/verses/100/notes', {
      body: 'Great verse',
      is_public: false,
      parent_id: null,
      note_type: 'note',
    })
  })

  it('addNote with parentId (reply)', async () => {
    mockApi.post.mockResolvedValueOnce(mockReply)
    await useNoteStore.getState().addNote(100, 'I agree', 1, false, 'note')
    expect(useNoteStore.getState().notes[100][0].parent_id).toBe(1)
  })

  it('updateNote patches and updates existing note', async () => {
    const updated = { ...mockNote, body: 'Updated body' }
    mockApi.patch.mockResolvedValueOnce(updated)

    useNoteStore.setState({ notes: { 100: [mockNote] } })
    await useNoteStore.getState().updateNote(100, 1, 'Updated body')

    expect(useNoteStore.getState().notes[100][0].body).toBe('Updated body')
    expect(mockApi.patch).toHaveBeenCalledWith('/api/notes/1', { body: 'Updated body', note_type: 'note' })
  })

  it('toggleNoteVisibility flips is_public', async () => {
    mockApi.patch.mockResolvedValueOnce(undefined)

    useNoteStore.setState({ notes: { 100: [mockNote] } })
    await useNoteStore.getState().toggleNoteVisibility(100, 1)

    expect(useNoteStore.getState().notes[100][0].is_public).toBe(true)
  })

  it('updateNoteType changes note_type', async () => {
    mockApi.patch.mockResolvedValueOnce(undefined)

    useNoteStore.setState({ notes: { 100: [mockNote] } })
    await useNoteStore.getState().updateNoteType(100, 1, 'prayer')

    expect(useNoteStore.getState().notes[100][0].note_type).toBe('prayer')
    expect(mockApi.patch).toHaveBeenCalledWith('/api/notes/1', { note_type: 'prayer' })
  })

  it('deleteNote removes note and its replies', async () => {
    mockApi.delete.mockResolvedValueOnce(undefined)

    useNoteStore.setState({ notes: { 100: [mockNote, mockReply] } })
    await useNoteStore.getState().deleteNote(100, 1)

    expect(useNoteStore.getState().notes[100]).toHaveLength(0)
    expect(mockApi.delete).toHaveBeenCalledWith('/api/notes/1')
  })

  it('likeNote sets is_liked and updates count', async () => {
    mockApi.post.mockResolvedValueOnce({ likes_count: 5 })

    useNoteStore.setState({ notes: { 100: [{ ...mockNote, likes_count: 4, is_liked: false }] } })
    await useNoteStore.getState().likeNote(100, 1)

    expect(useNoteStore.getState().notes[100][0].is_liked).toBe(true)
    expect(useNoteStore.getState().notes[100][0].likes_count).toBe(5)
    expect(mockApi.post).toHaveBeenCalledWith('/api/notes/1/like', {})
  })

  it('unlikeNote sets is_liked to false', async () => {
    mockApi.delete.mockResolvedValueOnce({ likes_count: 3 })

    useNoteStore.setState({ notes: { 100: [{ ...mockNote, likes_count: 4, is_liked: true }] } })
    await useNoteStore.getState().unlikeNote(100, 1)

    expect(useNoteStore.getState().notes[100][0].is_liked).toBe(false)
    expect(useNoteStore.getState().notes[100][0].likes_count).toBe(3)
  })
})
