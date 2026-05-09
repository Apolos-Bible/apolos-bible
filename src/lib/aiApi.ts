import { api } from './api'

export interface AiVerseQuestionRequest {
  verse_id?: number
  reference: string
  text: string
  question: string
}

export interface AiVerseQuestionResponse {
  answer: string
  reference: string
  verse_id: number | null
}

export const aiApi = {
  verseQuestion: (body: AiVerseQuestionRequest) =>
    api.post<AiVerseQuestionResponse>('/api/ai/verse-question', body),
}
