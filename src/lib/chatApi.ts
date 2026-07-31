import { api } from '@/lib/api'

export interface ChatUser {
  id:    number
  name:  string
  email: string
  avatar_url?: string | null
}

export interface ChatParticipant extends ChatUser {
  last_read_at: string | null
  role?: 'admin' | 'member'
}

export interface ChatLastMessagePreview {
  id:         number
  user_id:    number
  user_name:  string | null
  body:       string
  created_at: string
}

export interface Conversation {
  id:                number
  type:              'dm' | 'group'
  name:              string | null
  description?:      string | null
  avatar_url?:       string | null
  created_by:        number
  created_at?:       string | null
  /** UUID of the study session this conversation belongs to, if any.
   *  When set, adding members to this chat also adds them to the study. */
  study_session_id?: string | null
  last_message_at:   string | null
  unread_count:      number
  last_read_at:      string | null
  archived_at:       string | null
  participants:      ChatParticipant[]
  members_can_invite?: boolean
  last_message:      ChatLastMessagePreview | null
}

export interface ChatMessage {
  id:              number
  conversation_id: number
  user_id:         number
  user:            ChatUser | null
  /** True when sent by the "Apolos" AI assistant (rendered distinctly). */
  is_ai?:          boolean
  body:            string
  created_at:      string
}

export const chatApi = {
  list:           ()                            => api.get<Conversation[]>('/api/conversations'),
  show:           (id: number)                  => api.get<Conversation>(`/api/conversations/${id}`),
  createDm:       (userId: number)              => api.post<Conversation>('/api/conversations', { type: 'dm', user_ids: [userId] }),
  createGroup:    (name: string, userIds: number[], description?: string) =>
    api.post<Conversation>('/api/conversations', {
      type: 'group',
      name,
      description: description?.trim() || null,
      user_ids: userIds,
    }),
  messages:       (id: number, before?: number) => api.get<ChatMessage[]>(`/api/conversations/${id}/messages${before ? `?before=${before}` : ''}`),
  send:           (id: number, body: string)    => api.post<ChatMessage>(`/api/conversations/${id}/messages`, { body }),
  markRead:       (id: number)                  => api.post<{ last_read_at: string; last_read_message_id: number | null }>(`/api/conversations/${id}/read`, {}),
  archive:        (id: number)                  => api.patch<{ archived_at: string }>(`/api/conversations/${id}/archive`, {}),
  unarchive:      (id: number)                  => api.delete<{ archived_at: null }>(`/api/conversations/${id}/archive`),
  typing:         (id: number)                  => api.post<{ ok: boolean }>(`/api/conversations/${id}/typing`, {}),
  addParticipants:(id: number, userIds: number[]) => api.post<Conversation>(`/api/conversations/${id}/participants`, { user_ids: userIds }),
  leave:          (id: number)                  => api.delete<void>(`/api/conversations/${id}/leave`),
  kickMember:     (id: number, userId: number) => api.delete<Conversation>(`/api/conversations/${id}/members/${userId}`),
  promoteMember:  (id: number, userId: number) => api.post<Conversation>(`/api/conversations/${id}/members/${userId}/promote`, {}),
  demoteMember:   (id: number, userId: number) => api.post<Conversation>(`/api/conversations/${id}/members/${userId}/demote`, {}),
  getSettings:    (id: number) => api.get<{
    members_can_invite: boolean
    name: string | null
    description: string | null
    avatar_url: string | null
  }>(`/api/conversations/${id}/settings`),
  updateSettings:(id: number, data: {
    members_can_invite?: boolean
    name?: string | null
    description?: string | null
  }) => api.patch<Conversation>(`/api/conversations/${id}/settings`, data),
  uploadAvatar: (id: number, file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.upload<Conversation>(`/api/conversations/${id}/avatar`, form)
  },
  deleteAvatar: (id: number) => api.delete<Conversation>(`/api/conversations/${id}/avatar`),
}
