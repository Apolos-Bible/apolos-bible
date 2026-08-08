import { describe, it, expect, beforeEach, vi } from 'vitest'

const { mockPost, mockDelete } = vi.hoisted(() => ({
  mockPost: vi.fn().mockResolvedValue({ data: [] }),
  mockDelete: vi.fn().mockResolvedValue(undefined),
}))

const mockJoinError = vi.fn()
const mockJoinHere = vi.fn()
const mockJoinJoining = vi.fn()
const mockJoinLeaving = vi.fn()
const mockJoinListen = vi.fn()
const mockListenChain = { listen: mockJoinListen }
mockJoinListen.mockReturnValue(mockListenChain)
const mockAddToast = vi.fn()
const mockRecordActivity = vi.fn()
const mockClearActivity = vi.fn()
let reconnectListener: (() => void) | null = null

const mockJoinResult = {
  error: mockJoinError.mockReturnValue({
    here: mockJoinHere.mockReturnValue({
      joining: mockJoinJoining.mockReturnValue({
        leaving: mockJoinLeaving.mockReturnValue(mockListenChain),
      }),
    }),
  }),
}

const mockEcho = {
  join: vi.fn(() => mockJoinResult),
  leave: vi.fn(),
}

vi.mock('@/lib/echo', () => ({
  initEcho: vi.fn(() => mockEcho),
  getEcho: vi.fn(() => mockEcho),
  onEchoReconnect: vi.fn((listener: () => void) => {
    reconnectListener = listener
    return () => { reconnectListener = null }
  }),
}))

vi.mock('@/lib/api', () => ({ api: { post: mockPost, delete: mockDelete } }))

vi.mock('../useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addToast: mockAddToast,
    })),
  },
}))

vi.mock('../useFriendStore', () => ({
  useFriendStore: {
    getState: vi.fn(() => ({
      friends: [{ id: 2, name: 'Bob', email: 'bob@test.com' }],
    })),
  },
}))

vi.mock('../useActivityStore', () => ({
  useActivityStore: {
    getState: vi.fn(() => ({
      recordActivity: mockRecordActivity,
      clearAll: mockClearActivity,
    })),
  },
}))

import { usePresenceStore } from '../usePresenceStore'

beforeEach(() => {
  localStorage.setItem('verbum_token', 'test-token')
  usePresenceStore.getState().leaveChapter()
  vi.clearAllMocks()
  usePresenceStore.setState({ others: [] })
})

