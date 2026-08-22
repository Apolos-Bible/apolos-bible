import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarketplaceStore } from '@/lib/store/useMarketplaceStore'
import { useStudyStore } from '@/lib/store/useStudyStore'
import { guidedApi } from '@/lib/study/guidedApi'
import type { GuidedStudyDetail } from '@/lib/study/guidedApi'
import type { StudyPathDetail } from '@/lib/study/marketplaceApi'
import type { StudySession } from '@/lib/study/studyApi'
import { MarketplaceStudyModal } from './MarketplaceStudyModal'

const { mockT } = vi.hoisted(() => ({
  mockT: (key: string) => ({
    'market.continueStudy': 'Continuar con el estudio',
    'market.startNewStudy': 'Empezar uno nuevo',
    'market.startThisStudy': 'Iniciar este estudio',
    'market.studyAlreadyStarted': 'Ya tienes este estudio en curso.',
    'market.inMyList': 'En mi lista',
    'market.addPathToList': 'Añadir',
  })[key] ?? key,
}))

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: mockT }),
}))

const study = {
  slug: 'crecer-01', title: 'Crecer', theme: null, position: 0, step_count: 1, progress: null,
}

const plan: StudyPathDetail = {
  slug: 'crecer-en-cristo',
  title: 'Crecer en Cristo',
  description: null,
  cover_image_url: null,
  cover_color: '#123456',
  visibility: 'public',
  is_mine: false,
  author: null,
  study_count: 1,
  rating_avg: 0,
  rating_count: 0,
  list_count: 0,
  my_rating: null,
  in_my_list: false,
  created_at: null,
  studies: [study],
}

const detail: GuidedStudyDetail = {
  study: {
    slug: study.slug,
    title: study.title,
    theme: null,
    heart_goal: null,
    memory_verse_ref: null,
    memory_verse_text: null,
    leader_notes: null,
    position: 0,
    step_count: 1,
    plan: { slug: plan.slug, title: plan.title },
    steps: [],
  },
  progress: {
    guided_study_id: 1,
    session_id: null,
    current_step: 0,
    started_at: null,
    completed_at: null,
  },
  responses: [],
}

function activeSession(status: 'active' | 'ended' = 'active'): StudySession {
  return {
    id: 'session-existing',
    type: 'free',
    anchor_ref: null,
    guided_study: { slug: study.slug, title: study.title, step_count: 1 },
    title: study.title,
    host_user_id: 1,
    conversation_id: null,
    status,
    thumbnail_url: null,
    last_activity_at: '2026-08-22T10:00:00Z',
    ended_at: status === 'ended' ? '2026-08-22T10:00:00Z' : null,
    created_at: '2026-08-22T09:00:00Z',
    updated_at: '2026-08-22T10:00:00Z',
    participants: [],
    pending_invitation_count: 0,
    host: null,
  }
}

describe('MarketplaceStudyModal', () => {
  let container: HTMLDivElement
  let root: Root
  let pathname = ''

  function LocationProbe() {
    pathname = useLocation().pathname
    return null
  }

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    pathname = ''
    vi.spyOn(guidedApi, 'study').mockResolvedValue(detail)
    useMarketplaceStore.setState({ detail: plan, toggleList: vi.fn().mockResolvedValue(undefined) })
    useStudyStore.setState({
      activeSession: null,
      wsToken: null,
      myStudies: [],
      pendingInvitations: [],
      loadMyStudies: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    act(() => root.unmount())
    container.remove()
  })

  async function renderModal() {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/marketplace/crecer-en-cristo']}>
          <MarketplaceStudyModal open onClose={vi.fn()} plan={plan} study={study} />
          <LocationProbe />
        </MemoryRouter>,
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('offers continue and a separate new study when an active session exists', async () => {
    useStudyStore.setState({ myStudies: [activeSession()] })

    await renderModal()

    const buttons = [...document.body.querySelectorAll('button')]
    expect(buttons.some((button) => button.textContent?.includes('Continuar con el estudio'))).toBe(true)
    expect(buttons.some((button) => button.textContent?.includes('Empezar uno nuevo'))).toBe(true)

    const continueButton = buttons.find((button) => button.textContent?.includes('Continuar con el estudio'))
    act(() => continueButton!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(pathname).toBe('/study/session-existing')
  })

  it('only offers a fresh start when there is no active session', async () => {
    useStudyStore.setState({ myStudies: [activeSession('ended')] })

    await renderModal()

    const text = document.body.textContent ?? ''
    expect(text).toContain('Iniciar este estudio')
    expect(text).not.toContain('Continuar con el estudio')
    expect(text).not.toContain('Empezar uno nuevo')
  })
})
