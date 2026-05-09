import { create } from 'zustand'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'

const COMPLETED_KEY = 'tutorial_completed_v1'
const DISMISSED_KEY = 'tutorial_invite_dismissed_v1'

export type TutorialStep = {
  target: string | null
  titleKey: string
  bodyKey: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { target: null,                 titleKey: 'tutorial.welcome.title',   bodyKey: 'tutorial.welcome.body',   placement: 'center' },
  { target: '[data-tour="logo"]', titleKey: 'tutorial.logo.title',      bodyKey: 'tutorial.logo.body',      placement: 'right' },
  { target: '[data-tour="search"]',     titleKey: 'tutorial.search.title',     bodyKey: 'tutorial.search.body',     placement: 'right' },
  { target: '[data-tour="library"]',    titleKey: 'tutorial.library.title',    bodyKey: 'tutorial.library.body',    placement: 'right' },
  { target: '[data-tour="favorites"]',  titleKey: 'tutorial.favorites.title',  bodyKey: 'tutorial.favorites.body',  placement: 'right' },
  { target: '[data-tour="my-notes"]',   titleKey: 'tutorial.notes.title',      bodyKey: 'tutorial.notes.body',      placement: 'right' },
  { target: '[data-tour="my-studies"]', titleKey: 'tutorial.studies.title',    bodyKey: 'tutorial.studies.body',    placement: 'right' },
  { target: '[data-tour="new-study"]',  titleKey: 'tutorial.newStudy.title',   bodyKey: 'tutorial.newStudy.body',   placement: 'right' },
  { target: '[data-tour="friends"]',    titleKey: 'tutorial.friends.title',    bodyKey: 'tutorial.friends.body',    placement: 'right' },
  { target: '[data-tour="chat"]',       titleKey: 'tutorial.chat.title',       bodyKey: 'tutorial.chat.body',       placement: 'right' },
  { target: '[data-tour="profile"]',    titleKey: 'tutorial.profile.title',    bodyKey: 'tutorial.profile.body',    placement: 'right' },
  { target: '[data-tour="reading"]',    titleKey: 'tutorial.reading.title',    bodyKey: 'tutorial.reading.body',    placement: 'left' },
  { target: '[data-tour="toolbar"]',    titleKey: 'tutorial.toolbar.title',    bodyKey: 'tutorial.toolbar.body',    placement: 'bottom' },
  { target: null,                       titleKey: 'tutorial.shortcuts.title',  bodyKey: 'tutorial.shortcuts.body',  placement: 'center' },
  { target: null,                       titleKey: 'tutorial.done.title',       bodyKey: 'tutorial.done.body',       placement: 'center' },
]

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
  steps: TUTORIAL_STEPS,

  showInvite: () => {
    if (localStorage.getItem(COMPLETED_KEY) === 'true') return
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return
    set({ inviteOpen: true })
  },

  dismissInvite: () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    set({ inviteOpen: false })
  },

  start: () => set({ inviteOpen: false, active: true, step: 0 }),

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
    set({ active: true, inviteOpen: false, step: 0 })
  },
}))
