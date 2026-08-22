import { api } from '@/lib/api'
import type { Friend, FriendRequest, AppNotification } from '@/types'

export const friendApi = {
  friends:     ()                     => api.get<Friend[]>('/api/friends'),
  recommendations: ()                => api.get<Friend[]>('/api/friends/recommendations'),
  dismissRecommendation: (userId: number) => api.delete<void>(`/api/friends/recommendations/${userId}`),
  received:    ()                     => api.get<FriendRequest[]>('/api/friend-requests/received'),
  sent:        ()                     => api.get<FriendRequest[]>('/api/friend-requests/sent'),
  search:      (q: string)            => api.get<Friend[]>(`/api/users/search?q=${encodeURIComponent(q)}`),
  send:        (userId: number)       => api.post<FriendRequest>(`/api/friends/${userId}`, {}),
  accept:      (friendshipId: number) => api.patch<FriendRequest>(`/api/friend-requests/${friendshipId}/accept`, {}),
  decline:     (friendshipId: number) => api.delete<void>(`/api/friend-requests/${friendshipId}`),
  remove:      (userId: number)       => api.delete<void>(`/api/friends/${userId}`),
  block:       (userId: number)       => api.post<{ status: 'blocked' }>(`/api/friends/${userId}/block`, {}),
  unblock:     (userId: number)       => api.delete<void>(`/api/friends/${userId}/block`),
  notifications: ()                   => api.get<AppNotification[]>('/api/notifications'),
  markRead:    (id: string)           => api.patch<{ ok: boolean }>(`/api/notifications/${id}/read`, {}),
  markAllRead: ()                     => api.post<{ ok: boolean }>('/api/notifications/read-all', {}),
}
