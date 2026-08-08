import { api } from './api'

export type DailyGoal = {
  kind: 'chapters' | 'plan_steps'; target: number; active_days: number[]; timezone: string
  share_completions: boolean; progress: number; completed: boolean; streak: number
}
export type FeedItem = {
  id: string; type: 'shared_note'; created_at: string; summary: string
  actor: { id: number; name: string; avatar_url?: string | null }
  target: { book?: string | null; chapter?: number | null; verse?: number | null }
}
export type HomePayload = {
  last_reading: { book_name?: string; book_slug?: string; chapter: number; verse: number; version?: string } | null
  daily_goal: DailyGoal
  active_plan: { slug: string; title: string; path_slug?: string | null; current_step: number } | null
  social_activity: FeedItem[]
}

export const productApi = {
  home: () => api.get<HomePayload>('/api/home'),
  goal: (body: Pick<DailyGoal, 'kind' | 'target' | 'active_days' | 'timezone' | 'share_completions'>) => api.put<DailyGoal>('/api/daily-goal', body),
  calendar: (month: string) => api.get<{ month: string; days: Array<{ date: string; chapters_completed: number; completed: boolean }>; streak: number }>(`/api/daily-goal/calendar?month=${month}`),
  onboarding: (body: { step: number; completed?: boolean; preferences: Record<string, unknown> }) => api.put('/api/onboarding', body),
  feed: () => api.get<{ data: FeedItem[] }>('/api/feed'),
  mute: (userId: number) => api.put(`/api/feed/mutes/${userId}`, {}),
  feedback: (body: { type: 'bug' | 'suggestion' | 'question'; message: string; reply_email?: string; diagnostics?: Record<string, unknown> }) => api.post('/api/feedback', body),
  report: (body: { type: 'user' | 'note' | 'message' | 'guided_plan' | 'study'; id: string; subject_user_id?: number; reason: string; details?: string }) => api.post('/api/reports', body),
}
