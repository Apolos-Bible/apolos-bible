import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  models: vi.fn(),
  usage: vi.fn(),
  fetchSettings: vi.fn(),
  saveSettings: vi.fn(),
  addToast: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/lib/aiApi', () => ({
  aiApi: { models: mocks.models, usage: mocks.usage },
}))
vi.mock('@/lib/userSettingsApi', () => ({
  fetchUserSettings: mocks.fetchSettings,
  saveUserSettings: mocks.saveSettings,
}))
vi.mock('@/lib/store/useUIStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) => selector({ addToast: mocks.addToast }),
}))

import { AiSettings } from './AiSettings'

describe('AiSettings model preference', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    vi.clearAllMocks()
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    mocks.models.mockResolvedValue({
      models: [{ slug: 'deepseek/v4-flash', name: 'DeepSeek V4 Flash', provider: 'deepseek', model: 'v4' }],
    })
    mocks.usage.mockResolvedValue({ percent_used: 20, tokens_used: 200, tokens_limit: 1000, request_count: 2 })
    mocks.fetchSettings.mockResolvedValue({ preferred_ai_model: null })
    mocks.saveSettings.mockResolvedValue({ preferred_ai_model: 'deepseek/v4-flash' })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function renderLoaded() {
    await act(async () => {
      root.render(<AiSettings />)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('[AI-MODEL-01][SETTINGS-AI-01] lists public models and persists a selection', async () => {
    await renderLoaded()
    const combo = container.querySelector<HTMLButtonElement>('[role="combobox"]')!
    act(() => combo.click())
    const option = [...container.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find((item) => item.textContent?.includes('DeepSeek V4 Flash'))!
    await act(async () => option.click())

    expect(mocks.saveSettings).toHaveBeenCalledWith({ preferred_ai_model: 'deepseek/v4-flash' })
    expect(localStorage.getItem('preferredAiModel')).toBe('deepseek/v4-flash')
    expect(combo.textContent).toContain('DeepSeek V4 Flash')
  })

  it('[SETTINGS-AI-01] restores the prior selection after a save failure', async () => {
    mocks.fetchSettings.mockResolvedValue({ preferred_ai_model: 'deepseek/v4-flash' })
    mocks.saveSettings.mockRejectedValue(new Error('offline'))
    await renderLoaded()
    const combo = container.querySelector<HTMLButtonElement>('[role="combobox"]')!
    act(() => combo.click())
    const automatic = [...container.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find((item) => item.textContent?.includes('settings.ai.automatic'))!
    await act(async () => automatic.click())

    expect(combo.textContent).toContain('DeepSeek V4 Flash')
    expect(mocks.addToast).toHaveBeenCalledWith('common.error', 'error')
  })
})
