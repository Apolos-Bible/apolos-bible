import { create } from 'zustand'
import { guidedEditorApi } from '@/lib/study/guidedEditorApi'
import type { DraftStep, PathVisibility, StudyMetadata, StudyPath } from '@/lib/study/guidedEditorApi'
import { guidedApi } from '@/lib/study/guidedApi'
import type { GuidedStepKind, GuidedStudy } from '@/lib/study/guidedApi'
import { stepKind } from '@/lib/study/guidedStepKinds'

/**
 * A fresh step of the given kind, ready to be typed into. Kinds that hold
 * questions start with one empty box — a step you have to click twice before
 * you can write anything is a step that annoys.
 */
export function blankStep(kind: GuidedStepKind = 'passage'): DraftStep {
  return {
    kind,
    title: null,
    reference: null,
    body: null,
    prompts: stepKind(kind).takesPrompts ? [{ question: '', answer: null }] : [],
  }
}

/** Steps as they come back from the server, stripped down to what we edit. */
function toDrafts(study: GuidedStudy): DraftStep[] {
  return study.steps.map((s) => ({
    kind: s.kind,
    title: s.title,
    reference: s.reference,
    body: s.body,
    prompts: s.prompts.map((p) => ({ question: p.question, answer: p.answer })),
  }))
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

type GuidedEditorStore = {
  /** Every path this person wrote. */
  paths: StudyPath[]
  loading: boolean
  saving: boolean
  error: string | null

  /** The study open in the editor, and the path it belongs to. */
  pathSlug: string | null
  studySlug: string | null
  /** Metadata of the open study, editable beside its steps. */
  study: GuidedStudy | null
  steps: DraftStep[]
  selected: number
  /** Steps differ from what the server last confirmed. */
  dirty: boolean

  loadPaths: () => Promise<void>
  createPath: (title: string, description?: string, coverColor?: string, cover?: File) => Promise<StudyPath | null>
  requestPublication: (slug: string) => Promise<StudyPath | null>
  setVisibility: (slug: string, visibility: PathVisibility) => Promise<void>
  renamePath: (slug: string, title: string, description?: string | null) => Promise<void>
  setCoverColor: (slug: string, color: string) => Promise<boolean>
  uploadCover: (slug: string, cover: File) => Promise<boolean>
  removeCover: (slug: string) => Promise<boolean>
  deletePath: (slug: string) => Promise<void>

  addStudy: (pathSlug: string, meta: StudyMetadata) => Promise<GuidedStudy | null>
  updateStudyMeta: (patch: Partial<StudyMetadata>) => Promise<void>
  deleteStudy: (pathSlug: string, studySlug: string) => Promise<void>

  /** Fetch a study with its steps and open it in the editor. */
  openStudyBySlug: (pathSlug: string, studySlug: string) => Promise<void>
  openStudy: (pathSlug: string, study: GuidedStudy) => void
  closeStudy: () => void

  addStep: (kind?: GuidedStepKind) => void
  removeStep: (index: number) => void
  moveStep: (from: number, to: number) => void
  patchStep: (index: number, patch: Partial<DraftStep>) => void
  select: (index: number) => void

  addPrompt: (stepIndex: number) => void
  removePrompt: (stepIndex: number, promptIndex: number) => void
  patchPrompt: (stepIndex: number, promptIndex: number, patch: { question?: string; answer?: string | null }) => void

  saveSteps: () => Promise<void>
}

export const useGuidedEditorStore = create<GuidedEditorStore>((set, get) => ({
  paths: [],
  loading: false,
  saving: false,
  error: null,

  pathSlug: null,
  studySlug: null,
  study: null,
  steps: [],
  selected: 0,
  dirty: false,

  loadPaths: async () => {
    set({ loading: true })
    try {
      set({ paths: await guidedEditorApi.myPaths(), error: null })
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    } finally {
      set({ loading: false })
    }
  },

  createPath: async (title, description, coverColor, cover) => {
    try {
      const created = await guidedEditorApi.createPath({ title, description, cover_color: coverColor }, cover)
      set((s) => ({ paths: [created, ...s.paths], error: null }))
      return created
    } catch (e: any) {
      set({ error: e?.message ?? 'save failed' })
      return null
    }
  },

  setVisibility: async (slug, visibility) => {
    // Optimistic: the selector should feel like a switch, not a round trip.
    const previous = get().paths
    set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? { ...p, visibility } : p)) }))
    try {
      const updated = await guidedEditorApi.updatePath(slug, { visibility })
      set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? updated : p)), error: null }))
    } catch (e: any) {
      set({ paths: previous, error: e?.message ?? 'save failed' })
    }
  },

  requestPublication: async (slug) => {
    try {
      const updated = await guidedEditorApi.requestPublication(slug)
      set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? updated : p)), error: null }))
      return updated
    } catch (e: any) {
      set({ error: e?.message ?? 'publication request failed' })
      return null
    }
  },

  renamePath: async (slug, title, description) => {
    try {
      const updated = await guidedEditorApi.updatePath(slug, { title, description })
      set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? updated : p)), error: null }))
    } catch (e: any) {
      set({ error: e?.message ?? 'save failed' })
    }
  },

  setCoverColor: async (slug, color) => {
    try {
      const updated = await guidedEditorApi.updatePath(slug, { cover_color: color })
      set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? updated : p)), error: null }))
      return true
    } catch (e: any) {
      set({ error: e?.message ?? 'cover color save failed' })
      return false
    }
  },

  uploadCover: async (slug, cover) => {
    try {
      const updated = await guidedEditorApi.uploadCover(slug, cover)
      set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? updated : p)), error: null }))
      return true
    } catch (e: any) {
      set({ error: e?.message ?? 'cover upload failed' })
      return false
    }
  },

  removeCover: async (slug) => {
    try {
      const updated = await guidedEditorApi.removeCover(slug)
      set((s) => ({ paths: s.paths.map((p) => (p.slug === slug ? updated : p)), error: null }))
      return true
    } catch (e: any) {
      set({ error: e?.message ?? 'cover removal failed' })
      return false
    }
  },

  deletePath: async (slug) => {
    try {
      await guidedEditorApi.deletePath(slug)
      set((s) => ({
        paths: s.paths.filter((p) => p.slug !== slug),
        ...(s.pathSlug === slug
          ? { pathSlug: null, studySlug: null, study: null, steps: [], dirty: false }
          : {}),
      }))
    } catch (e: any) {
      set({ error: e?.message ?? 'delete failed' })
    }
  },

  addStudy: async (pathSlug, meta) => {
    try {
      const study = await guidedEditorApi.createStudy(pathSlug, meta)
      await get().loadPaths()
      return study
    } catch (e: any) {
      set({ error: e?.message ?? 'save failed' })
      return null
    }
  },

  updateStudyMeta: async (patch) => {
    const { pathSlug, studySlug, study } = get()
    if (!pathSlug || !studySlug || !study) return

    // Show it typed straight away; the server only confirms.
    set({ study: { ...study, ...patch } as GuidedStudy })
    try {
      await guidedEditorApi.updateStudy(pathSlug, studySlug, patch)
      await get().loadPaths()
    } catch (e: any) {
      set({ study, error: e?.message ?? 'save failed' })
    }
  },

  deleteStudy: async (pathSlug, studySlug) => {
    try {
      await guidedEditorApi.deleteStudy(pathSlug, studySlug)
      if (get().studySlug === studySlug) get().closeStudy()
      await get().loadPaths()
    } catch (e: any) {
      set({ error: e?.message ?? 'delete failed' })
    }
  },

  openStudyBySlug: async (pathSlug, studySlug) => {
    if (get().studySlug === studySlug) return
    set({ loading: true })
    try {
      const detail = await guidedApi.study(studySlug)
      get().openStudy(pathSlug, detail.study)
    } catch (e: any) {
      set({ error: e?.message ?? 'load failed' })
    } finally {
      set({ loading: false })
    }
  },

  openStudy: (pathSlug, study) =>
    set({
      pathSlug,
      studySlug: study.slug,
      study,
      steps: toDrafts(study),
      selected: 0,
      dirty: false,
      error: null,
    }),

  closeStudy: () =>
    set({ pathSlug: null, studySlug: null, study: null, steps: [], selected: 0, dirty: false }),

  addStep: (kind) =>
    set((s) => ({
      steps: [...s.steps, blankStep(kind)],
      selected: s.steps.length,
      dirty: true,
    })),

  removeStep: (index) =>
    set((s) => {
      const steps = s.steps.filter((_, i) => i !== index)
      return { steps, selected: Math.max(0, Math.min(s.selected, steps.length - 1)), dirty: true }
    }),

  moveStep: (from, to) =>
    set((s) => {
      const steps = move(s.steps, from, to)
      return steps === s.steps ? {} : { steps, selected: to, dirty: true }
    }),

  patchStep: (index, patch) =>
    set((s) => ({
      steps: s.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)),
      dirty: true,
    })),

  select: (index) =>
    set((s) => ({ selected: Math.max(0, Math.min(index, s.steps.length - 1)) })),

  addPrompt: (stepIndex) =>
    set((s) => ({
      steps: s.steps.map((step, i) =>
        i === stepIndex ? { ...step, prompts: [...step.prompts, { question: '', answer: null }] } : step,
      ),
      dirty: true,
    })),

  removePrompt: (stepIndex, promptIndex) =>
    set((s) => ({
      steps: s.steps.map((step, i) =>
        i === stepIndex
          ? { ...step, prompts: step.prompts.filter((_, p) => p !== promptIndex) }
          : step,
      ),
      dirty: true,
    })),

  patchPrompt: (stepIndex, promptIndex, patch) =>
    set((s) => ({
      steps: s.steps.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              prompts: step.prompts.map((p, pi) => (pi === promptIndex ? { ...p, ...patch } : p)),
            }
          : step,
      ),
      dirty: true,
    })),

  saveSteps: async () => {
    const { pathSlug, studySlug, steps, saving } = get()
    if (!pathSlug || !studySlug || saving) return
    set({ saving: true })
    try {
      const study = await guidedEditorApi.replaceSteps(pathSlug, studySlug, steps)
      // Take the server's version back: it resolved the references and dropped
      // the empty prompts, so the editor should show what was actually stored.
      set({ study, steps: toDrafts(study), dirty: false, error: null })
      await get().loadPaths()
    } catch (e: any) {
      set({ error: e?.message ?? 'save failed' })
    } finally {
      set({ saving: false })
    }
  },
}))