describe('usePresenceStore', () => {
  it('starts with empty others', () => {
    expect(usePresenceStore.getState().others).toEqual([])
  })

  it('joinChapter calls echo.join with channel name', () => {
    usePresenceStore.getState().joinChapter(43, 3, 'user-1')
    expect(mockEcho.join).toHaveBeenCalledWith('chapter.43.3')
    expect(mockJoinError).toHaveBeenCalled()
    expect(mockJoinHere).toHaveBeenCalled()
    expect(mockJoinJoining).toHaveBeenCalled()
    expect(mockJoinLeaving).toHaveBeenCalled()
    expect(mockJoinListen).toHaveBeenCalledWith('.verse.activity', expect.any(Function))
  })

  it('joinChapter leaves previous channel before joining new one', () => {
    usePresenceStore.getState().joinChapter(43, 3, 'user-1')
    usePresenceStore.getState().joinChapter(43, 4, 'user-1')
    expect(mockEcho.leave).toHaveBeenCalledWith('chapter.43.3')
    expect(mockEcho.join).toHaveBeenCalledWith('chapter.43.4')
  })

  it('leaveChapter leaves channel and resets', () => {
    usePresenceStore.getState().joinChapter(43, 3, 'user-1')
    usePresenceStore.getState().leaveChapter()
    expect(mockEcho.leave).toHaveBeenCalledWith('chapter.43.3')
    expect(mockDelete).toHaveBeenCalledWith('/api/presence/heartbeat', {
      book_number: 43,
      chapter_number: 3,
    })
    expect(usePresenceStore.getState().others).toEqual([])
  })

  it('leaveChapter does nothing when no channel', () => {
    usePresenceStore.getState().leaveChapter()
    expect(mockEcho.leave).not.toHaveBeenCalled()
  })

  it('rejoins the active chapter after the realtime connection is restored', () => {
    usePresenceStore.getState().joinChapter(43, 3, 'user-1')
    expect(reconnectListener).not.toBeNull()
    reconnectListener?.()
    expect(mockEcho.leave).toHaveBeenCalledWith('chapter.43.3')
    expect(mockEcho.join).toHaveBeenCalledTimes(2)
    expect(mockEcho.join).toHaveBeenLastCalledWith('chapter.43.3')
  })

  it('does not subscribe guests to a private presence channel', () => {
    localStorage.removeItem('verbum_token')
    usePresenceStore.getState().joinChapter(43, 3, '1')
    expect(mockEcho.join).not.toHaveBeenCalled()
  })

  it('keeps only friends other than self from the initial presence roster', () => {
    usePresenceStore.getState().joinChapter(43, 3, '1')
    const here = mockJoinHere.mock.calls[0][0] as (users: Array<{ id: number; name: string }>) => void
    here([{ id: 1, name: 'Self' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Stranger' }])
    expect(usePresenceStore.getState().others).toEqual([{ id: 2, name: 'Bob' }])
    expect(mockPost).toHaveBeenCalledWith('/api/presence/heartbeat', {
      book_number: 43,
      chapter_number: 3,
    })
  })

  it('restores friends from an authenticated heartbeat after an immediate transport reconnect', async () => {
    mockPost.mockResolvedValueOnce({ data: [{ id: 2, name: 'Bob' }] })
    usePresenceStore.getState().joinChapter(43, 3, '1')
    const here = mockJoinHere.mock.calls[0][0] as (users: Array<{ id: number; name: string }>) => void
    here([{ id: 1, name: 'Self' }])
    await vi.waitFor(() => expect(usePresenceStore.getState().others).toEqual([{ id: 2, name: 'Bob' }]))
    expect(usePresenceStore.getState().others).toEqual([{ id: 2, name: 'Bob' }])
  })

  it('deduplicates friend joins and removes them on leave', () => {
    usePresenceStore.getState().joinChapter(43, 3, '1')
    const joining = mockJoinJoining.mock.calls[0][0] as (user: { id: number; name: string }) => void
    const leaving = mockJoinLeaving.mock.calls[0][0] as (user: { id: number; name: string }) => void
    joining({ id: 3, name: 'Stranger' })
    joining({ id: 2, name: 'Bob' })
    joining({ id: 2, name: 'Bob' })
    expect(usePresenceStore.getState().others).toEqual([{ id: 2, name: 'Bob' }])
    leaving({ id: 2, name: 'Bob' })
    expect(usePresenceStore.getState().others).toEqual([])
  })

  it('records remote verse activity once and ignores the current user', () => {
    usePresenceStore.getState().joinChapter(43, 3, '1')
    const listen = mockJoinListen.mock.calls.find(([event]) => event === '.verse.activity')?.[1] as (event: {
      verse_number: number
      user_id: number
      user_name: string
      action: 'noted' | 'highlighted'
    }) => void
    listen({ verse_number: 16, user_id: 1, user_name: 'Self', action: 'noted' })
    listen({ verse_number: 16, user_id: 2, user_name: 'Bob', action: 'highlighted' })
    expect(mockRecordActivity).toHaveBeenCalledTimes(1)
    expect(mockRecordActivity).toHaveBeenCalledWith(16, expect.objectContaining({
      userId: 2,
      userName: 'Bob',
      action: 'highlighted',
    }))
    expect(mockAddToast).toHaveBeenCalledWith('Bob highlighted a verse', 'info')
  })

  it('surfaces subscription errors and clears activity when leaving', () => {
    usePresenceStore.getState().joinChapter(43, 3, '1')
    const error = mockJoinError.mock.calls[0][0] as (reason: unknown) => void
    vi.spyOn(console, 'error').mockImplementation(() => {})
    error(new Error('denied'))
    expect(mockAddToast).toHaveBeenCalledWith('Realtime presence subscription failed', 'error')
    usePresenceStore.getState().leaveChapter()
    expect(mockClearActivity).toHaveBeenCalled()
  })
})
