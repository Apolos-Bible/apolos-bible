import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/chatApi', () => ({
  chatApi: {
    list: vi.fn(),
    show: vi.fn(),
    createDm: vi.fn(),
    createGroup: vi.fn(),
    messages: vi.fn(),
    send: vi.fn(),
    markRead: vi.fn(),
    typing: vi.fn(),
    addParticipants: vi.fn(),
    leave: vi.fn(),
  },
}))

const mockEchoListen = vi.fn()
const mockEchoPrivateResult = {
  listen: mockEchoListen.mockReturnValue({
    listen: mockEchoListen.mockReturnValue({
      listen: mockEchoListen,
    }),
  }),
}

const mockEchoInstance = {
  private: vi.fn(() => mockEchoPrivateResult),
  leave: vi.fn(),
}

vi.mock('@/lib/echo', () => ({
  initEcho: vi.fn(() => mockEchoInstance),
  getEcho: vi.fn(() => mockEchoInstance),
}))

vi.mock('@/lib/i18n', () => ({
  default: { t: vi.fn((k: string) => k), language: 'en' },
}))

vi.mock('../useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      user: { id: 1, name: 'Alice', email: 'alice@test.com' },
    })),
  },
}))

vi.mock('../useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      addToast: vi.fn(),
    })),
  },
}))

import { chatApi } from '@/lib/chatApi'
import { useChatStore } from '../useChatStore'
import type { Conversation, ChatMessage } from '@/lib/chatApi'

const mockChatApi = chatApi as unknown as {
  list: ReturnType<typeof vi.fn>
  show: ReturnType<typeof vi.fn>
  createDm: ReturnType<typeof vi.fn>
  createGroup: ReturnType<typeof vi.fn>
  messages: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  markRead: ReturnType<typeof vi.fn>
  typing: ReturnType<typeof vi.fn>
  addParticipants: ReturnType<typeof vi.fn>
  leave: ReturnType<typeof vi.fn>
}

const mockConversation: Conversation = {
  id: 1,
  type: 'dm',
  name: null,
  created_by: 1,
  last_message_at: '2024-01-01T00:00:00Z',
  unread_count: 0,
  last_read_at: null,
  participants: [
    { id: 1, name: 'Alice', email: 'alice@test.com', last_read_at: null },
    { id: 2, name: 'Bob', email: 'bob@test.com', last_read_at: null },
  ],
  last_message: { id: 1, user_id: 1, user_name: 'Alice', body: 'Hello', created_at: '2024-01-01T00:00:00Z' },
}

const mockMessage: ChatMessage = {
  id: 1,
  conversation_id: 1,
  user_id: 1,
  user: { id: 1, name: 'Alice', email: 'alice@test.com' },
  body: 'Hello',
  created_at: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  useChatStore.setState({
    conversations: [],
    selectedId: null,
    messages: {},
    loadingList: false,
    loadingThread: {},
    typing: {},
  })
})

describe('useChatStore', () => {
  it('starts empty', () => {
    const state = useChatStore.getState()
    expect(state.conversations).toEqual([])
    expect(state.selectedId).toBeNull()
    expect(state.messages).toEqual({})
  })

  it('load fetches conversation list', async () => {
    mockChatApi.list.mockResolvedValueOnce([mockConversation])
    await useChatStore.getState().load()
    expect(useChatStore.getState().conversations).toEqual([mockConversation])
  })

  it('load handles errors', async () => {
    mockChatApi.list.mockRejectedValueOnce(new Error('Fail'))
    await useChatStore.getState().load()
    expect(useChatStore.getState().loadingList).toBe(false)
    expect(useChatStore.getState().conversations).toEqual([])
  })

  it('select sets selectedId and loads messages', async () => {
    mockChatApi.messages.mockResolvedValueOnce([mockMessage])
    mockChatApi.markRead.mockResolvedValueOnce({ last_read_at: '2024-01-01', last_read_message_id: 1 })
    await useChatStore.getState().select(1)
    expect(useChatStore.getState().selectedId).toBe(1)
    expect(useChatStore.getState().messages[1]).toEqual([mockMessage])
  })

  it('select does nothing for null id', async () => {
    await useChatStore.getState().select(null)
    expect(useChatStore.getState().selectedId).toBeNull()
  })

  it('send creates a message and updates state', async () => {
    mockChatApi.send.mockResolvedValueOnce(mockMessage)
    await useChatStore.getState().send(1, 'Hello')
    expect(mockChatApi.send).toHaveBeenCalledWith(1, 'Hello')
    expect(useChatStore.getState().messages[1]).toEqual([mockMessage])
  })

  it('send does nothing for empty body', async () => {
    await useChatStore.getState().send(1, '   ')
    expect(mockChatApi.send).not.toHaveBeenCalled()
  })

  it('loadMessages does not refetch if already loaded', async () => {
    useChatStore.setState({ messages: { 1: [mockMessage] } })
    await useChatStore.getState().loadMessages(1)
    expect(mockChatApi.messages).not.toHaveBeenCalled()
  })

  it('loadOlder fetches messages before the oldest', async () => {
    mockChatApi.messages.mockResolvedValueOnce([
      { ...mockMessage, id: 0, created_at: '2023-12-31T00:00:00Z' },
    ])
    useChatStore.setState({ messages: { 1: [mockMessage] } })
    await useChatStore.getState().loadOlder(1)
    expect(mockChatApi.messages).toHaveBeenCalledWith(1, 1)
  })

  it('markRead updates conversation unread count', async () => {
    mockChatApi.markRead.mockResolvedValueOnce({ last_read_at: '2024-01-01', last_read_message_id: 1 })
    useChatStore.setState({
      conversations: [{ ...mockConversation, unread_count: 3 }],
    })
    await useChatStore.getState().markRead(1)
    expect(useChatStore.getState().conversations[0].unread_count).toBe(0)
  })

  it('startDm creates DM and adds to conversations', async () => {
    mockChatApi.createDm.mockResolvedValueOnce(mockConversation)
    const c = await useChatStore.getState().startDm(2)
    expect(c).toEqual(mockConversation)
    expect(useChatStore.getState().conversations).toHaveLength(1)
  })

  it('createGroup creates group conversation', async () => {
    const groupConv = { ...mockConversation, type: 'group' as const, name: 'Study Group' }
    mockChatApi.createGroup.mockResolvedValueOnce(groupConv)
    await useChatStore.getState().createGroup('Study Group', [2, 3])
    expect(useChatStore.getState().conversations[0].name).toBe('Study Group')
  })

  it('leave removes conversation', async () => {
    mockChatApi.leave.mockResolvedValueOnce(undefined)
    useChatStore.setState({
      conversations: [mockConversation],
      selectedId: 1,
    })
    await useChatStore.getState().leave(1)
    expect(useChatStore.getState().conversations).toHaveLength(0)
    expect(useChatStore.getState().selectedId).toBeNull()
  })

  it('reset clears all state', () => {
    useChatStore.setState({
      conversations: [mockConversation],
      selectedId: 1,
      messages: { 1: [mockMessage] },
      typing: { 1: [{ userId: 2, userName: 'Bob', expiresAt: Date.now() + 4000 }] },
    })
    useChatStore.getState().reset()
    const state = useChatStore.getState()
    expect(state.conversations).toEqual([])
    expect(state.selectedId).toBeNull()
    expect(state.messages).toEqual({})
    expect(state.typing).toEqual({})
  })
})
