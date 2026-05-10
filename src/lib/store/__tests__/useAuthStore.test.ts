import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setToken: vi.fn((token: string) => localStorage.setItem('verbum_token', token)),
  clearToken: vi.fn(() => localStorage.removeItem('verbum_token')),
}))

vi.mock('@/lib/userSettings', () => ({
  applyUserSettings: vi.fn(() => Promise.resolve()),
  fetchUserSettings: vi.fn(() => Promise.resolve({})),
  persistClientSettings: vi.fn(() => Promise.resolve()),
}))

import { api } from '@/lib/api'
import { useAuthStore } from '../useAuthStore'

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

const mockUser = { id: 1, name: 'Alice', email: 'alice@test.com' }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  useAuthStore.setState({
    user: null,
    loading: true,
  })
})

describe('useAuthStore', () => {
  it('starts with null user and loading=true', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.loading).toBe(true)
  })

  it('init sets loading=false when no token', async () => {
    await useAuthStore.getState().init()
    expect(useAuthStore.getState().loading).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('init fetches user when token exists', async () => {
    localStorage.setItem('verbum_token', 'test-token')
    mockApi.get.mockResolvedValueOnce(mockUser)
    await useAuthStore.getState().init()
    expect(useAuthStore.getState().user).toEqual(mockUser)
    expect(useAuthStore.getState().loading).toBe(false)
  })

  it('init clears token on 401 (token rejected by server)', async () => {
    localStorage.setItem('verbum_token', 'bad-token')
    const err = Object.assign(new Error('Unauthorized'), { status: 401 })
    mockApi.get.mockRejectedValueOnce(err)
    await useAuthStore.getState().init()
    expect(useAuthStore.getState().loading).toBe(false)
    expect(localStorage.getItem('verbum_token')).toBeNull()
  })

  it('init keeps token on network/transient error', async () => {
    localStorage.setItem('verbum_token', 'good-token')
    mockApi.get.mockRejectedValueOnce(new Error('Network down'))
    await useAuthStore.getState().init()
    expect(useAuthStore.getState().loading).toBe(false)
    expect(localStorage.getItem('verbum_token')).toBe('good-token')
  })

  it('login sets token and user', async () => {
    mockApi.post.mockResolvedValueOnce({ token: 'new-token', user: mockUser })
    await useAuthStore.getState().login('alice@test.com', 'password')
    expect(useAuthStore.getState().user).toEqual(mockUser)
    expect(localStorage.getItem('verbum_token')).toBe('new-token')
  })

  it('register sets token and user', async () => {
    mockApi.post.mockResolvedValueOnce({ token: 'new-token', user: mockUser })
    await useAuthStore.getState().register('Alice', 'alice@test.com', 'password')
    expect(useAuthStore.getState().user).toEqual(mockUser)
    expect(localStorage.getItem('verbum_token')).toBe('new-token')
  })

  it('forgotPassword calls API', async () => {
    mockApi.post.mockResolvedValueOnce(undefined)
    await useAuthStore.getState().forgotPassword('alice@test.com')
    expect(mockApi.post).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'alice@test.com' })
  })

  it('resetPassword calls API with correct fields', async () => {
    mockApi.post.mockResolvedValueOnce(undefined)
    await useAuthStore.getState().resetPassword('alice@test.com', 'reset-token', 'newpass', 'newpass')
    expect(mockApi.post).toHaveBeenCalledWith('/api/auth/reset-password', {
      email: 'alice@test.com',
      token: 'reset-token',
      password: 'newpass',
      password_confirmation: 'newpass',
    })
  })

  it('logout clears token and user', async () => {
    mockApi.post.mockResolvedValueOnce(undefined)
    useAuthStore.setState({ user: mockUser })
    localStorage.setItem('verbum_last_reading', 'some-value')
    await useAuthStore.getState().logout()
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('verbum_token')).toBeNull()
    expect(localStorage.getItem('verbum_last_reading')).toBeNull()
  })
})
