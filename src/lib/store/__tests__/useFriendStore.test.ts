import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/friendApi', () => ({
  friendApi: {
    friends: vi.fn(),
    received: vi.fn(),
    sent: vi.fn(),
    search: vi.fn(),
    send: vi.fn(),
    accept: vi.fn(),
    decline: vi.fn(),
    remove: vi.fn(),
    recommendations: vi.fn(),
    dismissRecommendation: vi.fn(),
  },
}))

vi.mock('../useNotificationStore', () => ({
  useNotificationStore: {
    getState: vi.fn(() => ({
      notifications: [],
      markRead: vi.fn(),
    })),
  },
}))

import { friendApi } from '@/lib/friendApi'
import { useFriendStore } from '../useFriendStore'
import type { Friend, FriendRequest } from '@/types'

const mockFriendApi = friendApi as unknown as {
  friends: ReturnType<typeof vi.fn>
  received: ReturnType<typeof vi.fn>
  sent: ReturnType<typeof vi.fn>
  search: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
  accept: ReturnType<typeof vi.fn>
  decline: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  recommendations: ReturnType<typeof vi.fn>
  dismissRecommendation: ReturnType<typeof vi.fn>
}

const mockFriend: Friend = { id: 2, name: 'Bob', email: 'bob@test.com' }
const mockRequest: FriendRequest = {
  id: 1,
  user_id: 3,
  friend_id: 1,
  status: 'pending',
  user: { id: 3, name: 'Charlie', email: 'charlie@test.com' },
  created_at: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFriendApi.recommendations.mockResolvedValue([])
  useFriendStore.setState({
    friends: [],
    received: [],
    sent: [],
    searchResults: [],
    isSearching: false,
  })
})

describe('useFriendStore', () => {
  it('starts empty', () => {
    const state = useFriendStore.getState()
    expect(state.friends).toEqual([])
    expect(state.received).toEqual([])
    expect(state.sent).toEqual([])
    expect(state.searchResults).toEqual([])
    expect(state.isSearching).toBe(false)
  })

  it('load fetches friends, received, and sent in parallel', async () => {
    mockFriendApi.friends.mockResolvedValueOnce([mockFriend])
    mockFriendApi.received.mockResolvedValueOnce([mockRequest])
    mockFriendApi.sent.mockResolvedValueOnce([])

    await useFriendStore.getState().load()

    expect(useFriendStore.getState().friends).toEqual([mockFriend])
    expect(useFriendStore.getState().received).toEqual([mockRequest])
    expect(useFriendStore.getState().sent).toEqual([])
  })

  it('load handles errors silently', async () => {
    mockFriendApi.friends.mockRejectedValueOnce(new Error('Fail'))
    await useFriendStore.getState().load()
    expect(useFriendStore.getState().friends).toEqual([])
  })

  it('searchUsers returns empty for short queries', async () => {
    await useFriendStore.getState().searchUsers('a')
    expect(mockFriendApi.search).not.toHaveBeenCalled()
    expect(useFriendStore.getState().searchResults).toEqual([])
  })

  it('searchUsers fetches results for valid query', async () => {
    mockFriendApi.search.mockResolvedValueOnce([mockFriend])
    await useFriendStore.getState().searchUsers('Bob')
    expect(useFriendStore.getState().searchResults).toEqual([mockFriend])
    expect(useFriendStore.getState().isSearching).toBe(false)
  })

  it('clearSearch resets search results', async () => {
    useFriendStore.setState({ searchResults: [mockFriend] })
    useFriendStore.getState().clearSearch()
    expect(useFriendStore.getState().searchResults).toEqual([])
  })

  it('sendRequest adds to sent list', async () => {
    mockFriendApi.send.mockResolvedValueOnce(mockRequest)
    await useFriendStore.getState().sendRequest(3)
    expect(useFriendStore.getState().sent).toContainEqual(mockRequest)
  })

  it('dismissRecommendation removes the suggestion and replenishes recommendations', async () => {
    const nextFriend: Friend = { id: 4, name: 'Dana', email: 'dana@test.com' }
    mockFriendApi.dismissRecommendation.mockResolvedValueOnce(undefined)
    mockFriendApi.recommendations.mockResolvedValueOnce([nextFriend])
    useFriendStore.setState({ recommendations: [mockFriend] })

    await useFriendStore.getState().dismissRecommendation(mockFriend.id)

    expect(mockFriendApi.dismissRecommendation).toHaveBeenCalledWith(mockFriend.id)
    expect(useFriendStore.getState().recommendations).toEqual([nextFriend])
  })

  it('acceptRequest moves from received to friends', async () => {
    mockFriendApi.accept.mockResolvedValueOnce(undefined)
    useFriendStore.setState({ received: [mockRequest] })
    await useFriendStore.getState().acceptRequest(1)
    expect(useFriendStore.getState().received).toHaveLength(0)
    expect(useFriendStore.getState().friends).toHaveLength(1)
  })

  it('declineRequest removes from received', async () => {
    mockFriendApi.decline.mockResolvedValueOnce(undefined)
    useFriendStore.setState({ received: [mockRequest] })
    await useFriendStore.getState().declineRequest(1)
    expect(useFriendStore.getState().received).toHaveLength(0)
  })

  it('declineRequest cancels an outgoing request', async () => {
    mockFriendApi.decline.mockResolvedValueOnce(undefined)
    useFriendStore.setState({ sent: [mockRequest] })
    await useFriendStore.getState().declineRequest(1)
    expect(useFriendStore.getState().sent).toHaveLength(0)
  })

  it('removeFriend removes from friends list', async () => {
    mockFriendApi.remove.mockResolvedValueOnce(undefined)
    useFriendStore.setState({ friends: [mockFriend] })
    await useFriendStore.getState().removeFriend(2)
    expect(useFriendStore.getState().friends).toHaveLength(0)
  })
})
