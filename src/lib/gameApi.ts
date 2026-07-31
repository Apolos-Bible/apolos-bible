import { api } from './api'

export type GameType = 'trivia' | 'true_false' | 'who_am_i' | 'fill_blank' | 'timeline' | 'matching' | 'memory' | 'map'
export type GameAnswer = number | number[]

export interface GamePlayer {
  id: number
  name: string
  email?: string
  avatar_url: string | null
  score: number
  answered: boolean
  answer_correct: boolean | null
  answer_points: number | null
}

export interface GameQuestion {
  type: GameType
  category: string
  difficulty: number
  prompt: string
  options: string[]
  clues: string[]
  items?: Array<{ id: number; label: string }>
  left_items?: string[]
  right_items?: string[]
  memory_cards?: Array<{ id: number; pair_id: number; label: string }>
  map_points?: Array<{ id: number; label: string; x: number; y: number }>
  reference: string
  seconds: number
  correct_answer?: GameAnswer
  explanation?: string
}

export interface GameRoom {
  id: string
  code: string
  host_user_id: number
  status: 'lobby' | 'playing' | 'finished'
  phase: 'question' | 'reveal' | null
  round_count: number
  current_round: number | null
  round_started_at: string | null
  current_question: GameQuestion | null
  my_answer: GameAnswer | null
  players: GamePlayer[]
}

export interface GameRoomSummary {
  id: string
  code: string
  status: 'lobby' | 'playing'
  host: { id: number; name: string; avatar_url: string | null }
  players_count: number
  updated_at: string
}

export const gameApi = {
  index: () => api.get<{ rooms: GameRoomSummary[]; invitations: GameRoomSummary[] }>('/api/games/rooms'),
  create: (locale: 'es' | 'en', roundCount = 6) => api.post<GameRoom>('/api/games/rooms', { locale, round_count: roundCount }),
  room: (id: string) => api.get<GameRoom>(`/api/games/rooms/${id}`),
  join: (code: string) => api.post<GameRoom>('/api/games/rooms/join', { code }),
  accept: (id: string) => api.post<GameRoom>(`/api/games/rooms/${id}/accept`, {}),
  invite: (id: string, userIds: number[]) => api.post<GameRoom>(`/api/games/rooms/${id}/invite`, { user_ids: userIds }),
  start: (id: string) => api.post<GameRoom>(`/api/games/rooms/${id}/start`, {}),
  answer: (id: string, answer: GameAnswer) => api.post<GameRoom>(`/api/games/rooms/${id}/answer`, { answer }),
  reveal: (id: string) => api.post<GameRoom>(`/api/games/rooms/${id}/reveal`, {}),
  advance: (id: string) => api.post<GameRoom>(`/api/games/rooms/${id}/advance`, {}),
  replay: (id: string) => api.post<GameRoom>(`/api/games/rooms/${id}/replay`, {}),
}
