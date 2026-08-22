import { create } from 'zustand'
import { guidedApi } from '@/lib/study/guidedApi'
import type {
  GuidedPlanSummary,
  GuidedProgress,
  GuidedResponse,
  GuidedStudy,
} from '@/lib/study/guidedApi'

/** key for the per-prompt maps: one step can hold several prompts */
const promptKey = (stepId: number, promptIndex: number) => `${stepId}:${promptIndex}`

/** Prevent a slower request for the previous session from replacing the current one. */
let openRequestId = 0

type GuidedStore = {
  plans: GuidedPlanSummary[]
  plansLoading: boolean
  /** The study attached to the session currently open, if any. */
  study: GuidedStudy | null
  progress: GuidedProgress | null
  /** The person's own answers, keyed by `stepId:promptIndex`. */
  answers: Record<string, string>
  revealed: Record<string, boolean>
  loading: boolean
  error: string | null

  loadPlans: () => Promise<void>
  /** Load a guided study (no-op if the same one is already loaded). */
  open: (slug: string, sessionId?: string) => Promise<void>
  clear: () => void

  goToStep: (index: number) => void
  setAnswer: (stepId: number, promptIndex: number, answer: string) => void
  /** Persist the answer as written; called on blur / debounce. */
  flushAnswer: (stepId: number, promptIndex: number) => Promise<void>
  reveal: (stepId: number, promptIndex: number) => Promise<void>
  complete: () => Promise<void>
}

export const useGuidedStore = create<GuidedStore>((set, get) => ({
  plans: [],
  plansLoading: false,
  study: null,
  progress: null,
  answers: {},
  revealed: {},
  loading: false,
  error: null,

  loadPlans: async () => {
    if (get().plansLoading) return
    set({ plansLoading: true })
    try {
      set({ plans: await guidedApi.plans(), error: null })
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    } finally {
      set({ plansLoading: false })
    }
  },

  open: async (slug, sessionId) => {
    const current = get()
    if (current.study?.slug === slug && (!sessionId || current.progress?.session_id === sessionId)) return
    const requestId = ++openRequestId
    set({ loading: true, error: null })
    try {
      const detail = await guidedApi.study(slug, sessionId)
      if (requestId !== openRequestId) return
      const answers: Record<string, string> = {}
      const revealed: Record<string, boolean> = {}
      detail.responses.forEach((r: GuidedResponse) => {
        const key = promptKey(r.step_id, r.prompt_index)
        if (r.answer) answers[key] = r.answer
        if (r.revealed) revealed[key] = true
      })
      set({ study: detail.study, progress: detail.progress, answers, revealed })
    } catch (e: any) {
      if (requestId === openRequestId) set({ error: e?.message ?? 'load failed' })
    } finally {
      if (requestId === openRequestId) set({ loading: false })
    }
  },

  clear: () => {
    openRequestId++
    set({ study: null, progress: null, answers: {}, revealed: {}, loading: false, error: null })
  },

  goToStep: (index) => {
    const { study, progress } = get()
    if (!study) return
    const next = Math.min(Math.max(0, index), study.steps.length - 1)
    if (progress?.current_step === next) return

    // Move the UI now; the server is only a bookmark.
    set({ progress: progress ? { ...progress, current_step: next } : progress })
    guidedApi
      .setProgress(study.slug, {
        current_step: next,
        ...(progress?.session_id ? { session_id: progress.session_id } : {}),
      })
      .then((fresh) => set({ progress: fresh }))
      .catch(() => {})
  },

  setAnswer: (stepId, promptIndex, answer) =>
    set((s) => ({ answers: { ...s.answers, [promptKey(stepId, promptIndex)]: answer } })),

  flushAnswer: async (stepId, promptIndex) => {
    const { study, progress, answers } = get()
    if (!study) return
    const answer = answers[promptKey(stepId, promptIndex)] ?? ''
    try {
      await guidedApi.saveResponse(study.slug, stepId, {
        prompt_index: promptIndex,
        answer,
        ...(progress?.session_id ? { session_id: progress.session_id } : {}),
      })
    } catch {
      // Losing a keystroke sync is not worth interrupting a study over; the
      // text stays on screen and the next flush retries.
    }
  },

  reveal: async (stepId, promptIndex) => {
    const { study, progress, answers } = get()
    if (!study) return
    const key = promptKey(stepId, promptIndex)
    set((s) => ({ revealed: { ...s.revealed, [key]: true } }))
    try {
      await guidedApi.saveResponse(study.slug, stepId, {
        prompt_index: promptIndex,
        answer: answers[key] ?? '',
        revealed: true,
        ...(progress?.session_id ? { session_id: progress.session_id } : {}),
      })
    } catch {
      // Keep it revealed locally even if the write failed.
    }
  },

  complete: async () => {
    const { study, progress } = get()
    if (!study) return
    try {
      const fresh = await guidedApi.setProgress(study.slug, {
        current_step: progress?.current_step ?? study.steps.length - 1,
        completed: true,
        ...(progress?.session_id ? { session_id: progress.session_id } : {}),
      })
      set({ progress: fresh })
      // Reflect it in the picker without another round trip.
      set((s) => ({
        plans: s.plans.map((plan) => ({
          ...plan,
          studies: plan.studies.map((entry) =>
            entry.slug === study.slug
              ? { ...entry, progress: { current_step: fresh.current_step, completed_at: fresh.completed_at } }
              : entry,
          ),
        })),
      }))
    } catch (e: any) {
      set({ error: e?.message ?? 'save failed' })
    }
  },
}))

export { promptKey }
