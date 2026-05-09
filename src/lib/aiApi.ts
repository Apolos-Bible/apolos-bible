import { api } from './api'

export interface AiUsageSummary {
  period: string
  input_tokens: number
  input_cached_tokens: number
  output_tokens: number
  tokens_used: number
  tokens_limit: number
  tokens_remaining: number
  percent_used: number
  request_count: number
}

export interface AiVerseQuestionRequest {
  verse_id: number
  question: string
}

export interface AiVerseQuestionResponse {
  answer: string
  reference: string
  verse_id: number | null
  usage: AiUsageSummary
}

export const aiApi = {
  usage: () => api.get<AiUsageSummary>('/api/ai/usage'),
  verseQuestion: (body: AiVerseQuestionRequest) =>
    api.post<AiVerseQuestionResponse>('/api/ai/verse-question', body),
}
