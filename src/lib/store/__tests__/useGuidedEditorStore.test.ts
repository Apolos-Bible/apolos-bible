import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/study/guidedEditorApi', () => ({
  guidedEditorApi: {
    myPaths: vi.fn(() => Promise.resolve([])),
    createPath: vi.fn(),
    updatePath: vi.fn(),
    deletePath: vi.fn(),
    createStudy: vi.fn(),
    updateStudy: vi.fn(),
    deleteStudy: vi.fn(),
    replaceSteps: vi.fn(),
    resolveReference: vi.fn(),
  },
}))

import { guidedEditorApi } from '@/lib/study/guidedEditorApi'
import { blankStep, useGuidedEditorStore } from '../useGuidedEditorStore'

const mockApi = guidedEditorApi as unknown as Record<string, ReturnType<typeof vi.fn>>

/** A saved study as the server would hand it back. */
const serverStudy = (titles: string[]) => ({
  slug: 'mi-ruta-uno',
  title: 'Uno',
  theme: null,
  heart_goal: null,
  memory_verse_ref: null,
  memory_verse_text: null,
  leader_notes: null,
  position: 0,
  step_count: titles.length,
  plan: null,
  steps: titles.map((title, i) => ({
    id: i + 1,
    position: i,
    kind: 'intro' as const,
    title,
    reference: null,
    ranges: [],
    body: null,
    prompts: [],
  })),
})

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.myPaths.mockResolvedValue([])
  useGuidedEditorStore.setState({
    paths: [],
    loading: false,
    saving: false,
    error: null,
    pathSlug: 'mi-ruta',
    studySlug: 'mi-ruta-uno',
    steps: [],
    selected: 0,
    dirty: false,
  })
})

describe('blankStep', () => {
  it('starts a passage step with one empty prompt to type into', () => {
    expect(blankStep('passage').prompts).toHaveLength(1)
  })

  it('gives a memory verse step no prompts', () => {
    expect(blankStep('memory').prompts).toEqual([])
  })

  it('gives a prayer no prompts either — it is something to pray, not answer', () => {
    expect(blankStep('prayer').prompts).toEqual([])
  })

  it('seeds a prompt for the kinds that hold questions', () => {
    for (const kind of ['intro', 'context', 'teaching', 'discussion', 'application', 'practice', 'review'] as const) {
      expect(blankStep(kind).prompts).toHaveLength(1)
    }
  })
})

describe('the step kind catalogue', () => {
  it('has a label and an explanation for every kind, in both locales', async () => {
    const { STEP_KINDS } = await import('@/lib/study/guidedStepKinds')
    const es = (await import('@/locales/es.json')).default as Record<string, string>
    const en = (await import('@/locales/en.json')).default as Record<string, string>

    for (const { kind } of STEP_KINDS) {
      for (const [name, dict] of [['es', es], ['en', en]] as const) {
        expect(dict[`guided.kind.${kind}`], `${name}: guided.kind.${kind}`).toBeTruthy()
        expect(dict[`path.kindHint.${kind}`], `${name}: path.kindHint.${kind}`).toBeTruthy()
      }
    }
  })

  it('falls back to something renderable for a kind it has never heard of', async () => {
    const { stepKind } = await import('@/lib/study/guidedStepKinds')
    // Content written by a newer client than this one must not crash the panel.
    const spec = stepKind('sermon' as never)
    expect(spec.bodyStyle).toBe('prose')
    expect(spec.Icon).toBeTruthy()
  })
})

