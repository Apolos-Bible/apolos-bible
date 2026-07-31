import { create } from 'zustand'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'
import { useUIStore } from '@/lib/store/useUIStore'

const COMPLETED_KEY = 'tutorial_completed_v1'
const DISMISSED_KEY = 'tutorial_invite_dismissed_v1'

export type TutorialStep = {
  target: string | null
  titleKey: string
  bodyKey: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  mobilePlacement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  desktopOnly?: boolean
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { target: null,                 titleKey: 'tutorial.welcome.title',   bodyKey: 'tutorial.welcome.body',   placement: 'center' },
  { target: '[data-tour="logo"]', titleKey: 'tutorial.logo.title',      bodyKey: 'tutorial.logo.body',      placement: 'right', desktopOnly: true },
  { target: '[data-tour="search"]',     titleKey: 'tutorial.search.title',     bodyKey: 'tutorial.search.body',     placement: 'right', mobilePlacement: 'top' },
  { target: '[data-tour="bible"]',      titleKey: 'tutorial.bible.title',      bodyKey: 'tutorial.bible.body',      placement: 'right', mobilePlacement: 'top' },
  { target: '[data-tour="favorites"]',  titleKey: 'tutorial.favorites.title',  bodyKey: 'tutorial.favorites.body',  placement: 'right', desktopOnly: true },
  { target: '[data-tour="my-notes"]',   titleKey: 'tutorial.notes.title',      bodyKey: 'tutorial.notes.body',      placement: 'right', desktopOnly: true },
  { target: '[data-tour="my-studies"]', titleKey: 'tutorial.studies.title',    bodyKey: 'tutorial.studies.body',    placement: 'right', mobilePlacement: 'top' },
  { target: '[data-tour="new-study"]',  titleKey: 'tutorial.newStudy.title',   bodyKey: 'tutorial.newStudy.body',   placement: 'right', desktopOnly: true },
  { target: '[data-tour="marketplace"]', titleKey: 'tutorial.marketplace.title', bodyKey: 'tutorial.marketplace.body', placement: 'right', desktopOnly: true },
  { target: '[data-tour="chats"]',      titleKey: 'tutorial.chats.title',      bodyKey: 'tutorial.chats.body',      placement: 'right', mobilePlacement: 'top' },
  { target: '[data-tour="profile"]',    titleKey: 'tutorial.profile.title',    bodyKey: 'tutorial.profile.body',    placement: 'right', mobilePlacement: 'top' },
  { target: '[data-tour="reading"]',    titleKey: 'tutorial.reading.title',    bodyKey: 'tutorial.reading.body',    placement: 'left' },
  { target: '[data-tour="toolbar"]',    titleKey: 'tutorial.toolbar.title',    bodyKey: 'tutorial.toolbar.body',    placement: 'bottom' },
  { target: '[data-tour="workspace-tabs"]', titleKey: 'tutorial.tabs.title', bodyKey: 'tutorial.tabs.body', placement: 'bottom', desktopOnly: true },
  { target: null,                       titleKey: 'tutorial.shortcuts.title',  bodyKey: 'tutorial.shortcuts.body',  placement: 'center' },
  { target: null,                       titleKey: 'tutorial.done.title',       bodyKey: 'tutorial.done.body',       placement: 'center' },
]

export function tutorialStepsForViewport(isDesktop: boolean): TutorialStep[] {
  return TUTORIAL_STEPS.filter((tutorialStep) => isDesktop || !tutorialStep.desktopOnly)
}

function currentViewportSteps(): TutorialStep[] {
  return tutorialStepsForViewport(window.matchMedia('(min-width: 768px)').matches)
}

type TutorialStore = {
  inviteOpen: boolean
  active: boolean
  step: number
  steps: TutorialStep[]
  showInvite: () => void
  dismissInvite: () => void
  start: () => void
  next: () => void
  prev: () => void
  skip: () => void
  finish: () => void
  reset: () => void
}

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  inviteOpen: false,
  active: false,
  step: 0,
  steps: currentViewportSteps(),

  showInvite: () => {
    if (localStorage.getItem(COMPLETED_KEY) === 'true') return
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return
    set({ inviteOpen: true })
  },

  dismissInvite: () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    set({ inviteOpen: false })
  },

  start: () => {
    useUIStore.setState({ mobileChromeCollapsed: false })
    set({ inviteOpen: false, active: true, step: 0, steps: currentViewportSteps() })
  },

  next: () => {
    const { step, steps } = get()
    if (step >= steps.length - 1) {
      get().finish()
    } else {
      set({ step: step + 1 })
    }
  },

  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),

  skip: () => {
    localStorage.setItem(COMPLETED_KEY, 'true')
    localStorage.setItem(DISMISSED_KEY, 'true')
    saveUserSettingsSilently({ tutorial_completed: true })
    set({ active: false, inviteOpen: false, step: 0 })
  },

  finish: () => {
    localStorage.setItem(COMPLETED_KEY, 'true')
    localStorage.setItem(DISMISSED_KEY, 'true')
    saveUserSettingsSilently({ tutorial_completed: true })
    set({ active: false, inviteOpen: false, step: 0 })
  },

  reset: () => {
    localStorage.removeItem(COMPLETED_KEY)
    localStorage.removeItem(DISMISSED_KEY)
    saveUserSettingsSilently({ tutorial_completed: false })
    useUIStore.setState({ mobileChromeCollapsed: false })
    set({ active: true, inviteOpen: false, step: 0, steps: currentViewportSteps() })
  },
}))
