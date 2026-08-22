import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/study/guidedApi', () => ({
  guidedApi: {
    plans: vi.fn(),
    study: vi.fn(),
    setProgress: vi.fn(),
    saveResponse: vi.fn(),
  },
}))

import { guidedApi } from '@/lib/study/guidedApi'
import { useGuidedStore, promptKey } from '../useGuidedStore'
import type { GuidedStudy, GuidedStudyDetail } from '@/lib/study/guidedApi'

const mockApi = guidedApi as unknown as {
  plans: ReturnType<typeof vi.fn>
  study: ReturnType<typeof vi.fn>
  setProgress: ReturnType<typeof vi.fn>
  saveResponse: ReturnType<typeof vi.fn>
}

const study: GuidedStudy = {
  slug: 'zero-to-hero-01-buscando-a-dios',
  title: 'Buscando a Dios',
  theme: 'Dios quiere ser encontrado.',
  heart_goal: null,
  memory_verse_ref: 'Jeremías 29:13',
  memory_verse_text: 'Me buscaréis y me hallaréis.',
  leader_notes: null,
  position: 0,
  step_count: 2,
  plan: { slug: 'zero-to-hero', title: 'From Zero to Hero' },
  steps: [
    { id: 10, position: 0, kind: 'intro', title: null, reference: null, ranges: [], body: null,
      prompts: [{ question: '¿Cómo está tu relación con Dios?', answer: null }] },
    { id: 11, position: 1, kind: 'passage', title: 'Jeremías 29:11-14', reference: 'Jeremías 29:11-14',
      ranges: [{ book: 'Jeremías', slug: 'jeremias', book_number: 24, chapter: 29, start: 11, end: 14 }],
      body: 'Leer el pasaje en voz alta.',
      prompts: [{ question: '¿Qué planes tiene Dios?', answer: 'Planes de bienestar.' }] },
  ],
}

const detail: GuidedStudyDetail = {
  study,
  progress: {
    guided_study_id: 1,
    session_id: null,
    current_step: 0,
    started_at: '2026-07-27T00:00:00Z',
    completed_at: null,
  },
  responses: [{ step_id: 11, prompt_index: 0, answer: 'Que quiere mi bien.', revealed: true }],
}

