import { create } from 'zustand'
import { api, setToken, clearToken } from '@/lib/api'
import { applyUserSettings, fetchUserSettings, persistClientSettings } from '@/lib/userSettings'
import { hydrateUserSession, resetUserSession } from '@/lib/userSession'
import { profileApi } from '@/lib/profileApi'
import { saveUserSettings } from '@/lib/userSettingsApi'
import { useWorkspaceStore } from '@/lib/store/useWorkspaceStore'

interface AuthUser {
  id: number
  name: string
  email: string
  email_verified_at?: string | null
  avatar_url?: string | null
  bio?: string | null
  content_public_default?: boolean
  /** False for Google-only accounts that never set a local password. */
  has_password?: boolean
  connected_providers?: Array<'password' | 'google' | 'youversion'>
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, token: string, password: string, passwordConfirmation: string) => Promise<void>
  resendVerification: () => Promise<{ message: string; verified: boolean }>
  refreshUser: () => Promise<void>
  updateProfile: (data: { name?: string; bio?: string | null }) => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  changePassword: (currentPassword: string, password: string, passwordConfirmation: string) => Promise<void>
  setContentPublicDefault: (value: boolean) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: (confirmation: { password?: string; email_confirmation?: string }) => Promise<void>
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
      void hydrateUserSession()
    } catch (e) {
      // Only nuke the token when the server explicitly rejects it.
      // Network errors, 5xx, or backend-down on cold start used to
      // log the user out — particularly visible on Windows/WebView2
      // where the network can be slow to come up after launch.
      const status = (e as { status?: number })?.status
      if (status === 401) {
        clearToken()
      }
      set({ loading: false })
    }
  },

  login: async (email, password) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>('/api/auth/login', { email, password })
    setToken(token)
    resetUserSession()
    try {
      const settings = await fetchUserSettings()
      await applyUserSettings(settings)
    } catch {
      // ignore — keep client defaults if settings fetch fails
    }
    set({ user })
    void hydrateUserSession()
  },

  register: async (name, email, password) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>('/api/auth/register', { name, email, password })
    setToken(token)
    resetUserSession()
    await persistClientSettings()
    set({ user })
    void hydrateUserSession()
  },

  forgotPassword: async (email) => {
    await api.post('/api/auth/forgot-password', { email })
  },

  resendVerification: async () => {
    return api.post<{ message: string; verified: boolean }>(
      '/api/auth/email/resend-verification',
      {},
    )
  },

  refreshUser: async () => {
    try {
      const user = await api.get<AuthUser>('/api/user')
      set({ user })
    } catch {
      // ignore — keep current state
    }
  },

  updateProfile: async (data) => {
    const updated = await profileApi.updateProfile(data)
    set((s) => ({
      user: s.user ? { ...s.user, name: updated.name, bio: updated.bio, avatar_url: updated.avatar_url } : s.user,
    }))
  },

  uploadAvatar: async (file) => {
    const { avatar_url } = await profileApi.uploadAvatar(file)
    set((s) => ({ user: s.user ? { ...s.user, avatar_url } : s.user }))
  },

  removeAvatar: async () => {
    await profileApi.deleteAvatar()
    set((s) => ({ user: s.user ? { ...s.user, avatar_url: null } : s.user }))
  },

  changePassword: async (currentPassword, password, passwordConfirmation) => {
    await profileApi.changePassword(currentPassword, password, passwordConfirmation)
  },

  setContentPublicDefault: async (value) => {
    await saveUserSettings({ content_public_default: value })
    set((s) => ({ user: s.user ? { ...s.user, content_public_default: value } : s.user }))
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
    localStorage.removeItem('verbum_last_reading')
    resetUserSession()
    useWorkspaceStore.getState().resetWorkspace()
    set({ user: null })
  },

  deleteAccount: async (confirmation) => {
    await api.delete('/api/user', confirmation)
    clearToken()
    localStorage.removeItem('verbum_last_reading')
    resetUserSession()
    useWorkspaceStore.getState().resetWorkspace()
    set({ user: null })
  },
}))
