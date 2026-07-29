import { api } from '@/lib/api'
import { withFrontendLocale } from '@/lib/localizedApi'

/** A resolved slice of Scripture a guided step points at. */
export interface GuidedRange {
  book: string
  slug: string | null
  book_number: number | null
  chapter: number
  start: number | null
  end: number | null
}

export interface GuidedPrompt {
  question: string
  /** What the passage teaches. Null for questions that are the person's alone. */
  answer: string | null
}

/**
 * Kinds of step. The importer only produces intro/passage/application/memory;
 * the rest come from paths people write. See `guidedStepKinds.ts` for how each
 * one behaves, and `GuidedStudyStep::KINDS` for what the server accepts.
 */
export type GuidedStepKind =
  | 'intro'
  | 'context'
  | 'passage'
  | 'teaching'
  | 'discussion'
  | 'application'
  | 'practice'
  | 'prayer'
  | 'review'
  | 'memory'

export interface GuidedStep {
  id: number
  position: number
  kind: GuidedStepKind
  title: string | null
  reference: string | null
  ranges: GuidedRange[]
  body: string | null
  prompts: GuidedPrompt[]
}

export interface GuidedStudy {
  slug: string
  title: string
  theme: string | null
  heart_goal: string | null
  memory_verse_ref: string | null
  memory_verse_text: string | null
  leader_notes: string | null
  position: number
  step_count: number
  plan: { slug: string; title: string } | null
  steps: GuidedStep[]
}

export interface GuidedProgress {
  guided_study_id: number
  session_id: string | null
  current_step: number
  started_at: string | null
  completed_at: string | null
}

export interface GuidedResponse {
  step_id: number
  prompt_index: number
  answer: string | null
  revealed: boolean
}

export interface GuidedPlanSummary {
  slug: string
  title: string
  description: string | null
  studies: {
    slug: string
    title: string
    theme: string | null
    position: number
    step_count: number
    progress: { current_step: number; completed_at: string | null } | null
  }[]
}

export interface GuidedStudyDetail {
  study: GuidedStudy
  progress: GuidedProgress
  responses: GuidedResponse[]
}

export const guidedApi = {
  plans: () => api.get<GuidedPlanSummary[]>(withFrontendLocale('/api/guided-plans')),

  study: (slug: string) => api.get<GuidedStudyDetail>(withFrontendLocale(`/api/guided-studies/${slug}`)),

  setProgress: (slug: string, body: { current_step: number; session_id?: string; completed?: boolean }) =>
    api.post<GuidedProgress>(`/api/guided-studies/${slug}/progress`, body),

  saveResponse: (
    slug: string,
    stepId: number,
    body: { prompt_index: number; answer?: string; revealed?: boolean },
  ) => api.post<GuidedResponse>(`/api/guided-studies/${slug}/steps/${stepId}/responses`, body),
}