describe('useGuidedStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGuidedStore.setState({
      plans: [], plansLoading: false, study: null, progress: null,
      answers: {}, revealed: {}, loading: false, error: null,
    })
    mockApi.setProgress.mockResolvedValue(detail.progress)
  })

  it('loads a study and restores the answers already written', async () => {
    mockApi.study.mockResolvedValue(detail)

    await useGuidedStore.getState().open(study.slug)

    const state = useGuidedStore.getState()
    expect(state.study?.slug).toBe(study.slug)
    expect(state.answers[promptKey(11, 0)]).toBe('Que quiere mi bien.')
    expect(state.revealed[promptKey(11, 0)]).toBe(true)
    expect(state.revealed[promptKey(10, 0)]).toBeUndefined()
  })

  it('loads the progress that belongs to the requested session', async () => {
    mockApi.study.mockResolvedValue({
      ...detail,
      progress: { ...detail.progress, session_id: 'session-1' },
    })

    await useGuidedStore.getState().open(study.slug, 'session-1')

    expect(mockApi.study).toHaveBeenCalledWith(study.slug, 'session-1')
    expect(useGuidedStore.getState().progress?.session_id).toBe('session-1')
    expect(mockApi.setProgress).not.toHaveBeenCalled()
  })

  it('does not reload a study that is already open', async () => {
    mockApi.study.mockResolvedValue(detail)

    await useGuidedStore.getState().open(study.slug)
    await useGuidedStore.getState().open(study.slug)

    expect(mockApi.study).toHaveBeenCalledTimes(1)
  })

  it('reloads the same guided content when the session changes', async () => {
    mockApi.study
      .mockResolvedValueOnce({ ...detail, progress: { ...detail.progress, session_id: 'session-1', current_step: 1 } })
      .mockResolvedValueOnce({ ...detail, progress: { ...detail.progress, session_id: 'session-2', current_step: 0 }, responses: [] })

    await useGuidedStore.getState().open(study.slug, 'session-1')
    await useGuidedStore.getState().open(study.slug, 'session-2')

    expect(mockApi.study).toHaveBeenNthCalledWith(1, study.slug, 'session-1')
    expect(mockApi.study).toHaveBeenNthCalledWith(2, study.slug, 'session-2')
    expect(useGuidedStore.getState().progress?.current_step).toBe(0)
    expect(useGuidedStore.getState().answers).toEqual({})
  })

  it('ignores a slower response from the session that was just left', async () => {
    let resolveFirst!: (value: GuidedStudyDetail) => void
    let resolveSecond!: (value: GuidedStudyDetail) => void
    mockApi.study
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))

    const first = useGuidedStore.getState().open(study.slug, 'session-1')
    const second = useGuidedStore.getState().open(study.slug, 'session-2')

    resolveSecond({ ...detail, progress: { ...detail.progress, session_id: 'session-2', current_step: 0 }, responses: [] })
    await second
    resolveFirst({ ...detail, progress: { ...detail.progress, session_id: 'session-1', current_step: 1 } })
    await first

    expect(useGuidedStore.getState().progress?.session_id).toBe('session-2')
    expect(useGuidedStore.getState().progress?.current_step).toBe(0)
  })

  it('sends the session id when bookmarking progress', async () => {
    mockApi.study.mockResolvedValue({
      ...detail,
      progress: { ...detail.progress, session_id: 'session-1' },
    })
    await useGuidedStore.getState().open(study.slug, 'session-1')
    mockApi.setProgress.mockResolvedValue({ ...detail.progress, session_id: 'session-1', current_step: 1 })

    useGuidedStore.getState().goToStep(1)

    expect(mockApi.setProgress).toHaveBeenCalledWith(study.slug, {
      current_step: 1,
      session_id: 'session-1',
    })
  })

  it('moves the step locally and bookmarks it on the server', async () => {
    mockApi.study.mockResolvedValue(detail)
    await useGuidedStore.getState().open(study.slug)
    mockApi.setProgress.mockResolvedValue({ ...detail.progress, current_step: 1 })

    useGuidedStore.getState().goToStep(1)

    expect(useGuidedStore.getState().progress?.current_step).toBe(1)
    expect(mockApi.setProgress).toHaveBeenLastCalledWith(study.slug, { current_step: 1 })
  })

  it('clamps the step to the steps that exist', async () => {
    mockApi.study.mockResolvedValue(detail)
    await useGuidedStore.getState().open(study.slug)

    useGuidedStore.getState().goToStep(99)
    expect(useGuidedStore.getState().progress?.current_step).toBe(1)

    useGuidedStore.getState().goToStep(-5)
    expect(useGuidedStore.getState().progress?.current_step).toBe(0)
  })

  it('sends the person own words along when they ask to see the answer', async () => {
    mockApi.study.mockResolvedValue(detail)
    mockApi.saveResponse.mockResolvedValue({ step_id: 10, prompt_index: 0, answer: 'Lejana', revealed: true })
    await useGuidedStore.getState().open(study.slug)

    useGuidedStore.getState().setAnswer(10, 0, 'Lejana')
    await useGuidedStore.getState().reveal(10, 0)

    expect(useGuidedStore.getState().revealed[promptKey(10, 0)]).toBe(true)
    expect(mockApi.saveResponse).toHaveBeenCalledWith(study.slug, 10, {
      prompt_index: 0,
      answer: 'Lejana',
      revealed: true,
    })
  })

  it('keeps the answer on screen when saving fails', async () => {
    mockApi.study.mockResolvedValue(detail)
    mockApi.saveResponse.mockRejectedValue(new Error('offline'))
    await useGuidedStore.getState().open(study.slug)

    useGuidedStore.getState().setAnswer(10, 0, 'Algo honesto')
    await useGuidedStore.getState().flushAnswer(10, 0)

    expect(useGuidedStore.getState().answers[promptKey(10, 0)]).toBe('Algo honesto')
  })

  it('marks the study finished and reflects it in the plan list', async () => {
    mockApi.study.mockResolvedValue(detail)
    mockApi.plans.mockResolvedValue([
      {
        slug: 'zero-to-hero',
        title: 'From Zero to Hero',
        description: null,
        studies: [{ slug: study.slug, title: study.title, theme: null, position: 0, step_count: 2, progress: null }],
      },
    ])
    await useGuidedStore.getState().loadPlans()
    await useGuidedStore.getState().open(study.slug)

    mockApi.setProgress.mockResolvedValue({
      ...detail.progress,
      current_step: 1,
      completed_at: '2026-07-27T10:00:00Z',
    })
    await useGuidedStore.getState().complete()

    expect(useGuidedStore.getState().progress?.completed_at).toBe('2026-07-27T10:00:00Z')
    expect(useGuidedStore.getState().plans[0].studies[0].progress?.completed_at).toBe('2026-07-27T10:00:00Z')
  })

  it('clears everything when leaving the study', async () => {
    mockApi.study.mockResolvedValue(detail)
    await useGuidedStore.getState().open(study.slug)

    useGuidedStore.getState().clear()

    const state = useGuidedStore.getState()
    expect(state.study).toBeNull()
    expect(state.progress).toBeNull()
    expect(state.answers).toEqual({})
  })
})
