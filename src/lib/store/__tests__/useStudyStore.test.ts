import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/study/studyApi', () => ({
  studyApi: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    end: vi.fn(),
    invite: vi.fn(),
    reopen: vi.fn(),
    invitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
  },
}))

import { studyApi } from '@/lib/study/studyApi'
import { useStudyStore } from '../useStudyStore'
import type { StudySession, StudyCreateResponse, StudyJoinResponse } from '@/lib/study/studyApi'

const mockStudyApi = studyApi as unknown as {
  list: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  join: ReturnType<typeof vi.fn>
  leave: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  invite: ReturnType<typeof vi.fn>
  reopen: ReturnType<typeof vi.fn>
  invitations: ReturnType<typeof vi.fn>
  acceptInvitation: ReturnType<typeof vi.fn>
  declineInvitation: ReturnType<typeof vi.fn>
}

const mockSession: StudySession = {
  id: 'session-1',
  type: 'verse',
  anchor_ref: 'john-3-16',
  title: 'Study on John 3:16',
  host_user_id: 1,
  status: 'active',
  thumbnail_url: null,
  last_activity_at: '2024-01-01T00:00:00Z',
  ended_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  participants: [],
  host: { id: 1, name: 'Alice' },
}

const mockCreateResponse: StudyCreateResponse = {
  session: mockSession,
  ws_token: 'ws-token-123',
  participant: { id: 1, name: 'Alice', role: 'host', cursor_color: '#ff0000', is_present: true },
}

const mockJoinResponse: StudyJoinResponse = {
  session: mockSession,
  ws_token: 'ws-token-456',
  participant: { id: 2, name: 'Bob', role: 'editor', cursor_color: '#00ff00', is_present: true },
}

beforeEach(() => {
  vi.clearAllMocks()
  useStudyStore.setState({
    activeSession: null,
    wsToken: null,
    myStudies: [],
    pendingInvitations: [],
  })
})

describe('useStudyStore', () => {
  it('starts with no active session', () => {
    const state = useStudyStore.getState()
    expect(state.activeSession).toBeNull()
    expect(state.wsToken).toBeNull()
    expect(state.myStudies).toEqual([])
    expect(state.pendingInvitations).toEqual([])
  })

  it('start creates session and sets active', async () => {
    mockStudyApi.create.mockResolvedValueOnce(mockCreateResponse)
    await useStudyStore.getState().start({ type: 'verse', anchor_ref: 'john-3-16', title: 'Test' })
    expect(useStudyStore.getState().activeSession).toEqual(mockSession)
    expect(useStudyStore.getState().wsToken).toBe('ws-token-123')
  })

  it('join sets active session and token', async () => {
    mockStudyApi.join.mockResolvedValueOnce(mockJoinResponse)
    await useStudyStore.getState().join('session-2')
    expect(useStudyStore.getState().activeSession).toEqual(mockSession)
    expect(useStudyStore.getState().wsToken).toBe('ws-token-456')
  })

  it('leave clears session', async () => {
    mockStudyApi.leave.mockResolvedValueOnce({ ok: true })
    useStudyStore.setState({ activeSession: mockSession, wsToken: 'token' })
    await useStudyStore.getState().leave()
    expect(useStudyStore.getState().activeSession).toBeNull()
    expect(useStudyStore.getState().wsToken).toBeNull()
  })

  it('leave does nothing if no active session', async () => {
    await useStudyStore.getState().leave()
    expect(mockStudyApi.leave).not.toHaveBeenCalled()
  })

  it('end clears session', async () => {
    mockStudyApi.end.mockResolvedValueOnce(mockSession)
    useStudyStore.setState({ activeSession: mockSession, wsToken: 'token' })
    await useStudyStore.getState().end()
    expect(useStudyStore.getState().activeSession).toBeNull()
    expect(useStudyStore.getState().wsToken).toBeNull()
  })

  it('invite calls studyApi.invite', async () => {
    mockStudyApi.invite.mockResolvedValueOnce({ invitations: [] })
    useStudyStore.setState({ activeSession: mockSession })
    await useStudyStore.getState().invite([2, 3])
    expect(mockStudyApi.invite).toHaveBeenCalledWith('session-1', [2, 3])
  })

  it('invite does nothing if no active session', async () => {
    await useStudyStore.getState().invite([2])
    expect(mockStudyApi.invite).not.toHaveBeenCalled()
  })

  it('reopen sets session and token', async () => {
    mockStudyApi.reopen.mockResolvedValueOnce(mockCreateResponse)
    await useStudyStore.getState().reopen('session-3')
    expect(useStudyStore.getState().activeSession).toEqual(mockSession)
    expect(useStudyStore.getState().wsToken).toBe('ws-token-123')
  })

  it('loadMyStudies loads studies', async () => {
    mockStudyApi.list.mockResolvedValueOnce([mockSession])
    await useStudyStore.getState().loadMyStudies()
    expect(useStudyStore.getState().myStudies).toEqual([mockSession])
  })

  it('loadInvitations loads invitations', async () => {
    const mockInvitation = { id: 1, session_id: 's1', inviter_id: 2, invitee_id: 1, status: 'pending' as const, created_at: '2024-01-01' }
    mockStudyApi.invitations.mockResolvedValueOnce([mockInvitation])
    await useStudyStore.getState().loadInvitations()
    expect(useStudyStore.getState().pendingInvitations).toEqual([mockInvitation])
  })

  it('acceptInvitation sets active session', async () => {
    mockStudyApi.acceptInvitation.mockResolvedValueOnce(mockJoinResponse)
    await useStudyStore.getState().acceptInvitation(1)
    expect(useStudyStore.getState().activeSession).toEqual(mockSession)
  })

  it('declineInvitation removes from pending', async () => {
    mockStudyApi.declineInvitation.mockResolvedValueOnce({ ok: true })
    const invitation = { id: 1, session_id: 's1', inviter_id: 2, invitee_id: 1, status: 'pending' as const, created_at: '2024-01-01' }
    useStudyStore.setState({ pendingInvitations: [invitation] })
    await useStudyStore.getState().declineInvitation(1)
    expect(useStudyStore.getState().pendingInvitations).toEqual([])
  })
})
