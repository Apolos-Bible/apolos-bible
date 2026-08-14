import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ impersonating: false }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/lib/store/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: unknown }) => unknown) => selector({
    user: mocks.impersonating ? { impersonation: { active: true } } : null,
  }),
}))

import { RouteErrorPage } from './NotFound'

describe('RouteErrorPage', () => {
  let container: HTMLDivElement
  let root: Root
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    mocks.impersonating = false
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    consoleError.mockRestore()
  })

  async function renderRouteError() {
    const router = createMemoryRouter([{
      path: '/',
      loader: () => { throw new Error('sensitive insertBefore diagnostic') },
      element: <div />,
      errorElement: <RouteErrorPage />,
    }])

    await act(async () => {
      root.render(<RouterProvider router={router} />)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('shows generic recovery UI without leaking diagnostics to users', async () => {
    await renderRouteError()

    expect(container.textContent).toContain('route.errorTitle')
    expect(container.textContent).toContain('route.reload')
    expect(container.textContent).not.toContain('sensitive insertBefore diagnostic')
  })

  it('shows the technical diagnostic while impersonating', async () => {
    mocks.impersonating = true
    await renderRouteError()

    expect(container.textContent).toContain('sensitive insertBefore diagnostic')
  })
})
