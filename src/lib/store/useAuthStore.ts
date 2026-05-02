import { create } from 'zustand'
import { api, setToken, clearToken } from '@/lib/api'
import { applyUserSettings, fetchUserSettings, persistClientSettings } from '@/lib/userSettings'

interface AuthUser {
  id: number
  name: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, token: string, password: string, passwordConfirmation: string) => Promise<void>
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('verbum_token')
    if (!token) { set({ loading: false }); return }
    try {
      const user = await api.get<AuthUser>('/api/user')
      const settings = await fetchUserSettings()
      await applyUserSettings(settings)
      set({ user, loading: false })
    } catch {
      clearToken()
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password })
    setToken(token)
    await persistClientSettings()
    set({ user })
  },

  register: async (name, email, password) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>('/api/auth/register', { name, email, password })
    setToken(token)
    await persistClientSettings()
    set({ user })
  },

  forgotPassword: async (email) => {
    await api.post('/api/auth/forgot-password', { email })
  },

  resetPassword: async (email, token, password, passwordConfirmation) => {
    await api.post('/api/auth/reset-password', {
      email,
      token,
      password,
      password_confirmation: passwordConfirmation,
    })
  },

  logout: async () => {
    await api.post('/api/auth/logout', {}).catch(() => {})
    clearToken()
    set({ user: null })
  },
}))
