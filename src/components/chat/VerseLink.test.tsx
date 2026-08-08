import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const setVersion = vi.fn(async () => undefined)
const verseState = {
  versions: [
    { id: 7, abbreviation: 'RVR1960' },
    { id: 8, abbreviation: 'NVI' },
  ],
  setVersion,
}

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/lib/store/useVerseStore', () => ({
  useVerseStore: (selector: (state: typeof verseState) => unknown) => selector(verseState),
}))
vi.mock('@/lib/store/useUIStore', () => ({
  useUIStore: (selector: (state: { locale: 'es' }) => unknown) => selector({ locale: 'es' }),
}))

import { VerseLink } from './VerseLink'

describe('VerseLink', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    navigate.mockReset()
    setVersion.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('selects the requested version and navigates to the canonical reader route', async () => {
    await act(async () => root.render(
      <VerseLink seg={{
        kind: 'ref',
        raw: 'Juan 2:1 NVI',
        slug: 'juan',
        chapter: 2,
        verse: 1,
        versionAbbr: 'nvi',
      }} />,
    ))

    await act(async () => container.querySelector<HTMLElement>('[role="link"]')!.click())

    expect(setVersion).toHaveBeenCalledWith(8)
    expect(navigate).toHaveBeenCalledWith('/es/bible/juan/2/1')
    expect(setVersion.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0])
  })
})
