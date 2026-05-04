import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockJoinError = vi.fn()
const mockJoinHere = vi.fn()
const mockJoinJoining = vi.fn()
const mockJoinLeaving = vi.fn()
const mockJoinListen = vi.fn()

const mockJoinResult = {
  error: mockJoinError.mockReturnValue({
    here: mockJoinHere.mockReturnValue({
      joining: mockJoinJoining.mockReturnValue({
        leaving: mockJoinLeaving.mockReturnValue({
          listen: mockJoinListen,
        }),
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
}))

vi.mock('../useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addToast: vi.fn(),
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
      recordActivity: vi.fn(),
      clearAll: vi.fn(),
    })),
  },
}))

import { usePresenceStore } from '../usePresenceStore'

beforeEach(() => {
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
    expect(mockJoinListen).toHaveBeenCalled()
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
    expect(usePresenceStore.getState().others).toEqual([])
  })

  it('leaveChapter does nothing when no channel', () => {
    usePresenceStore.getState().leaveChapter()
    expect(mockEcho.leave).not.toHaveBeenCalled()
  })
})
