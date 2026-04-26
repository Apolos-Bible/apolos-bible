import { api } from '@/lib/api'

export interface ChatUser {
  id:    number
  name:  string
  email: string
}

export interface ChatParticipant extends ChatUser {
  last_read_at: string | null
}

export interface ChatLastMessagePreview {
  id:         number
  user_id:    number
  user_name:  string | null
  body:       string
  created_at: string
}

export interface Conversation {
  id:              number
  type:            'dm' | 'group'
  name:            string | null
  created_by:      number
  last_message_at: string | null
  unread_count:    number
  last_read_at:    string | null
  participants:    ChatParticipant[]
  last_message:    ChatLastMessagePreview | null
}

export interface ChatMessage {
  id:              number
  conversation_id: number
  user_id:         number
  user:            ChatUser | null
  body:            string
  created_at:      string
}

export const chatApi = {
  list:           ()                            => api.get<Conversation[]>('/api/conversations'),
  show:           (id: number)                  => api.get<Conversation>(`/api/conversations/${id}`),
  createDm:       (userId: number)              => api.post<Conversation>('/api/conversations', { type: 'dm', user_ids: [userId] }),
  createGroup:    (name: string, userIds: number[]) => api.post<Conversation>('/api/conversations', { type: 'group', name, user_ids: userIds }),
  messages:       (id: number, before?: number) => api.get<ChatMessage[]>(`/api/conversations/${id}/messages${before ? `?before=${before}` : ''}`),
  send:           (id: number, body: string)    => api.post<ChatMessage>(`/api/conversations/${id}/messages`, { body }),
  markRead:       (id: number)                  => api.post<{ last_read_at: string; last_read_message_id: number | null }>(`/api/conversations/${id}/read`, {}),
  typing:         (id: number)                  => api.post<{ ok: boolean }>(`/api/conversations/${id}/typing`, {}),
  addParticipants:(id: number, userIds: number[]) => api.post<Conversation>(`/api/conversations/${id}/participants`, { user_ids: userIds }),
  leave:          (id: number)                  => api.delete<void>(`/api/conversations/${id}/leave`),
}
