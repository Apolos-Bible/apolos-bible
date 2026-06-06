import { api } from '@/lib/api'
import type { ProfileData } from '@/types'

export const profileApi = {
  /** Rich profile for any user id. The server decides self-vs-other from the token. */
  get: (userId: number | string) => api.get<ProfileData>(`/api/users/${userId}/profile`),

  /** Edit the current user's display name / bio. */
  updateProfile: (data: { name?: string; bio?: string | null }) =>
    api.patch<{ id: number; name: string; email: string; avatar_url: string | null; bio: string | null }>(
      '/api/user',
      data,
    ),

  /** Change the current user's password. */
  changePassword: (current_password: string, password: string, password_confirmation: string) =>
    api.post<{ message: string }>('/api/user/password', {
      current_password,
      password,
      password_confirmation,
    }),

  /** Upload a new avatar image. Returns the stored URL. */
  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.upload<{ avatar_url: string }>('/api/user/avatar', form)
  },

  /** Remove the current avatar. */
  deleteAvatar: () => api.delete<{ avatar_url: null }>('/api/user/avatar'),
}
