import { api } from '@/lib/api'
import { withFrontendLocale } from '@/lib/localizedApi'
import type { GuidedRange, GuidedStepKind, GuidedStudy } from '@/lib/study/guidedApi'

/** Who may see a path. Private until its author decides otherwise. */
export type PathVisibility = 'public' | 'private' | 'friends'

/** Official paths come from the markdown importer and are read-only here. */
export type PathSource = 'official' | 'user'
export type ModerationStatus =
  | 'not_required'
  | 'draft'
  | 'pending_review'
  | 'ai_reviewing'
  | 'ai_approved'
  | 'admin_approved'
  | 'changes_requested'
  | 'rejected'
  | 'suspended'

export interface PathStudySummary {
  slug: string
  title: string
  theme: string | null
  position: number
  step_count: number
  progress: { current_step: number; completed_at: string | null } | null
}

/** A study path: several studies in order, the unit people write and share. */
export interface StudyPath {
  slug: string
  title: string
  description: string | null
  source: PathSource
  visibility: PathVisibility
  is_published?: boolean
  moderation_status?: ModerationStatus
  moderation_source?: string | null
  moderation_reason?: string | null
  moderation_requested_at?: string | null
  moderation_reviewed_at?: string | null
  is_mine: boolean
  author: { id: number; name: string | null } | null
  rating_avg: number
  rating_count: number
  list_count: number
  studies: PathStudySummary[]
}

/** A step as the editor holds it: no id until the server has saved it. */
export interface DraftStep {
  kind: GuidedStepKind
  title: string | null
  reference: string | null
  body: string | null
  prompts: { question: string; answer: string | null }[]
}

export interface StudyMetadata {
  title: string
  theme?: string | null
  heart_goal?: string | null
  memory_verse_ref?: string | null
  memory_verse_text?: string | null
  leader_notes?: string | null
}

export interface ReferencePreview {
  reference: string
  ranges: GuidedRange[]
  /** False when any book in the reference matched nothing — a dead link. */
  resolved: boolean
}

export const guidedEditorApi = {
  myPaths: () => api.get<StudyPath[]>(withFrontendLocale('/api/my/guided-plans')),

  createPath: (body: { title: string; description?: string; visibility?: PathVisibility }) =>
    api.post<StudyPath>('/api/guided-plans', body),

  updatePath: (
    slug: string,
    body: { title?: string; description?: string | null; visibility?: PathVisibility },
  ) => api.patch<StudyPath>(`/api/guided-plans/${slug}`, body),

  requestPublication: (slug: string) =>
    api.post<StudyPath>(`/api/guided-plans/${slug}/request-publication`, {}),

  deletePath: (slug: string) => api.delete<{ deleted: boolean }>(`/api/guided-plans/${slug}`),

  createStudy: (pathSlug: string, body: StudyMetadata) =>
    api.post<GuidedStudy>(`/api/guided-plans/${pathSlug}/studies`, body),

  updateStudy: (pathSlug: string, studySlug: string, body: Partial<StudyMetadata>) =>
    api.patch<GuidedStudy>(`/api/guided-plans/${pathSlug}/studies/${studySlug}`, body),

  deleteStudy: (pathSlug: string, studySlug: string) =>
    api.delete<{ deleted: boolean }>(`/api/guided-plans/${pathSlug}/studies/${studySlug}`),

  /** The whole ordered list, as it now stands — the server replaces what it had. */
  replaceSteps: (pathSlug: string, studySlug: string, steps: DraftStep[]) =>
    api.put<GuidedStudy>(`/api/guided-plans/${pathSlug}/studies/${studySlug}/steps`, { steps }),

  resolveReference: (reference: string) =>
    api.post<ReferencePreview>('/api/guided-references/resolve', { reference }),
}
