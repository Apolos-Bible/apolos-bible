import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  user: { id: 7, email_verified_at: '2026-01-01' } as { id: number; email_verified_at: string | null } | null,
  ask: vi.fn(),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/lib/store/useAuthStore', () => ({ useAuthStore: (select: any) => select({ user: state.user }) }))
vi.mock('@/lib/store/useUIStore', () => ({ useUIStore: (select: any) => select({ locale: 'es', assistantOpen: true, setAssistantOpen: vi.fn(), openAuthModal: vi.fn() }) }))
vi.mock('@/lib/keyboard', () => ({ useCommand: vi.fn(), formatBinding: () => 'Ctrl+Shift+J' }))
vi.mock('@/components/ui/Dialog', () => ({ Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div> }))
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/ayuda' }), Link: ({ children }: { children: ReactNode }) => <span>{children}</span> }))
vi.mock('@/lib/appHelp', async importOriginal => ({ ...await importOriginal<object>(), askAppHelp: state.ask }))

import { AppAssistant } from './AppAssistant'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  state.user = { id: 7, email_verified_at: '2026-01-01' }
  state.ask.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<AppAssistant />))
})
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers() })

async function sendSuggestedQuestion() {
  act(() => Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'assistant.suggestion.paths')!.click())
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}

it('[AI-HELP-02] discards history when switching accounts', async () => {
  state.ask.mockResolvedValue({ role: 'assistant', content: 'Private help history', links: [] })
  await sendSuggestedQuestion()
  expect(container.textContent).toContain('Private help history')
  state.user = { id: 8, email_verified_at: '2026-01-01' }
  act(() => root.render(<AppAssistant />))
  expect(container.textContent).not.toContain('Private help history')
})

it('[AI-HELP-02] aborts in-flight work on logout and ignores late responses', async () => {
  let resolve!: (value: unknown) => void
  state.ask.mockImplementation(() => new Promise(done => { resolve = done }))
  await sendSuggestedQuestion()
  const signal = state.ask.mock.calls[0][4] as AbortSignal
  state.user = null
  act(() => root.render(<AppAssistant />))
  expect(signal.aborted).toBe(true)
  await act(async () => resolve({ role: 'assistant', content: 'Previous account', links: [] }))
  expect(container.textContent).not.toContain('Previous account')
  expect(container.querySelector('textarea')).toBeNull()
})

it('[AI-HELP-03] times out and retains the question for an explicit retry', async () => {
  vi.useFakeTimers()
  state.ask.mockImplementation((_q, _h, _s, _l, signal: AbortSignal) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
  }))
  await sendSuggestedQuestion()
  await act(async () => { await vi.advanceTimersByTimeAsync(45000) })
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('assistant.error')
  expect(container.querySelector('textarea')?.value).toBe('assistant.suggestion.paths')
  expect(container.querySelector('textarea')?.disabled).toBe(false)
})