describe('editing steps', () => {
  it('adds a step, selects it, and marks the draft dirty', () => {
    useGuidedEditorStore.getState().addStep('passage')

    const state = useGuidedEditorStore.getState()
    expect(state.steps).toHaveLength(1)
    expect(state.selected).toBe(0)
    expect(state.dirty).toBe(true)
  })

  it('reorders steps and follows the moved one with the selection', () => {
    const store = useGuidedEditorStore.getState()
    store.addStep('intro')
    store.addStep('passage')
    store.addStep('memory')
    useGuidedEditorStore.setState({ dirty: false })

    useGuidedEditorStore.getState().moveStep(0, 2)

    const state = useGuidedEditorStore.getState()
    expect(state.steps.map((s) => s.kind)).toEqual(['passage', 'memory', 'intro'])
    expect(state.selected).toBe(2)
    expect(state.dirty).toBe(true)
  })

  it('ignores a move that would fall off either end', () => {
    useGuidedEditorStore.getState().addStep('intro')
    useGuidedEditorStore.setState({ dirty: false, selected: 0 })

    useGuidedEditorStore.getState().moveStep(0, -1)
    useGuidedEditorStore.getState().moveStep(0, 5)

    expect(useGuidedEditorStore.getState().dirty).toBe(false)
  })

  it('keeps the selection inside the list when a step is removed', () => {
    const store = useGuidedEditorStore.getState()
    store.addStep('intro')
    store.addStep('passage')
    useGuidedEditorStore.setState({ selected: 1 })

    useGuidedEditorStore.getState().removeStep(1)

    const state = useGuidedEditorStore.getState()
    expect(state.steps).toHaveLength(1)
    expect(state.selected).toBe(0)
  })

  it('adds, patches and removes prompts on the right step only', () => {
    const store = useGuidedEditorStore.getState()
    store.addStep('passage')
    store.addStep('passage')

    useGuidedEditorStore.getState().patchPrompt(1, 0, { question: '¿Qué dice?' })
    useGuidedEditorStore.getState().addPrompt(1)
    useGuidedEditorStore.getState().patchPrompt(1, 1, { answer: 'Eso dice.' })

    const steps = useGuidedEditorStore.getState().steps
    expect(steps[0].prompts[0].question).toBe('')
    expect(steps[1].prompts[0].question).toBe('¿Qué dice?')
    expect(steps[1].prompts[1].answer).toBe('Eso dice.')

    useGuidedEditorStore.getState().removePrompt(1, 0)
    expect(useGuidedEditorStore.getState().steps[1].prompts).toHaveLength(1)
  })
})

describe('saving', () => {
  it('takes the server version back and clears dirty', async () => {
    mockApi.replaceSteps.mockResolvedValue(serverStudy(['Primero']))
    useGuidedEditorStore.getState().addStep('intro')

    await useGuidedEditorStore.getState().saveSteps()

    const state = useGuidedEditorStore.getState()
    expect(mockApi.replaceSteps).toHaveBeenCalledWith('mi-ruta', 'mi-ruta-uno', expect.any(Array))
    expect(state.steps[0].title).toBe('Primero')
    expect(state.dirty).toBe(false)
    expect(state.error).toBeNull()
  })

  it('keeps the draft and surfaces the error when the save fails', async () => {
    mockApi.replaceSteps.mockRejectedValue(new Error('nope'))
    useGuidedEditorStore.getState().addStep('intro')

    await useGuidedEditorStore.getState().saveSteps()

    const state = useGuidedEditorStore.getState()
    expect(state.dirty).toBe(true)
    expect(state.steps).toHaveLength(1)
    expect(state.error).toBe('nope')
    expect(state.saving).toBe(false)
  })

  it('does nothing with no study open', async () => {
    useGuidedEditorStore.setState({ pathSlug: null, studySlug: null })

    await useGuidedEditorStore.getState().saveSteps()

    expect(mockApi.replaceSteps).not.toHaveBeenCalled()
  })
})

describe('visibility', () => {
  it('flips visibility straight away and rolls back if the write fails', async () => {
    useGuidedEditorStore.setState({
      paths: [{
        slug: 'mi-ruta',
        title: 'Mi ruta',
        description: null,
        source: 'user',
        visibility: 'private',
        is_mine: true,
        author: { id: 1, name: 'Yo' },
        rating_avg: 0,
        rating_count: 0,
        list_count: 0,
        studies: [],
      }],
    })
    mockApi.updatePath.mockRejectedValue(new Error('sin conexión'))

    const pending = useGuidedEditorStore.getState().setVisibility('mi-ruta', 'public')
    // Optimistic: the switch has already moved.
    expect(useGuidedEditorStore.getState().paths[0].visibility).toBe('public')

    await pending
    expect(useGuidedEditorStore.getState().paths[0].visibility).toBe('private')
    expect(useGuidedEditorStore.getState().error).toBe('sin conexión')
  })
})
