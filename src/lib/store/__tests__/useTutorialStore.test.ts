import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/userSettingsApi', () => ({
  saveUserSettingsSilently: vi.fn(),
}))

import {
  TUTORIAL_STEPS,
  tutorialStepsForViewport,
  useTutorialStore,
} from '../useTutorialStore'
import { useUIStore } from '../useUIStore'
import { saveUserSettingsSilently } from '@/lib/userSettingsApi'
import en from '../../../locales/en.json'
import es from '../../../locales/es.json'

describe('useTutorialStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    useUIStore.setState({ mobileChromeCollapsed: false })
    useTutorialStore.setState({
      inviteOpen: false,
      active: false,
      step: 0,
      steps: tutorialStepsForViewport(true),
    })
  })

  it('keeps the complete desktop tour and removes desktop-only steps on mobile', () => {
    const desktop = tutorialStepsForViewport(true)
    const mobile = tutorialStepsForViewport(false)

    expect(desktop).toEqual(TUTORIAL_STEPS)
    expect(desktop).toHaveLength(16)
    expect(mobile).toHaveLength(10)
    expect(mobile.every((step) => !step.desktopOnly)).toBe(true)
    expect(mobile.some((step) => step.target === '[data-tour="bible"]')).toBe(true)
    expect(mobile.some((step) => step.target === '[data-tour="marketplace"]')).toBe(false)
  })

  it('has a title and body translation for every step in both languages', () => {
    const english = en as Record<string, string>
    const spanish = es as Record<string, string>

    for (const tutorialStep of TUTORIAL_STEPS) {
      expect(english[tutorialStep.titleKey]).toBeTruthy()
      expect(english[tutorialStep.bodyKey]).toBeTruthy()
      expect(spanish[tutorialStep.titleKey]).toBeTruthy()
      expect(spanish[tutorialStep.bodyKey]).toBeTruthy()
    }
  })

  it('opens collapsed mobile chrome when the tour starts', () => {
    useUIStore.setState({ mobileChromeCollapsed: true })

    useTutorialStore.getState().start()

    expect(useUIStore.getState().mobileChromeCollapsed).toBe(false)
    expect(useTutorialStore.getState().active).toBe(true)
    expect(useTutorialStore.getState().step).toBe(0)
  })

  it('completes and syncs the preference after the final step', () => {
    const steps = tutorialStepsForViewport(false)
    useTutorialStore.setState({ active: true, step: steps.length - 1, steps })

    useTutorialStore.getState().next()

    expect(localStorage.getItem('tutorial_completed_v1')).toBe('true')
    expect(localStorage.getItem('tutorial_invite_dismissed_v1')).toBe('true')
    expect(saveUserSettingsSilently).toHaveBeenCalledWith({ tutorial_completed: true })
    expect(useTutorialStore.getState().active).toBe(false)
  })

  it('reset clears completion and syncs the replay state', () => {
    localStorage.setItem('tutorial_completed_v1', 'true')
    localStorage.setItem('tutorial_invite_dismissed_v1', 'true')

    useTutorialStore.getState().reset()

    expect(localStorage.getItem('tutorial_completed_v1')).toBeNull()
    expect(localStorage.getItem('tutorial_invite_dismissed_v1')).toBeNull()
    expect(saveUserSettingsSilently).toHaveBeenCalledWith({ tutorial_completed: false })
    expect(useTutorialStore.getState().active).toBe(true)
  })
})
